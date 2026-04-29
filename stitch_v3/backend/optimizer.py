import time
import requests
import polyline
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from bin_logic import process_bin_data
from utils import haversine
from logger import log


def _get_with_retry(url, timeout=10, retries=3, backoff=1.5):
    """GET with exponential-backoff retries."""
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = backoff ** attempt
            log.warning(f"OSRM request failed (attempt {attempt+1}/{retries}): {e}. Retrying in {wait:.1f}s…")
            if attempt < retries - 1:
                time.sleep(wait)
    log.error(f"OSRM request permanently failed after {retries} attempts: {url}")
    return None


def optimize_route_internal(bins, global_settings, collected_bins, congestion_zones):
    """OSRM + Google OR-Tools VRP route optimizer."""
    try:
        log.info("Starting route optimization…")
        t_start = time.time()

        to_route = []
        for b in bins:
            b = process_bin_data(b, global_settings)
            eta = b.get('time_to_fill_hours', 99)
            if b.get('status') == 'CRITICAL' or (eta < 4 and b.get('status') == 'MEDIUM'):
                b['is_predictive'] = True
                to_route.append(b)
            elif b.get('status') == 'MEDIUM':
                to_route.append(b)

        valid_nodes = [b for b in to_route if b.get('latitude') and b.get('longitude')]

        if not valid_nodes:
            log.warning("No valid bins to route — returning empty result.")
            return {"routes": [], "total_distance_km": 0, "total_bins_assigned": 0}

        log.info(f"Routing {len(valid_nodes)} bins across {global_settings.get('num_trucks', 3)} trucks.")

        hq_lat, hq_lon = 11.0168, 76.9558
        hq = {"bin_id": "HQ", "latitude": hq_lat, "longitude": hq_lon,
              "bin_type": "depot", "fill_level": 0, "status": "HQ"}
        nodes = [hq] + valid_nodes
        coords_str = ";".join([f"{n['longitude']},{n['latitude']}" for n in nodes])

        # Distance matrix via OSRM with Haversine fallback
        table_url = (
            f"http://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=distance"
        )
        res_table = _get_with_retry(table_url)

        if res_table and res_table.get('code') == 'Ok' and 'distances' in res_table:
            matrix = [[int(d) for d in row] for row in res_table['distances']]
            log.info("Distance matrix fetched from OSRM successfully.")
        else:
            log.warning("OSRM table failed — falling back to Haversine matrix.")
            matrix = [
                [haversine(n1['latitude'], n1['longitude'], n2['latitude'], n2['longitude'])
                 for n2 in nodes]
                for n1 in nodes
            ]

        # Apply traffic/congestion penalties
        import math as _math
        for i in range(len(nodes)):
            for j in range(len(nodes)):
                if i == j:
                    continue
                mid_lat = (nodes[i]['latitude'] + nodes[j]['latitude']) / 2
                mid_lon = (nodes[i]['longitude'] + nodes[j]['longitude']) / 2
                for zone in congestion_zones:
                    dist = _math.sqrt(
                        (mid_lat - zone['lat']) ** 2 + (mid_lon - zone['lon']) ** 2
                    )
                    if dist < zone['radius']:
                        matrix[i][j] = int(matrix[i][j] * zone['factor'])

        # OR-Tools VRP
        num_vehicles    = global_settings.get('num_trucks', 3)
        vehicle_capacity = global_settings.get('truck_capacity', 500)

        manager = pywrapcp.RoutingIndexManager(len(matrix), num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            return matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

        transit_cb = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

        routing.AddDimension(transit_cb, 0, 200000, True, 'Distance')
        routing.GetDimensionOrDie('Distance').SetGlobalSpanCostCoefficient(100)

        def demand_callback(from_index):
            node = manager.IndexToNode(from_index)
            return 0 if node == 0 else int(nodes[node].get('weight', 0))

        demand_cb = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_cb, 0, [vehicle_capacity] * num_vehicles, True, 'Capacity'
        )

        for node_index in range(1, len(nodes)):
            penalty = 1000000 if nodes[node_index].get('status') == 'CRITICAL' else 5000
            routing.AddDisjunction([manager.NodeToIndex(node_index)], penalty)

        params = pywrapcp.DefaultRoutingSearchParameters()
        params.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        params.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        params.time_limit.seconds = 2

        solution = routing.SolveWithParameters(params)

        if not solution:
            log.error("OR-Tools found no solution.")
            return {"routes": [], "total_distance_km": 0, "total_bins_assigned": 0}

        routes_output = []
        overall_distance_m = 0

        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_nodes = []
            while not routing.IsEnd(index):
                route_nodes.append(nodes[manager.IndexToNode(index)])
                index = solution.Value(routing.NextVar(index))
            route_nodes.append(nodes[manager.IndexToNode(index)])  # return to depot

            if len(route_nodes) > 2:
                v_coords = ";".join(
                    [f"{n['longitude']},{n['latitude']}" for n in route_nodes]
                )
                trip_url = (
                    f"http://router.project-osrm.org/route/v1/driving/{v_coords}"
                    "?overview=full&steps=true"
                )
                trip_res = _get_with_retry(trip_url)

                path_geom = []
                legs      = []
                dist_km   = 0

                if trip_res and trip_res.get('code') == 'Ok':
                    route_data = trip_res['routes'][0]
                    geom_enc   = route_data.get('geometry', '')
                    path_geom  = polyline.decode(geom_enc) if geom_enc else []
                    dist_km    = route_data.get('distance', 0) / 1000.0
                    overall_distance_m += route_data.get('distance', 0)
                    legs       = route_data.get('legs', [])
                    log.info(
                        f"Truck {vehicle_id+1}: {len(route_nodes)-2} stops, "
                        f"{dist_km:.1f} km, {len(path_geom)} geometry points."
                    )
                else:
                    log.warning(f"Truck {vehicle_id+1}: OSRM route failed — straight-line fallback.")
                    path_geom = [[n['latitude'], n['longitude']] for n in route_nodes]
                    dist_km = sum(
                        haversine(
                            route_nodes[i]['latitude'], route_nodes[i]['longitude'],
                            route_nodes[i + 1]['latitude'], route_nodes[i + 1]['longitude'],
                        )
                        for i in range(len(route_nodes) - 1)
                    ) / 1000.0
                    overall_distance_m += dist_km * 1000

                num_bins = len(route_nodes) - 2
                routes_output.append({
                    "vehicle_id":      vehicle_id + 1,
                    "bins":            route_nodes,
                    "path_geometry":   path_geom,
                    "legs":            legs,
                    "distance_km":     round(dist_km, 2),
                    "estimated_hours": round((dist_km / 30) + (num_bins * 10 / 60), 1),
                    "bin_count":       num_bins,
                })

        elapsed = round(time.time() - t_start, 2)
        log.info(
            f"Optimization complete in {elapsed}s — "
            f"{len(routes_output)} routes, {round(overall_distance_m/1000, 2)} km total."
        )

        total_hours = round(
            (overall_distance_m / 1000.0 / 30)
            + (sum(r["bin_count"] for r in routes_output) * 10 / 60),
            1,
        )

        return {
            "routes":               routes_output,
            "total_distance_km":    round(overall_distance_m / 1000.0, 2),
            "total_bins_assigned":  sum(r["bin_count"] for r in routes_output),
            "avg_route_time_hrs":   round(total_hours / len(routes_output), 1) if routes_output else 0,
            "last_optimized_timestamp": time.time(),
        }

    except Exception as e:
        log.exception(f"Optimization error: {e}")
        return {
            "routes": [], "total_distance_km": 0, "total_bins_assigned": 0,
            "avg_route_time_hrs": 0, "last_optimized_timestamp": None,
        }
