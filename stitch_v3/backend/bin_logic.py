from ai_models import evaluate_priority


def process_bin_data(b, global_settings):
    """Classify bin status, priority, and transmission mode.
    Always returns a new dict — never mutates the original."""
    b = dict(b)
    fill = b.get('fill_level', 0)

    if not b.get('sensor_ok', True):
        fill = b.get('predicted_fill', fill)
        b['fill_level'] = fill
        b['transmission_mode'] = 'Predicted Fallback'
        b['last_updated'] = '2 hrs ago'
        b['sensor_status'] = 'Fault Detected'
    else:
        b['last_updated'] = '15 mins ago'
        b['sensor_status'] = 'Active'

    yellow = global_settings.get('threshold_yellow', 50)
    red    = global_settings.get('threshold_red', 80)

    if fill < yellow:
        b['status'] = 'NORMAL'
        b['transmission_mode'] = b.get('transmission_mode', 'Periodic (4h)')
    elif yellow <= fill < red:
        b['status'] = 'MEDIUM'
        b['transmission_mode'] = b.get('transmission_mode', 'Adaptive (2h)')
    else:
        b['status'] = 'CRITICAL'
        b['transmission_mode'] = 'Immediate (Event-triggered)'
        b['is_critical_alert'] = True

    b['priority_level'], b['reason'] = evaluate_priority(b, global_settings)
    b['is_ai_priority'] = b['priority_level'] == 'High'

    return b
