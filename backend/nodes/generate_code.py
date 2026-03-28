from typing import Dict, Any
import os
import json
import re
from langchain_openai import ChatOpenAI


def generate_code_for_feature(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates implementation code for the selected feature using GPT-4o Mini.
    
    Steps:
    1. Read current codebase structure
    2. Generate code with repo context
    3. Return structured code changes
    """
    
    feature = next(
        (f for f in state["proposed_features"] if f["id"] == state["selected_feature_id"]),
        None
    )
    
    if not feature:
        return {"generated_code": {}}
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    codebase_context = read_codebase_structure()
    
    # Include the evidence/rationale so generated code is contextualized
    evidence_text = ""
    if feature.get("evidence"):
        evidence_text = "\n".join(
            f"  - {e.get('source', '?')}: \"{e.get('quote', '')}\""
            for e in feature["evidence"]
        )
    
    prompt = f"""You are a senior developer implementing a new feature for a React + Vite + Electron expense-splitting app.

FEATURE TO IMPLEMENT:
Title: {feature.get('title', 'Unknown')}
Description: {feature.get('description', '')}
Rationale: {feature.get('rationale', '')}
Complexity: {feature.get('complexity', 'M')}

WHY THIS FEATURE (evidence from user data):
{evidence_text or 'No specific evidence provided'}

CURRENT CODEBASE STRUCTURE:
{codebase_context}

Generate the implementation code for this feature.

Return ONLY a JSON object (no markdown fences):
{{
  "files": {{
    "path/to/file.jsx": "complete file content...",
    "path/to/another.css": "complete file content..."
  }},
  "dependencies": ["package-name@version"],
  "instructions": "Brief setup instructions if needed"
}}

Follow these rules:
- Follow existing code patterns (React hooks, functional components)
- Use the existing dark theme CSS variables
- Keep changes minimal and focused
- Include complete file contents (not diffs)
"""
    
    response = llm.invoke(prompt)
    generated_code = parse_code_response(response.content)
    
    return {"generated_code": generated_code}


def read_codebase_structure() -> str:
    """
    Reads the current codebase to provide context for code generation.
    Returns a summary of file structure and key components.
    """
    from pathlib import Path
    
    root = Path(__file__).parent.parent.parent
    src_dir = root / "src"
    
    if not src_dir.exists():
        return "Codebase structure: src/ directory not found"
    
    lines = ["src/"]
    try:
        for item in sorted(src_dir.iterdir()):
            if item.name.startswith("."):
                continue
            size_kb = round(item.stat().st_size / 1024, 1)
            lines.append(f"  {item.name} ({size_kb} KB)")
    except Exception:
        pass
    
    return "\n".join(lines)


def parse_code_response(llm_response: str) -> dict:
    """Parse LLM code generation response."""
    try:
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', llm_response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        obj_match = re.search(r'\{[\s\S]*\}', llm_response)
        if obj_match:
            return json.loads(obj_match.group(0))
        
        return json.loads(llm_response)
    except (json.JSONDecodeError, AttributeError):
        return {"files": {}, "dependencies": [], "instructions": ""}
