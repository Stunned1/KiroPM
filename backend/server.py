from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Literal, List
import uvicorn
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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


class ProposeRequest(BaseModel):
    prompt: str
    files: Optional[List[dict]] = None  # [{name, content}]
    project_path: Optional[str] = None


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


@app.post("/propose")
async def propose_feature(req: ProposeRequest):
    """
    Direct proposal generation endpoint for the frontend.
    
    Runs the full data ingestion + synthesis pipeline:
    1. Reads reviews.csv (customer feedback)
    2. Reads synthetic_data.csv (usage analytics)
    3. Uses GPT-4o Mini to synthesize features
    4. Returns structured proposal JSON
    """
    from nodes.ingest_interviews import ingest_customer_interviews
    from nodes.ingest_usage import ingest_usage_data
    from nodes.synthesize_features import synthesize_features
    
    # Step 1: Ingest data from CSVs
    interview_state = ingest_customer_interviews({})
    usage_state = ingest_usage_data({})
    
    # Step 2: Build synthesis state with user prompt as additional context
    synth_state = {
        **interview_state,
        **usage_state,
        "jira_tickets": [],
        "rejection_reason": f"User request: {req.prompt}" if req.prompt else None,
        "iteration_count": 0,
    }
    
    # Add uploaded file context
    if req.files:
        file_context = "\n\nAdditional context files:\n"
        for f in req.files:
            file_context += f"\n--- {f.get('name', 'unknown')} ---\n{f.get('content', '')[:8000]}\n"
        synth_state["rejection_reason"] = (synth_state.get("rejection_reason") or "") + file_context
    
    # Step 3: Synthesize features using GPT-4o Mini
    result = synthesize_features(synth_state)
    
    features = result.get("proposed_features", [])
    
    # Step 4: Format as the frontend expects
    if features:
        proposal = {
            "title": features[0].get("title", "Feature Proposal"),
            "why": features[0].get("rationale", ""),
            "signals": [],
            "ui": [],
            "schema": [],
            "tasks": [],
        }
        
        # Flatten all feature evidence into signals
        for feat in features:
            for ev in feat.get("evidence", []):
                proposal["signals"].append({
                    "source": ev.get("source", "Data"),
                    "quote": ev.get("quote", ""),
                })
        
        # Generate tasks from features
        task_id = 1
        for feat in features:
            proposal["tasks"].append({
                "id": task_id,
                "label": f"[{feat.get('complexity', 'M')}] {feat.get('title', 'Task')} — {feat.get('description', '')}",
            })
            task_id += 1
        
        # Suggest UI changes based on features
        for feat in features:
            tags = feat.get("tags", [])
            if any(t in tags for t in ["ui", "ux", "accessibility", "dark-mode", "friction"]):
                proposal["ui"].append({
                    "file": "src/App.jsx",
                    "change": f"Update UI for: {feat.get('title', '')}",
                })
        
        return {
            "proposal": proposal,
            "features": features,
        }
    
    return {"proposal": None, "features": []}


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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    has_key = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "ok",
        "openai_configured": has_key,
        "model": "gpt-4o-mini"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
