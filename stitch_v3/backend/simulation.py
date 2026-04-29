import time
import random
import datetime


def simulation_loop(master_bins, collected_bins, lock):
    """Simulates real-time waste accumulation and computes time-to-fill per bin."""
    while True:
        with lock:
            for b in master_bins:
                if b['bin_id'] not in collected_bins:
                    growth = random.uniform(0.1, 0.5)
                    old_fill = b.get('fill_level', 0)
                    new_fill = min(100.0, round(old_fill + growth, 1))
                    b['fill_level'] = new_fill

                    capacity_kg = b.get('capacity_kg', 100)
                    b['weight'] = round(new_fill / 100.0 * capacity_kg, 1)

                    history = b.get('history', [])
                    history.append(new_fill)
                    b['history'] = history[-10:]

                    # Compute TTF: each cycle = 60 s = 1/60 hr
                    h = b['history']
                    if len(h) >= 2:
                        rate_per_cycle = (h[-1] - h[0]) / max(len(h) - 1, 1)
                        if rate_per_cycle > 0:
                            b['time_to_fill_hours'] = round(
                                (100.0 - new_fill) / rate_per_cycle / 60, 1
                            )
                        else:
                            b['time_to_fill_hours'] = 99
                    else:
                        b['time_to_fill_hours'] = 99

                    b['timestamp'] = datetime.datetime.now().isoformat()

        time.sleep(60)
