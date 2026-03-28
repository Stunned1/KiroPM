from typing import Dict, Any
import os
import json
import re
from langchain_openai import ChatOpenAI


def synthesize_features(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core reasoning node: analyzes all input data and proposes features.
    
    Uses GPT-4o Mini to analyze:
    - Customer reviews (reviews.csv) with sentiment, source, persona, tags
    - Usage analytics (synthetic_data.csv) with churn, adoption, engagement
    - Jira tickets (when available)
    - Previous rejection feedback (for iteration loops)
    
    Returns ranked list of feature proposals grounded in real data.
    """
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Build rich synthesis prompt with all available data
    interviews_text = format_interviews(state.get("customer_interviews", []))
    usage_text = format_usage_data(state.get("usage_data", {}))
    jira_text = format_jira_tickets(state.get("jira_tickets", []))
    rejection_text = state.get("rejection_reason", "None")
    iteration = state.get("iteration_count", 0)
    
    prompt = f"""You are a senior product manager analyzing multiple data sources to propose impactful features for an expense-splitting / bill-splitting mobile app.

## DATA SOURCE 1: USER REVIEWS & FEEDBACK
These come from app store reviews, user interviews, customer support tickets, internal stakeholder messages, and feature requests. Each has a Review_ID you should reference.

{interviews_text}

## DATA SOURCE 2: PRODUCT USAGE ANALYTICS
Real usage metrics from the product showing adoption rates, engagement patterns, churn risks, and drop-off points.

{usage_text}

## DATA SOURCE 3: JIRA/BACKLOG TICKETS
{jira_text}

## ITERATION CONTEXT
Iteration: {iteration}
Previous rejection reason: {rejection_text}
{"IMPORTANT: The PM rejected previous proposals. Use the rejection feedback to propose DIFFERENT and BETTER features this time." if iteration > 0 else ""}

---

Based on ALL of this data, propose 3-5 features that would have the HIGHEST IMPACT on user retention, engagement, and satisfaction.

CRITICAL REQUIREMENTS:
1. Every feature MUST cite specific evidence — reference Review_IDs (e.g., "Review #101, #105"), usage metrics, or stakeholder quotes
2. Explain WHY this feature matters using the data (not just what it does)
3. Include who requested/needs it (user persona, stakeholder role)
4. Prioritize features that address multiple signals (e.g., both user pain AND stakeholder strategy)

Return ONLY a JSON array (no markdown fences, no explanation outside JSON):
[
  {{
    "id": "slug-format-id",
    "title": "Concise feature title",
    "description": "2-3 sentences describing the feature",
    "rationale": "Why this matters — cite specific reviews, metrics, and stakeholder input",
    "evidence": [
      {{"source": "Review #101 - Frustrated Traveler", "quote": "relevant quote from the data"}},
      {{"source": "Usage Data", "quote": "metric or insight from analytics"}}
    ],
    "priority_score": 8,
    "complexity": "M",
    "requested_by": ["persona or stakeholder who needs this"],
    "tags": ["relevant", "tags"]
  }}
]

Generate 3-5 features, sorted by priority_score (highest first).
"""
    
    response = llm.invoke(prompt)
    proposed_features = parse_feature_proposals(response.content)
    
    return {
        "proposed_features": proposed_features,
        "current_node": "synthesize"
    }


def format_interviews(interviews: list) -> str:
    """Format reviews/interviews for the synthesis prompt."""
    if not interviews:
        return "No customer feedback data available."
    
    formatted = []
    for interview in interviews:
        review_id = interview.get("review_id", "?")
        source = interview.get("source", "unknown")
        persona = interview.get("author_persona", "")
        sentiment = interview.get("sentiment", "neutral")
        content = interview.get("transcript", "")[:300]
        tags = ", ".join(interview.get("tags", []))
        
        formatted.append(
            f"[Review #{review_id}] Source: {source} | Persona: {persona} | Sentiment: {sentiment}\n"
            f"  \"{content}\"\n"
            f"  Tags: {tags}"
        )
    
    return "\n\n".join(formatted)


def format_jira_tickets(tickets: list) -> str:
    """Format Jira tickets for prompt."""
    if not tickets:
        return "No Jira tickets available (Jira integration not yet configured)."
    
    formatted = []
    for ticket in tickets[:15]:
        formatted.append(
            f"- {ticket['key']}: {ticket['summary']} "
            f"(votes: {ticket.get('votes', 0)}, priority: {ticket.get('priority', 'unset')})"
        )
    return "\n".join(formatted)


def format_usage_data(usage: dict) -> str:
    """Format usage analytics for the synthesis prompt."""
    if not usage or (not usage.get("feature_usage") and not usage.get("drop_off_points")):
        return "No usage data available."
    
    sections = []
    
    # Feature adoption
    feature_usage = usage.get("feature_usage", {})
    if feature_usage:
        sections.append("### Feature Adoption Rates")
        for key, val in feature_usage.items():
            if key not in ("top_categories", "split_types"):
                sections.append(f"  - {key.replace('_', ' ').title()}: {val}")
        if "top_categories" in feature_usage:
            cats = feature_usage["top_categories"]
            sections.append(f"  - Top expense categories: {json.dumps(cats)}")
        if "split_types" in feature_usage:
            splits = feature_usage["split_types"]
            sections.append(f"  - Split type distribution: {json.dumps(splits)}")
    
    # Drop-off points
    drop_offs = usage.get("drop_off_points", [])
    if drop_offs:
        sections.append("\n### Drop-off Points & Churn Risks")
        for dp in drop_offs:
            issue = dp.get("issue", "Unknown")
            count = dp.get("count", 0)
            extra = {k: v for k, v in dp.items() if k not in ("issue", "count")}
            sections.append(f"  - {issue}: {count} users — {json.dumps(extra)}")
    
    # Engagement
    engagement = usage.get("engagement_metrics", {})
    if engagement:
        sections.append("\n### Engagement Metrics")
        for key, val in engagement.items():
            sections.append(f"  - {key.replace('_', ' ').title()}: {val}")
    
    return "\n".join(sections)


def parse_feature_proposals(llm_response: str) -> list:
    """Parse LLM response into structured feature list."""
    try:
        # Try to extract JSON from markdown code fences
        json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', llm_response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Try to find raw JSON array
        array_match = re.search(r'\[[\s\S]*\]', llm_response)
        if array_match:
            return json.loads(array_match.group(0))
        
        return json.loads(llm_response)
    except (json.JSONDecodeError, AttributeError) as e:
        print(f"⚠ Failed to parse feature proposals: {e}")
        print(f"  Raw response: {llm_response[:500]}")
        return []
