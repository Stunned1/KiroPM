from typing import Dict, Any

def handle_rejection(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handles PM rejection of a feature implementation.
    
    Logs the rejection reason and increments iteration count.
    The rejection context will be fed back into synthesis for better proposals.
    """
    
    iteration_count = state.get("iteration_count", 0) + 1
    
    # Log rejection for learning
    rejection_log = {
        "feature_id": state.get("selected_feature_id"),
        "reason": state.get("rejection_reason", "No reason provided"),
        "iteration": iteration_count
    }
    
    # TODO: Store rejection history in DB for long-term learning
    print(f"Feature rejected: {rejection_log}")
    
    # Reset selection state for next iteration
    return {
        **state,
        "iteration_count": iteration_count,
        "selected_feature_id": None,
        "generated_code": {},
        "app_running": False,
        "app_url": None,
        "pm_decision": "pending"
    }
