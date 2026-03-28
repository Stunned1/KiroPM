from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
import uvicorn
from graph import pm_graph

app = FastAPI(title="KiroPM Backend")

# CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory workflow state (TODO: persist to DB)
workflow_states = {}


class StartWorkflowRequest(BaseModel):
    workflow_id: str


class SelectFeatureRequest(BaseModel):
    workflow_id: str
    feature_id: str


class ReviewDecisionRequest(BaseModel):
    workflow_id: str
    decision: Literal["accept", "reject"]
    rejection_reason: Optional[str] = None


@app.post("/workflow/start")
async def start_workflow(req: StartWorkflowRequest):
    """Starts the PM workflow: ingests data and generates feature proposals."""
    
    initial_state = {
        "customer_interviews": [],
        "jira_tickets": [],
        "usage_data": {},
        "proposed_features": [],
        "selected_feature_id": None,
        "generated_code": {},
        "app_running": False,
        "app_url": None,
        "app_process_id": None,
        "pm_decision": "pending",
        "rejection_reason": None,
        "iteration_count": 0,
        "jira_ticket_key": None,
        "pr_url": None,
        "workflow_id": req.workflow_id,
        "current_node": "ingest_interviews"
    }
    
    # Run graph until first interrupt (after synthesis)
    result = pm_graph.invoke(initial_state)
    
    workflow_states[req.workflow_id] = result
    
    return {
        "workflow_id": req.workflow_id,
        "proposed_features": result.get("proposed_features", []),
        "current_node": result.get("current_node")
    }


@app.post("/workflow/select-feature")
async def select_feature(req: SelectFeatureRequest):
    """PM selects a feature to implement. Generates code and runs preview."""
    
    if req.workflow_id not in workflow_states:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    state = workflow_states[req.workflow_id]
    state["selected_feature_id"] = req.feature_id
    
    # Resume graph: will run generate_code → run_preview
    result = pm_graph.invoke(state)
    
    workflow_states[req.workflow_id] = result
    
    return {
        "workflow_id": req.workflow_id,
        "app_running": result.get("app_running"),
        "app_url": result.get("app_url"),
        "generated_code": result.get("generated_code")
    }


@app.post("/workflow/review-decision")
async def review_decision(req: ReviewDecisionRequest):
    """PM accepts or rejects the feature after seeing it run."""
    
    if req.workflow_id not in workflow_states:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    state = workflow_states[req.workflow_id]
    state["pm_decision"] = req.decision
    
    if req.decision == "reject":
        state["rejection_reason"] = req.rejection_reason
    
    # Resume graph: will either push_repo or handle_reject
    result = pm_graph.invoke(state)
    
    workflow_states[req.workflow_id] = result
    
    response = {
        "workflow_id": req.workflow_id,
        "decision": req.decision
    }
    
    if req.decision == "accept":
        response["jira_ticket_key"] = result.get("jira_ticket_key")
        response["pr_url"] = result.get("pr_url")
    else:
        response["proposed_features"] = result.get("proposed_features", [])
    
    return response


@app.get("/workflow/{workflow_id}/state")
async def get_workflow_state(workflow_id: str):
    """Returns current state of a workflow."""
    if workflow_id not in workflow_states:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow_states[workflow_id]


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
