from typing import Dict, Any
import csv
from pathlib import Path


def ingest_customer_interviews(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reads reviews.csv and extracts structured customer feedback.
    
    The CSV contains real user reviews with:
    - Review_ID, Source, Author_Persona, Sentiment, Content, Tags
    
    These are treated as "customer interviews" / user feedback signals.
    """
    
    # Look for reviews.csv in parent directory (project root) or data directory
    possible_paths = [
        Path(__file__).parent.parent.parent / "reviews.csv",
        Path("reviews.csv"),
        Path("data/reviews.csv"),
    ]
    
    interviews = []
    
    for reviews_path in possible_paths:
        if reviews_path.exists():
            with open(reviews_path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    interviews.append({
                        "review_id": row.get("Review_ID", ""),
                        "source": row.get("Source", "unknown"),
                        "author_persona": row.get("Author_Persona", ""),
                        "transcript": row.get("Content", ""),
                        "sentiment": row.get("Sentiment", "neutral").lower(),
                        "tags": [t.strip() for t in row.get("Tags", "").split(",") if t.strip()],
                        "pain_points": [],  # Will be enriched by LLM in synthesis
                    })
            print(f"✓ Loaded {len(interviews)} reviews from {reviews_path}")
            break
    else:
        print("⚠ No reviews.csv found. Continuing with empty interviews.")
    
    return {"customer_interviews": interviews}
