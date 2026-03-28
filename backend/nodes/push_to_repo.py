from typing import Dict, Any
import subprocess
import os
from pathlib import Path

def push_to_repo_and_create_ticket(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    On PM acceptance:
    1. Creates a git branch
    2. Commits the generated code
    3. Pushes to remote
    4. Opens a PR
    5. Creates a Jira ticket linked to the PR
    """
    
    feature = next(
        (f for f in state["proposed_features"] if f["id"] == state["selected_feature_id"]),
        None
    )
    
    if not feature:
        return state
    
    generated_code = state.get("generated_code", {})
    files = generated_code.get("files", {})
    
    # Git operations
    branch_name = f"feature/{state['selected_feature_id']}"
    commit_message = f"feat: {feature['title']}"
    
    try:
        repo_path = Path(".")
        
        # Create and checkout branch
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=repo_path,
            check=True
        )
        
        # Apply code changes
        for file_path, content in files.items():
            target = repo_path / file_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
        
        # Stage and commit
        subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
        subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=repo_path,
            check=True
        )
        
        # Push to remote
        subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=repo_path,
            check=True
        )
        
        # Create PR (GitHub CLI example)
        pr_result = subprocess.run(
            [
                "gh", "pr", "create",
                "--title", feature['title'],
                "--body", feature['description'],
                "--base", "main"
            ],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        
        pr_url = pr_result.stdout.strip()
        
        # Create Jira ticket via MCP tool
        jira_ticket_key = create_jira_ticket(feature, pr_url)
        
        return {
            **state,
            "jira_ticket_key": jira_ticket_key,
            "pr_url": pr_url
        }
        
    except Exception as e:
        print(f"Error pushing to repo: {e}")
        return state


def create_jira_ticket(feature: dict, pr_url: str) -> str:
    """Creates a Jira ticket for the implemented feature."""
    
    # TODO: Integrate with Jira MCP tool
    return "PROJ-1234"


def map_priority(score: int) -> str:
    """Maps priority score (1-10) to Jira priority"""
    if score >= 8:
        return "High"
    elif score >= 5:
        return "Medium"
    else:
        return "Low"
