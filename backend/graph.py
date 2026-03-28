from langgraph.graph import StateGraph, END
from state import PMState
from nodes.ingest_interviews import ingest_customer_interviews
from nodes.fetch_jira import fetch_jira_tickets
from nodes.ingest_usage import ingest_usage_data
from nodes.synthesize_features import synthesize_features
from nodes.generate_code import generate_code_for_feature
from nodes.run_preview import run_preview_app
from nodes.push_to_repo import push_to_repo_and_create_ticket
from nodes.handle_rejection import handle_rejection


def create_pm_workflow():
    """Creates the LangGraph workflow for PM feature generation."""
    
    workflow = StateGraph(PMState)
    
    # Add all nodes
    workflow.add_node("ingest_interviews", ingest_customer_interviews)
    workflow.add_node("fetch_jira", fetch_jira_tickets)
    workflow.add_node("ingest_usage", ingest_usage_data)
    workflow.add_node("synthesize", synthesize_features)
    workflow.add_node("generate_code", generate_code_for_feature)
    workflow.add_node("run_preview", run_preview_app)
    workflow.add_node("push_repo", push_to_repo_and_create_ticket)
    workflow.add_node("handle_reject", handle_rejection)
    
    # Entry point: parallel data ingestion
    workflow.set_entry_point("ingest_interviews")
    workflow.add_edge("ingest_interviews", "fetch_jira")
    workflow.add_edge("fetch_jira", "ingest_usage")
    
    # Synthesis
    workflow.add_edge("ingest_usage", "synthesize")
    
    # After synthesis, check if feature is selected
    def route_after_synthesis(state):
        if state.get("selected_feature_id"):
            return "generate_code"
        return END
    
    workflow.add_conditional_edges(
        "synthesize",
        route_after_synthesis,
        {
            "generate_code": "generate_code",
            END: END
        }
    )
    
    # Code generation → Preview
    workflow.add_edge("generate_code", "run_preview")
    
    # After preview, check PM decision
    def route_after_preview(state):
        decision = state.get("pm_decision", "pending")
        if decision == "accept":
            return "push_repo"
        elif decision == "reject":
            return "handle_reject"
        return END
    
    workflow.add_conditional_edges(
        "run_preview",
        route_after_preview,
        {
            "push_repo": "push_repo",
            "handle_reject": "handle_reject",
            END: END
        }
    )
    
    # Accept path: push and create ticket, then end
    workflow.add_edge("push_repo", END)
    
    # Reject path: loop back to synthesis with feedback
    def route_after_rejection(state):
        if state.get("iteration_count", 0) >= 3:
            return END
        return "synthesize"
    
    workflow.add_conditional_edges(
        "handle_reject",
        route_after_rejection,
        {
            "synthesize": "synthesize",
            END: END
        }
    )
    
    return workflow.compile()


# Create the compiled graph
pm_graph = create_pm_workflow()
