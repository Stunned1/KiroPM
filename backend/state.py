from typing import TypedDict, List, Literal, Optional

class PMState(TypedDict):
    """State object that flows through the LangGraph workflow"""
    
    # Input sources
    customer_interviews: List[dict]  # {source, transcript, date, sentiment, pain_points}
    jira_tickets: List[dict]         # {key, summary, description, labels, votes}
    usage_data: dict                 # {feature_usage, drop_off_points, engagement_metrics}
    
    # Generated outputs
    proposed_features: List[dict]    # {id, title, description, rationale, priority_score, evidence}
    selected_feature_id: Optional[str]
    
    # Code generation
    generated_code: dict             # {files: {path: content}, dependencies: [], instructions: str}
    app_running: bool
    app_url: Optional[str]
    app_process_id: Optional[str]
    
    # Decision tracking
    pm_decision: Literal["accept", "reject", "pending"]
    rejection_reason: Optional[str]
    iteration_count: int
    
    # Output tracking
    jira_ticket_key: Optional[str]   # e.g., "PROJ-1234"
    pr_url: Optional[str]            # GitHub/GitLab PR link
    
    # Metadata
    workflow_id: str
    current_node: str
