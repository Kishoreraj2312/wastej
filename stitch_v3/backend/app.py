import copy
import json
import math as _math
import os
import secrets
import threading
import time
import uuid
from datetime import datetime as _dt

from flask import Flask, jsonify, request
from flask_cors import CORS

from simulation import simulation_loop
from optimizer import optimize_route_internal
from bin_logic import process_bin_data
from ai_models import predict_time_to_fill, evaluate_priority
from utils import haversine as _haversine
from logger import log

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['TEMPLATES_AUTO_RELOAD'] = True

CORS(app, resources={r"/api/*": {
    "origins": os.environ.get('CORS_ORIGIN', '*'),
    "allow_headers": ["Content-Type", "Authorization"],
}})


@app.after_request
def add_no_cache(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r


# ── Shared state + lock ───────────────────────────────────────────────────────
_lock = threading.RLock()

collected_bins = set()
global_settings = {
    "threshold_yellow": 50,
    "threshold_red":    80,
    "num_trucks":       3,
    "truck_capacity":   500,
    "dangerous_gas":    175,
    "sensor_interval":  4,
    "retrain_cycles":   10,
}

CONGESTION_ZONES = [
    {"lat": 11.018, "lon": 76.960, "radius": 0.005, "factor": 2.5,
     "label": "Central Market (High Congestion)"},
    {"lat": 10.995, "lon": 76.945, "radius": 0.004, "factor": 1.8,
     "label": "South Industrial Junction (Moderate Traffic)"},
]

latest_routes      = None
last_optimized_time = None
master_bins        = []

# Async optimization job tracking — capped at MAX_JOBS to prevent memory leak
_optimize_jobs: dict = {}
MAX_JOBS = 50
OPTIMIZE_COOLDOWN = 10  # seconds per IP
_optimize_rate_limit: dict = {}

# ── Auth ──────────────────────────────────────────────────────────────────────
STITCH_USERNAME = os.environ.get('STITCH_USERNAME', 'admin')
STITCH_PASSWORD = os.environ.get('STITCH_PASSWORD', 'stitch2024')
_auth_tokens: dict = {}  # token -> username


def _check_auth():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return _auth_tokens.get(auth[7:])
    return None


@app.before_request
def require_auth():
    if not request.path.startswith('/api/'):
        return
    if request.method == 'OPTIONS':
        return
    if request.path in ('/api/health', '/api/login'):
        return
    if not _check_auth():
        return jsonify({'error': 'Unauthorized'}), 401


@app.route('/api/login', methods=['POST'])
def api_login():
    data     = request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')
    if username == STITCH_USERNAME and password == STITCH_PASSWORD:
        token = secrets.token_urlsafe(32)
        _auth_tokens[token] = username
        log.info(f"Login: {username}")
        return jsonify({'token': token, 'username': username})
    log.warning(f"Failed login attempt for username: '{username}'")
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['POST'])
def api_logout():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        _auth_tokens.pop(auth[7:], None)
    return jsonify({'success': True})


# ── Persistence helpers ────────────────────────────────────────────────────────
def load_settings():
    global global_settings
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, 'data', 'settings.json')
    if os.path.exists(path):
        with open(path, 'r') as f:
            global_settings.update(json.load(f))


def save_settings():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, 'data', 'settings.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(global_settings, f, indent=2)


def init_master_bins():
    global master_bins
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, 'data', 'bins.json')
    with _lock:
        if os.path.exists(path):
            with open(path, 'r') as f:
                master_bins = json.load(f)
        else:
            master_bins = []


# ── Boot ──────────────────────────────────────────────────────────────────────
load_settings()
init_master_bins()
log.info(f"Loaded {len(master_bins)} bins. Settings: {global_settings}")

threading.Thread(
    target=simulation_loop,
    args=(master_bins, collected_bins, _lock),
    daemon=True,
).start()
log.info("Background simulation thread started.")


def load_bins():
    with _lock:
        return [b for b in master_bins if b['bin_id'] not in collected_bins]


# ── API — bins ────────────────────────────────────────────────────────────────
@app.route('/api/bins')
def api_bins():
    with _lock:
        raw_bins = [b for b in master_bins if b['bin_id'] not in collected_bins]

    processed = []
    for b in raw_bins:
        b = process_bin_data(b, global_settings)
        assigned_route = None
        with _lock:
            routes_snapshot = latest_routes
        if routes_snapshot:
            for route in routes_snapshot.get("routes", []):
                if any(rb.get("bin_id") == b["bin_id"] for rb in route.get("bins", [])):
                    assigned_route = route.get("vehicle_id")
                    break
        if assigned_route:
            b['included_in_route'] = f"Yes (Truck {assigned_route})"
        else:
            b['included_in_route'] = ("No - Outside Capacity"
                                      if b['status'] == 'CRITICAL'
                                      else "No - Not Critical")
        processed.append(b)

    return jsonify(processed)


@app.route('/api/bin/<bin_id>')
def api_bin_detail(bin_id):
    with _lock:
        raw = next((b for b in master_bins
                    if b['bin_id'] == bin_id and b['bin_id'] not in collected_bins), None)
    if not raw:
        return jsonify({"error": "Bin not found"}), 404
    b = process_bin_data(raw, global_settings)
    b['time_to_fill_hours'] = predict_time_to_fill(b)
    return jsonify(b)


@app.route('/api/stats')
def api_stats():
    with _lock:
        raw_bins = [b for b in master_bins if b['bin_id'] not in collected_bins]
    bins = [process_bin_data(b, global_settings) for b in raw_bins]

    critical = sum(1 for b in bins if b.get('status') == 'CRITICAL')
    warning  = sum(1 for b in bins if b.get('status') == 'MEDIUM')
    faults   = sum(1 for b in bins if not b.get('sensor_ok', True))
    total    = len(bins)
    avg_fill = round(sum(b.get('fill_level', 0) for b in bins) / total, 1) if total else 0
    total_weight = sum(b.get('weight', 0) for b in bins)

    return jsonify({
        "critical":     critical,
        "warning":      warning,
        "faults":       faults,
        "avg_fill":     avg_fill,
        "total_weight": round(total_weight, 1),
        "total_bins":   total,
    })


@app.route('/api/health')
def api_health():
    with _lock:
        nb = len(master_bins)
        nr = latest_routes is not None
        nt = len(truck_states)
    return jsonify({
        'status':           'ok',
        'timestamp':        time.time(),
        'bins_loaded':      nb,
        'routes_optimized': nr,
        'active_trucks':    nt,
    })


@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if request.method == 'POST':
        data = request.json
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid payload — expected JSON object'}), 400
        VALID_KEYS = {
            'threshold_yellow': (0, 100), 'threshold_red':   (0, 100),
            'num_trucks':       (1,  20),  'truck_capacity':  (50, 5000),
            'dangerous_gas':    (0, 1000), 'sensor_interval': (1, 60),
            'retrain_cycles':   (1, 100),
        }
        errors = []
        for key, val in data.items():
            if key not in VALID_KEYS:
                errors.append(f"Unknown key: {key}"); continue
            lo, hi = VALID_KEYS[key]
            try:
                v = int(val)
                if not (lo <= v <= hi):
                    errors.append(f"{key} must be between {lo} and {hi}")
            except (ValueError, TypeError):
                errors.append(f"{key} must be a number")
        if errors:
            log.warning(f"Settings validation failed: {errors}")
            return jsonify({'error': 'Validation failed', 'details': errors}), 422
        with _lock:
            for key in VALID_KEYS:
                if key in data:
                    global_settings[key] = int(data[key])
        save_settings()
        log.info(f"Settings updated: {global_settings}")
        return jsonify({"success": True})
    with _lock:
        return jsonify(dict(global_settings))


@app.route('/api/collect/<bin_id>', methods=['POST'])
def collect_bin(bin_id):
    with _lock:
        for b in master_bins:
            if b['bin_id'] == bin_id:
                b['fill_level']     = 0.0
                b['weight']         = 0.0
                b['last_collected'] = time.strftime('%Y-%m-%d %H:%M:%S')
                break
        collected_bins.discard(bin_id)
    return jsonify({"success": True, "message": f"Bin {bin_id} emptied and reset."})


@app.route('/api/routes/latest', methods=['GET'])
def get_latest_routes():
    with _lock:
        snapshot = copy.deepcopy(latest_routes)
        cb       = set(collected_bins)

    if snapshot is None:
        return jsonify({
            "routes": [], "total_distance_km": 0,
            "total_bins_assigned": 0, "avg_route_time_hrs": 0,
            "last_optimized_timestamp": None,
        })

    for route in snapshot.get("routes", []):
        route["bins"]      = [b for b in route["bins"]
                               if b["bin_id"] == "HQ" or b["bin_id"] not in cb]
        route["bin_count"] = len([b for b in route["bins"] if b["bin_id"] != "HQ"])
    snapshot["total_bins_assigned"] = sum(r["bin_count"] for r in snapshot["routes"])
    return jsonify(snapshot)


# ── Async route optimization ───────────────────────────────────────────────────
@app.route('/api/route/optimize')
def optimize_route():
    ip  = request.remote_addr
    now = time.time()
    with _lock:
        last = _optimize_rate_limit.get(ip, 0)
    if now - last < OPTIMIZE_COOLDOWN:
        return jsonify({'error': 'Rate limited — wait 10 seconds between requests'}), 429
    with _lock:
        _optimize_rate_limit[ip] = now

    job_id = str(uuid.uuid4())[:8]

    # Evict oldest jobs when cap is reached
    with _lock:
        if len(_optimize_jobs) >= MAX_JOBS:
            oldest = list(_optimize_jobs.keys())[: len(_optimize_jobs) - MAX_JOBS + 1]
            for k in oldest:
                del _optimize_jobs[k]
        _optimize_jobs[job_id] = {'status': 'running', 'result': None}

    log.info(f"Optimization job {job_id} queued.")

    def _run():
        global latest_routes
        try:
            with _lock:
                bins_snapshot     = list(master_bins)
                settings_snapshot = dict(global_settings)
                cb_snapshot       = set(collected_bins)
            result = optimize_route_internal(
                bins_snapshot, settings_snapshot, cb_snapshot, CONGESTION_ZONES
            )
            with _lock:
                latest_routes = result
                _optimize_jobs[job_id]['result'] = result
                _optimize_jobs[job_id]['status'] = 'done'
            _build_truck_states(result)
            log.info(f"Optimization job {job_id} complete.")
        except Exception as e:
            log.exception(f"Optimization job {job_id} failed: {e}")
            with _lock:
                _optimize_jobs[job_id]['status'] = 'error'
                _optimize_jobs[job_id]['error']  = str(e)

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({'job_id': job_id, 'status': 'running'})


@app.route('/api/route/optimize/status/<job_id>')
def optimize_status(job_id):
    with _lock:
        job = _optimize_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    resp = {'job_id': job_id, 'status': job['status']}
    if job['status'] == 'done':
        resp['result'] = job['result']
    elif job['status'] == 'error':
        resp['error'] = job.get('error', 'Unknown error')
    return jsonify(resp)


@app.route('/api/reset', methods=['POST'])
def reset_collection():
    with _lock:
        collected_bins.clear()
    init_master_bins()
    return jsonify({"success": True, "message": "Collection queue reset and sensor nodes recalibrated."})


@app.route('/api/analytics')
def api_analytics():
    from collections import defaultdict
    with _lock:
        raw_bins = [b for b in master_bins if b['bin_id'] not in collected_bins]
    bins = [process_bin_data(b, global_settings) for b in raw_bins]

    total = len(bins)
    if total == 0:
        return jsonify({})

    critical_bins = [b for b in bins if b['status'] == 'CRITICAL']
    medium_bins   = [b for b in bins if b['status'] == 'MEDIUM']
    normal_bins   = [b for b in bins if b['status'] == 'NORMAL']
    fault_bins    = [b for b in bins if not b.get('sensor_ok', True)]

    avg_fill     = round(sum(b['fill_level'] for b in bins) / total, 1)
    total_weight = round(sum(b.get('weight', 0) for b in bins), 1)
    efficiency   = round(100 * (1 - len(critical_bins) / total), 1)

    type_stats = defaultdict(
        lambda: {'total': 0, 'normal': 0, 'medium': 0, 'critical': 0, 'fill_sum': 0}
    )
    for b in bins:
        t = b.get('bin_type', 'unknown')
        type_stats[t]['total'] += 1
        type_stats[t]['fill_sum'] += b['fill_level']
        if b['status'] == 'CRITICAL':   type_stats[t]['critical'] += 1
        elif b['status'] == 'MEDIUM':   type_stats[t]['medium']   += 1
        else:                           type_stats[t]['normal']   += 1

    type_breakdown = []
    for t, s in type_stats.items():
        tot = s['total']
        type_breakdown.append({
            'type':         t.capitalize(), 'total': tot,
            'normal_pct':   round(100 * s['normal']   / tot),
            'medium_pct':   round(100 * s['medium']   / tot),
            'critical_pct': round(100 * s['critical'] / tot),
            'avg_fill':     round(s['fill_sum'] / tot, 1),
        })

    histogram = [0] * 10
    for b in bins:
        histogram[min(int(b['fill_level'] // 10), 9)] += 1

    # Compute TTF once per bin to avoid O(n*k) repeated calls
    ttf_map = {b['bin_id']: predict_time_to_fill(b) for b in bins}

    alerts = []
    for b in sorted(bins, key=lambda x: x['fill_level'], reverse=True)[:8]:
        ttf = ttf_map[b['bin_id']]
        if b['status'] == 'CRITICAL':
            alerts.append({
                'id': b['bin_id'], 'type': b.get('bin_type', '').capitalize(),
                'fill': b['fill_level'], 'level': 'critical',
                'msg': f"Critical ({b['fill_level']}%) — immediate routing required",
            })
        elif ttf < 2 and b['status'] == 'MEDIUM':
            alerts.append({
                'id': b['bin_id'], 'type': b.get('bin_type', '').capitalize(),
                'fill': b['fill_level'], 'level': 'warning',
                'msg': f"Overflow in {ttf:.1f} hrs — high priority",
            })

    pred_lt1  = sum(1 for b in bins if ttf_map[b['bin_id']] < 1)
    pred_1_2  = sum(1 for b in bins if 1 <= ttf_map[b['bin_id']] < 2)
    pred_2_4  = sum(1 for b in bins if 2 <= ttf_map[b['bin_id']] < 4)
    pred_gt4  = sum(1 for b in bins if ttf_map[b['bin_id']] >= 4)
    avg_ttf   = round(sum(ttf_map.values()) / total, 1)

    risk_type = max(type_stats, key=lambda t: type_stats[t]['critical'], default='N/A')

    top_critical = sorted(critical_bins + medium_bins, key=lambda b: b['fill_level'], reverse=True)[:10]
    top_critical_out = [{
        'id':       b['bin_id'],
        'type':     b.get('bin_type', 'unknown').capitalize(),
        'fill':     b['fill_level'],
        'status':   b['status'],
        'ttf':      ttf_map[b['bin_id']],
        'weight':   b.get('weight', 0),
        'sensor_ok': b.get('sensor_ok', True),
    } for b in top_critical]

    return jsonify({
        'efficiency':     efficiency,
        'total_weight':   total_weight,
        'avg_fill':       avg_fill,
        'total_bins':     total,
        'critical_count': len(critical_bins),
        'medium_count':   len(medium_bins),
        'normal_count':   len(normal_bins),
        'fault_count':    len(fault_bins),
        'avg_ttf':        avg_ttf,
        'risk_type':      risk_type.capitalize(),
        'pred_lt1':       pred_lt1,
        'pred_1_2':       pred_1_2,
        'pred_2_4':       pred_2_4,
        'pred_gt4':       pred_gt4,
        'histogram':      histogram,
        'type_breakdown': type_breakdown,
        'top_critical':   top_critical_out,
        'alerts':         alerts,
    })


@app.route('/api/analytics/export')
def export_analytics():
    import csv, io
    from flask import make_response

    bins = load_bins()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Bin ID', 'Type', 'Fill Level %', 'Weight (kg)', 'Status', 'Priority', 'Last Updated'])
    for b in bins:
        priority, _ = evaluate_priority(b, global_settings)
        writer.writerow([
            b.get('bin_id'), b.get('bin_type'), b.get('fill_level'),
            b.get('weight'), b.get('status'), priority, b.get('timestamp'),
        ])
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=waste_analytics_report.csv"
    response.headers["Content-type"] = "text/csv"
    return response


@app.route('/api/report/pdf')
def export_pdf_report():
    from fpdf import FPDF
    from collections import defaultdict
    from flask import make_response
    from datetime import datetime

    with _lock:
        raw_bins = [b for b in master_bins if b['bin_id'] not in collected_bins]
        cb_count = len(collected_bins)
        ts_snapshot = dict(truck_states)

    bins  = [process_bin_data(b, global_settings) for b in raw_bins]
    total = len(bins)
    now   = datetime.now()

    critical = [b for b in bins if b['status'] == 'CRITICAL']
    medium   = [b for b in bins if b['status'] == 'MEDIUM']
    normal   = [b for b in bins if b['status'] == 'NORMAL']

    avg_fill     = round(sum(b['fill_level'] for b in bins) / total, 1) if total else 0
    total_weight = round(sum(b.get('weight', 0) for b in bins), 1)
    efficiency   = round(100 * (1 - len(critical) / total), 1) if total else 100

    type_stats = defaultdict(
        lambda: {'total': 0, 'critical': 0, 'medium': 0, 'normal': 0,
                 'fill_sum': 0, 'weight_sum': 0}
    )
    for b in bins:
        t = b.get('bin_type', 'unknown')
        type_stats[t]['total']      += 1
        type_stats[t]['fill_sum']   += b['fill_level']
        type_stats[t]['weight_sum'] += b.get('weight', 0)
        if b['status'] == 'CRITICAL': type_stats[t]['critical'] += 1
        elif b['status'] == 'MEDIUM': type_stats[t]['medium']   += 1
        else:                         type_stats[t]['normal']   += 1

    DARK     = (15, 23, 42)
    SLATE_700 = (51, 65, 85)
    GREEN    = (0, 109, 55)
    RED      = (186, 26, 26)
    AMBER    = (195, 123, 0)
    GRAY     = (100, 105, 112)
    LIGHT_BG = (248, 250, 252)
    WHITE    = (255, 255, 255)
    DIVIDER  = (226, 232, 240)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_fill_color(*DARK)
    pdf.rect(0, 0, 210, 45, 'F')
    pdf.set_text_color(*WHITE)
    pdf.set_font('Helvetica', 'B', 24)
    pdf.set_xy(15, 12); pdf.cell(0, 10, 'SMART WASTE INTELLIGENCE', align='L')
    pdf.set_font('Helvetica', '', 10)
    pdf.set_xy(15, 24); pdf.set_text_color(203, 213, 225)
    pdf.cell(0, 6, 'TACTICAL OPERATIONS & LOGISTICS REPORT', align='L')
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_xy(15, 32); pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 6, f'GENERATED: {now.strftime("%d %b %Y | %H:%M:%S")}  |  STITCH AI COMMAND CENTER', align='L')

    pdf.set_y(55)
    pdf.set_text_color(*DARK); pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'EXECUTIVE SUMMARY', ln=True)
    pdf.set_draw_color(*GREEN); pdf.set_line_width(1)
    pdf.line(15, pdf.get_y(), 85, pdf.get_y()); pdf.ln(6)

    card_y = pdf.get_y(); card_w = 43; card_h = 30
    cards = [
        ('Fleet Efficiency', f'{efficiency}%',    GREEN if efficiency > 80 else RED),
        ('Active Bins',      str(total),           DARK),
        ('Avg Fill Level',   f'{avg_fill}%',       AMBER if avg_fill > 60 else GREEN),
        ('Total Weight',     f'{total_weight} kg', DARK),
    ]
    for i, (label, value, color) in enumerate(cards):
        x = 15 + i * (card_w + 3)
        pdf.set_fill_color(*LIGHT_BG); pdf.rect(x, card_y, card_w, card_h, 'F')
        pdf.set_fill_color(*color);    pdf.rect(x, card_y, 2, card_h, 'F')
        pdf.set_xy(x + 5, card_y + 4); pdf.set_font('Helvetica', 'B', 7)
        pdf.set_text_color(*GRAY);     pdf.cell(card_w - 6, 4, label.upper())
        pdf.set_xy(x + 5, card_y + 12); pdf.set_font('Helvetica', 'B', 18)
        pdf.set_text_color(*color);    pdf.cell(card_w - 6, 12, value)

    pdf.set_y(card_y + card_h + 10)
    pdf.set_text_color(*DARK); pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'OPERATIONAL STATUS DISTRIBUTION', ln=True)
    pdf.set_draw_color(*GREEN); pdf.line(15, pdf.get_y(), 105, pdf.get_y()); pdf.ln(6)

    statuses = [
        ('CRITICAL (Immediate Action Required)',  len(critical), RED),
        ('MEDIUM (Proactive Collection Queue)',   len(medium),   AMBER),
        ('NORMAL (Baseline Monitoring)',          len(normal),   GREEN),
        ('COLLECTED TODAY (Session Total)',       cb_count,      DARK),
    ]
    bar_y = pdf.get_y()
    for label, count, color in statuses:
        pct = round(count / max(total, 1) * 100, 1) if 'COLLECTED' not in label else 0
        pdf.set_xy(15, bar_y); pdf.set_text_color(*SLATE_700); pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(70, 6, label)
        pdf.set_font('Helvetica', 'B', 10); pdf.set_text_color(*color)
        pdf.cell(20, 6, str(count), align='R')
        if 'COLLECTED' not in label:
            pdf.set_fill_color(*LIGHT_BG); pdf.rect(110, bar_y + 1, 80, 4, 'F')
            pdf.set_fill_color(*color);    pdf.rect(110, bar_y + 1, max(pct * 0.8, 1), 4, 'F')
            pdf.set_xy(192, bar_y); pdf.set_text_color(*GRAY); pdf.set_font('Helvetica', '', 8)
            pdf.cell(10, 6, f'{pct}%', align='R')
        bar_y += 8

    pdf.set_y(bar_y + 10)
    pdf.set_text_color(*DARK); pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'PERFORMANCE BY LOGISTICS CATEGORY', ln=True)
    pdf.set_draw_color(*GREEN); pdf.line(15, pdf.get_y(), 105, pdf.get_y()); pdf.ln(6)

    pdf.set_fill_color(*DARK); pdf.set_text_color(*WHITE); pdf.set_font('Helvetica', 'B', 8)
    cols = [('CATEGORY', 35), ('UNITS', 20), ('AVG FILL', 25), ('WEIGHT (KG)', 30),
            ('NORM', 23), ('WARN', 23), ('CRIT', 24)]
    for label, w in cols:
        pdf.cell(w, 8, label, border=0, align='C', fill=True)
    pdf.ln()

    for i, (t, s) in enumerate(
        sorted(type_stats.items(), key=lambda x: x[1]['fill_sum'] / max(x[1]['total'], 1), reverse=True)
    ):
        bg = LIGHT_BG if i % 2 == 0 else WHITE
        pdf.set_fill_color(*bg); pdf.set_text_color(*DARK); pdf.set_font('Helvetica', '', 9)
        avg_f = round(s['fill_sum']   / max(s['total'], 1), 1)
        avg_w = round(s['weight_sum'] / max(s['total'], 1), 1)
        pdf.cell(35, 7, t.upper(), border=0, align='L', fill=True)
        pdf.cell(20, 7, str(s['total']), border=0, align='C', fill=True)
        f_color = RED if avg_f > 80 else AMBER if avg_f > 50 else GREEN
        pdf.set_text_color(*f_color); pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(25, 7, f'{avg_f}%', border=0, align='C', fill=True)
        pdf.set_text_color(*DARK); pdf.set_font('Helvetica', '', 9)
        pdf.cell(30, 7, f'{avg_w}', border=0, align='C', fill=True)
        pdf.set_text_color(*GREEN); pdf.cell(23, 7, str(s['normal']),   border=0, align='C', fill=True)
        pdf.set_text_color(*AMBER); pdf.cell(23, 7, str(s['medium']),   border=0, align='C', fill=True)
        pdf.set_text_color(*RED);   pdf.cell(24, 7, str(s['critical']), border=0, align='C', fill=True)
        pdf.ln()

    if ts_snapshot:
        pdf.ln(10)
        pdf.set_text_color(*DARK); pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 8, 'ACTIVE FLEET LOGISTICS', ln=True)
        pdf.set_draw_color(*GREEN); pdf.line(15, pdf.get_y(), 105, pdf.get_y()); pdf.ln(6)
        pdf.set_fill_color(*DARK); pdf.set_text_color(*WHITE); pdf.set_font('Helvetica', 'B', 8)
        for label, w in [('TRUCK ID', 30), ('TOTAL STOPS', 30), ('COMPLETED', 30),
                          ('PENDING', 30), ('PROGRESS', 30), ('STATUS', 30)]:
            pdf.cell(w, 8, label, border=0, align='C', fill=True)
        pdf.ln()
        for i, (vid, s) in enumerate(ts_snapshot.items()):
            bg      = LIGHT_BG if i % 2 == 0 else WHITE
            total_s = len([b for b in s.route_bins if b.get('bin_id') != 'HQ'])
            comp_s  = s.stop_index
            pend_s  = total_s - comp_s
            prog_s  = round((comp_s / max(total_s, 1)) * 100, 1)
            done    = comp_s >= total_s and total_s > 0
            pdf.set_fill_color(*bg); pdf.set_text_color(*DARK); pdf.set_font('Helvetica', '', 9)
            pdf.cell(30, 7, f'TRUCK {vid}', border=0, align='C', fill=True)
            pdf.cell(30, 7, str(total_s),   border=0, align='C', fill=True)
            pdf.cell(30, 7, str(comp_s),    border=0, align='C', fill=True)
            pdf.cell(30, 7, str(pend_s),    border=0, align='C', fill=True)
            pdf.cell(30, 7, f'{prog_s}%',   border=0, align='C', fill=True)
            pdf.set_text_color(*(GREEN if done else AMBER)); pdf.set_font('Helvetica', 'B', 8)
            pdf.cell(30, 7, 'COMPLETED' if done else 'IN TRANSIT', border=0, align='C', fill=True)
            pdf.ln()

    pdf.set_y(-20)
    pdf.set_draw_color(*DIVIDER); pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.set_font('Helvetica', 'I', 8); pdf.set_text_color(*GRAY)
    pdf.cell(0, 10, f'STITCH SMART WASTE INTELLIGENCE  |  PAGE {pdf.page_no()}  |  SECURE OPERATIONAL DOCUMENT', align='C')

    pdf_bytes = pdf.output()
    response = make_response(bytes(pdf_bytes))
    response.headers["Content-Disposition"] = "attachment; filename=SmartWaste_Tactical_Report.pdf"
    response.headers["Content-type"] = "application/pdf"
    return response


# ── Truck navigation ───────────────────────────────────────────────────────────
import random as _random

truck_states: dict = {}


class TruckState:
    def __init__(self, vehicle_id, route_bins, path_geometry, legs=None):
        self.vehicle_id    = vehicle_id
        self.route_bins    = route_bins
        self.path_geometry = path_geometry or []
        self.legs          = legs or []
        self.stop_index    = 0
        self.visited       = set()
        self.current_lat   = None
        self.current_lng   = None
        self.path_cursor   = 0
        self.started_at    = _dt.now().isoformat()
        self.speed_mps     = 8.0  # ~30 km/h

        if self.path_geometry:
            self.current_lat = self.path_geometry[0][0]
            self.current_lng = self.path_geometry[0][1]
        elif self.route_bins:
            hq = next((b for b in self.route_bins if b.get('bin_id') == 'HQ'), None)
            if hq:
                self.current_lat = hq.get('latitude', 11.0168)
                self.current_lng = hq.get('longitude', 76.9558)


def _haversine_m(lat1, lon1, lat2, lon2):
    return _haversine(lat1, lon1, lat2, lon2)


def _bearing(lat1, lon1, lat2, lon2):
    dlon  = _math.radians(lon2 - lon1)
    lat1r = _math.radians(lat1)
    lat2r = _math.radians(lat2)
    x = _math.sin(dlon) * _math.cos(lat2r)
    y = _math.cos(lat1r) * _math.sin(lat2r) - _math.sin(lat1r) * _math.cos(lat2r) * _math.cos(dlon)
    return (_math.degrees(_math.atan2(x, y)) + 360) % 360


def _advance_truck(state, elapsed_seconds):
    if not state.path_geometry or state.path_cursor >= len(state.path_geometry) - 1:
        return
    stops = [b for b in state.route_bins if b.get('bin_id') != 'HQ']
    if state.stop_index < len(stops):
        ns = stops[state.stop_index]
        if (state.current_lat and
                _haversine_m(state.current_lat, state.current_lng,
                              ns['latitude'], ns['longitude']) < 25):
            return
    distance_to_travel = elapsed_seconds * state.speed_mps
    while distance_to_travel > 0 and state.path_cursor < len(state.path_geometry) - 1:
        cur   = state.path_geometry[state.path_cursor]
        nxt   = state.path_geometry[state.path_cursor + 1]
        seg_d = _haversine_m(cur[0], cur[1], nxt[0], nxt[1])
        if seg_d <= 0:
            state.path_cursor += 1; continue
        if distance_to_travel >= seg_d:
            distance_to_travel -= seg_d
            state.path_cursor  += 1
            state.current_lat   = nxt[0]
            state.current_lng   = nxt[1]
        else:
            frac = distance_to_travel / seg_d
            state.current_lat = cur[0] + frac * (nxt[0] - cur[0])
            state.current_lng = cur[1] + frac * (nxt[1] - cur[1])
            distance_to_travel = 0


def _build_truck_states(routes_data):
    global truck_states
    with _lock:
        truck_states.clear()
        if not routes_data or 'routes' not in routes_data:
            return
        for route in routes_data['routes']:
            vid  = str(route.get('vehicle_id', '?'))
            truck_states[vid] = TruckState(
                vid,
                route.get('bins', []),
                route.get('path_geometry', []),
                route.get('legs', []),
            )


_last_tick: dict = {}


def _gps_tick():
    """Advance truck positions every second — no random jitter."""
    log.info("GPS simulation tick thread started.")
    while True:
        try:
            now = time.time()
            with _lock:
                for vid, state in list(truck_states.items()):
                    elapsed = now - _last_tick.get(vid, now)
                    _last_tick[vid] = now
                    _advance_truck(state, elapsed)
        except Exception as e:
            log.exception(f"GPS tick error (recovered): {e}")
        time.sleep(1)


threading.Thread(target=_gps_tick, daemon=True).start()


@app.route('/api/trucks')
def api_trucks():
    with _lock:
        snapshot = list(truck_states.items())
    out = []
    for vid, s in snapshot:
        stops     = [b for b in s.route_bins if b.get('bin_id') != 'HQ']
        next_stop = stops[s.stop_index] if s.stop_index < len(stops) else None
        bearing   = 0
        if len(s.path_geometry) > 1 and s.current_lat:
            p0      = s.path_geometry[max(0, s.path_cursor - 1)]
            bearing = _bearing(p0[0], p0[1], s.current_lat, s.current_lng)
        out.append({
            'vehicle_id':  vid,
            'lat':         round(s.current_lat, 6) if s.current_lat else None,
            'lng':         round(s.current_lng, 6) if s.current_lng else None,
            'stop_index':  s.stop_index,
            'total_stops': len(stops),
            'visited':     list(s.visited),
            'next_stop':   next_stop,
            'bearing':     round(bearing),
        })
    return jsonify(out)


@app.route('/api/truck/<vehicle_id>')
def api_truck_detail(vehicle_id):
    with _lock:
        s = truck_states.get(str(vehicle_id))
        if not s:
            return jsonify({'error': 'Truck not found or routes not optimized yet'}), 404
        # Snapshot mutable fields under lock
        cur_lat      = s.current_lat
        cur_lng      = s.current_lng
        stop_index   = s.stop_index
        visited      = list(s.visited)
        path_geom    = list(s.path_geometry)
        path_cursor  = s.path_cursor
        legs         = list(s.legs)
        started_at   = s.started_at
        speed_mps    = s.speed_mps
        stops        = [b for b in s.route_bins if b.get('bin_id') != 'HQ']

    next_stop    = stops[stop_index] if stop_index < len(stops) else None
    dist_to_next = None
    eta_minutes  = None
    if next_stop and cur_lat:
        dist_to_next = round(_haversine_m(
            cur_lat, cur_lng, next_stop['latitude'], next_stop['longitude']
        ))
        eta_minutes = round(dist_to_next / speed_mps / 60, 1)

    bearing = 0
    if len(path_geom) > 1 and path_cursor > 0:
        p0 = path_geom[max(0, path_cursor - 1)]
        bearing = _bearing(p0[0], p0[1], cur_lat or p0[0], cur_lng or p0[1])

    return jsonify({
        'vehicle_id':     vehicle_id,
        'lat':            round(cur_lat, 6) if cur_lat else None,
        'lng':            round(cur_lng, 6) if cur_lng else None,
        'bearing':        round(bearing),
        'speed_kmh':      round(speed_mps * 3.6, 1),
        'stop_index':     stop_index,
        'total_stops':    len(stops),
        'visited':        visited,
        'next_stop':      next_stop,
        'dist_to_next_m': dist_to_next,
        'eta_minutes':    eta_minutes,
        'stops':          stops,
        'path_geometry':  path_geom,
        'legs':           legs,
        'started_at':     started_at,
    })


@app.route('/api/truck/<vehicle_id>/advance', methods=['POST'])
def api_truck_advance(vehicle_id):
    with _lock:
        s = truck_states.get(str(vehicle_id))
        if not s:
            return jsonify({'error': 'Truck not found'}), 404
        stops = [b for b in s.route_bins if b.get('bin_id') != 'HQ']
        if s.stop_index < len(stops):
            collected_id = stops[s.stop_index]['bin_id']
            s.visited.add(collected_id)
            s.stop_index += 1
            for b in master_bins:
                if b['bin_id'] == collected_id:
                    b['fill_level']     = 0.0
                    b['weight']         = 0.0
                    b['last_collected'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    break
        done = s.stop_index >= len(stops)
    return jsonify({'success': True, 'done': done, 'stop_index': s.stop_index})


if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug, host='0.0.0.0', port=port)
