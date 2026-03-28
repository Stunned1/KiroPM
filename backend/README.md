# KiroPM Backend - LangGraph Orchestration

Python backend using LangGraph to orchestrate PM workflow agents.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and configure your API keys.

## Run

```bash
python server.py
```

Server runs on `http://localhost:8000`

## Workflow

1. **Data Ingestion** - Pulls customer interviews, Jira tickets, usage data
2. **Feature Synthesis** - LLM analyzes data and proposes features
3. **PM Selection** - PM clicks a feature to implement
4. **Code Generation** - Agent generates implementation code
5. **Preview** - Code runs in temp environment, PM sees it live
6. **Decision** - PM accepts (creates PR + Jira ticket) or rejects (loops back)

## API Endpoints

- `POST /workflow/start` - Start workflow, get feature proposals
- `POST /workflow/select-feature` - Select feature, generate code and preview
- `POST /workflow/review-decision` - Accept or reject feature
- `GET /workflow/{id}/state` - Get current workflow state
