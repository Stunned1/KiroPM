from typing import Dict, Any
import os
from langchain_openai import ChatOpenAI

def synthesize_features(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core reasoning node: analyzes all input data and proposes features.
    
    Takes customer interviews, Jira tickets, and usage data.
    Returns ranked list of feature proposals.
    """
    
    # TODO: Configure LLM (OpenAI, Anthropic, etc.)
    llm = ChatOpenAI(
        model="gpt-4-turbo-preview",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Build synthesis prompt
    prompt = f"""You are a product manager analyzing data to propose new features.

CUSTOMER INTERVIEWS:
{format_interviews(state.get("customer_interviews", []))}

JIRA TICKETS (sorted by votes):
{format_jira_tickets(state.get("jira_tickets", []))}

USAGE DATA:
{format_usage_data(state.get("usage_data", {}))}

REJECTION HISTORY:
{state.get("rejection_reason", "None")}

Based on this data, propose 3-5 features that would have the highest impact.

For each feature, provide:
1. Title (concise, user-facing)
2. Problem it solves
3. Evidence from the data (quote specific interviews, tickets, or metrics)
4. Priority score (1-10, where 10 is highest)
5. Estimated complexity (S/M/L)
6. Unique ID (slug format)

Return as JSON array.
"""
    
    response = llm.invoke(prompt)
    
    # TODO: Parse LLM response into structured format
    # For now, assume it returns valid JSON
    proposed_features = parse_feature_proposals(response.content)
    
    return {"proposed_features": proposed_features}


def format_interviews(interviews: list) -> str:
    """Format interviews for prompt"""
    if not interviews:
        return "No interview data available"
    
    formatted = []
    for i, interview in enumerate(interviews[:10], 1):
        formatted.append(f"{i}. [{interview.get('date')}] {interview.get('transcript', '')[:200]}...")
    return "\n".join(formatted)


def format_jira_tickets(tickets: list) -> str:
    """Format Jira tickets for prompt"""
    if not tickets:
        return "No Jira tickets available"
    
    formatted = []
    for ticket in tickets[:15]:
        formatted.append(
            f"- {ticket['key']}: {ticket['summary']} "
            f"(votes: {ticket.get('votes', 0)})"
        )
    return "\n".join(formatted)


def format_usage_data(usage: dict) -> str:
    """Format usage data for prompt"""
    if not usage:
        return "No usage data available"
    
    return json.dumps(usage, indent=2)


def parse_feature_proposals(llm_response: str) -> list:
    """Parse LLM response into structured feature list"""
    import json
    import re
    
    try:
        json_match = re.search(r'```json\s*(\[.*?\])\s*```', llm_response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        return json.loads(llm_response)
    except:
        return []
