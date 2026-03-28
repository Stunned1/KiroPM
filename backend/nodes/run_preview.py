from typing import Dict, Any
import subprocess
import tempfile
import shutil
import time
from pathlib import Path

def run_preview_app(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applies generated code to a temporary directory and starts dev server.
    
    Returns the localhost URL where the preview is running.
    """
    
    generated_code = state.get("generated_code", {})
    files = generated_code.get("files", {})
    dependencies = generated_code.get("dependencies", [])
    
    if not files:
        return {"app_running": False, "app_url": None}
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="kiropm_preview_")
    
    try:
        # Copy current app to temp dir
        source_app = Path(".")
        
        # Copy essential files
        for item in ["src", "public", "index.html", "package.json", "vite.config.js"]:
            src_path = source_app / item
            if src_path.exists():
                if src_path.is_dir():
                    shutil.copytree(src_path, Path(temp_dir) / item)
                else:
                    shutil.copy2(src_path, Path(temp_dir) / item)
        
        # Apply generated code changes
        for file_path, content in files.items():
            target = Path(temp_dir) / file_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
        
        # Install new dependencies if any
        if dependencies:
            subprocess.run(
                ["npm", "install", "--save"] + dependencies,
                cwd=temp_dir,
                check=True
            )
        
        # Start dev server
        port = 5174
        process = subprocess.Popen(
            ["npm", "run", "dev", "--", "--port", str(port)],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to be ready
        time.sleep(5)
        
        app_url = f"http://localhost:{port}"
        
        return {
            "app_running": True,
            "app_url": app_url,
            "app_process_id": str(process.pid)
        }
        
    except Exception as e:
        print(f"Error running preview: {e}")
        return {"app_running": False, "app_url": None}
