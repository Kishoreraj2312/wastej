def predict_time_to_fill(bin_data):
    """Hours until this bin reaches 100% fill.

    Uses the pre-computed value written by the simulation when available.
    Falls back to deriving it from fill history if the simulation hasn't run yet.
    """
    if 'time_to_fill_hours' in bin_data:
        return bin_data['time_to_fill_hours']

    history = bin_data.get('history', [])
    fill    = bin_data.get('fill_level', 0)
    if len(history) >= 2:
        # Each history entry is one simulation cycle (~60 s = 1/60 hr)
        rate_per_cycle = (history[-1] - history[0]) / max(len(history) - 1, 1)
        if rate_per_cycle > 0:
            return round((100.0 - fill) / rate_per_cycle / 60, 1)
    return 99


def evaluate_priority(bin_data, global_settings):
    """Evaluates bin collection priority based on fill level and predicted overflow."""
    eta  = predict_time_to_fill(bin_data)
    fill = bin_data.get('fill_level', 0)
    red    = global_settings.get('threshold_red', 80)
    yellow = global_settings.get('threshold_yellow', 50)

    priority = 'Low'
    reason   = 'Standard'

    if fill >= red:
        priority = 'High'
        reason   = 'Critical Fill'
    elif eta < 24:
        priority = 'High'
        reason   = 'Predicted Overflow'
    elif fill >= yellow:
        priority = 'Medium'
        reason   = 'High Growth Rate' if eta < 12 else 'Approaching Capacity'

    return priority, reason
