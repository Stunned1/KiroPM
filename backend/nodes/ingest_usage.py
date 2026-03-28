from typing import Dict, Any
import csv
from pathlib import Path
from collections import defaultdict


def ingest_usage_data(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reads synthetic_data.csv and extracts product usage analytics.
    
    The CSV contains user-level transaction data with:
    - user_id, group_id, group_size, transaction_amount, currency, category
    - split_type, payment_method, settled, days_to_settle
    - churn_risk_score, feature_adoption_score, recurring, etc.
    """
    
    possible_paths = [
        Path(__file__).parent.parent.parent / "synthetic_data.csv",
        Path("synthetic_data.csv"),
        Path("data/synthetic_data.csv"),
    ]
    
    usage_data = {
        "feature_usage": {},
        "drop_off_points": [],
        "engagement_metrics": {},
        "raw_records": [],
    }
    
    for usage_path in possible_paths:
        if usage_path.exists():
            records = []
            with open(usage_path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(row)
            
            if records:
                usage_data["raw_records"] = records
                usage_data["feature_usage"] = _compute_feature_usage(records)
                usage_data["drop_off_points"] = _find_drop_off_points(records)
                usage_data["engagement_metrics"] = _compute_engagement(records)
            
            print(f"✓ Loaded {len(records)} usage records from {usage_path}")
            break
    else:
        print("⚠ No synthetic_data.csv found. Continuing with empty usage data.")
    
    return {"usage_data": usage_data}


def _compute_feature_usage(records: list) -> dict:
    """Compute feature adoption rates and usage patterns."""
    total = len(records)
    if total == 0:
        return {}
    
    scan_used = sum(1 for r in records if r.get("expense_scan_used", "").upper() == "TRUE")
    recurring_used = sum(1 for r in records if r.get("recurring_split_feature_used", "").upper() == "TRUE")
    premium_users = sum(1 for r in records if r.get("premium_user", "").upper() == "TRUE")
    cross_border = sum(1 for r in records if r.get("cross_border_transaction", "").upper() == "TRUE")
    
    # Category breakdown
    categories = defaultdict(int)
    for r in records:
        cat = r.get("category", "Unknown")
        categories[cat] += 1
    
    # Split type breakdown
    split_types = defaultdict(int)
    for r in records:
        st = r.get("split_type", "Unknown")
        split_types[st] += 1
    
    return {
        "expense_scanner_adoption": f"{scan_used}/{total} ({round(scan_used/total*100)}%)",
        "recurring_split_adoption": f"{recurring_used}/{total} ({round(recurring_used/total*100)}%)",
        "premium_rate": f"{premium_users}/{total} ({round(premium_users/total*100)}%)",
        "cross_border_rate": f"{cross_border}/{total} ({round(cross_border/total*100)}%)",
        "top_categories": dict(sorted(categories.items(), key=lambda x: -x[1])),
        "split_types": dict(split_types),
    }


def _find_drop_off_points(records: list) -> list:
    """Identify where users are dropping off or churning."""
    drop_offs = []
    
    high_churn = [r for r in records if float(r.get("churn_risk_score", 0)) > 0.5]
    unsettled = [r for r in records if r.get("settled", "").upper() == "FALSE"]
    low_adoption = [r for r in records if float(r.get("feature_adoption_score", 1)) < 0.4]
    late_payers = [r for r in records if r.get("late_payment_flag", "").upper() == "TRUE"]
    
    if high_churn:
        drop_offs.append({
            "issue": "High churn risk users",
            "count": len(high_churn),
            "avg_score": round(sum(float(r.get("churn_risk_score", 0)) for r in high_churn) / len(high_churn), 2),
            "platforms": list(set(r.get("platform", "") for r in high_churn)),
        })
    
    if unsettled:
        drop_offs.append({
            "issue": "Unsettled transactions",
            "count": len(unsettled),
            "total_amount": round(sum(float(r.get("transaction_amount", 0)) for r in unsettled), 2),
        })
    
    if low_adoption:
        drop_offs.append({
            "issue": "Low feature adoption",
            "count": len(low_adoption),
            "avg_ads_seen": round(sum(int(r.get("ads_seen_count", 0)) for r in low_adoption) / len(low_adoption), 1),
        })
    
    if late_payers:
        drop_offs.append({
            "issue": "Late payment flagged users",
            "count": len(late_payers),
        })
    
    return drop_offs


def _compute_engagement(records: list) -> dict:
    """Compute overall engagement metrics."""
    if not records:
        return {}
    
    total = len(records)
    avg_ltv = round(sum(float(r.get("user_ltv", 0)) for r in records) / total, 2)
    avg_txn_count = round(sum(int(r.get("transactions_count", 0)) for r in records) / total, 1)
    avg_notification_rate = round(sum(float(r.get("notification_open_rate", 0)) for r in records) / total, 2)
    avg_adoption_score = round(sum(float(r.get("feature_adoption_score", 0)) for r in records) / total, 2)
    
    # Platform breakdown
    platforms = defaultdict(int)
    for r in records:
        platforms[r.get("platform", "Unknown")] += 1
    
    # Referral sources
    referrals = defaultdict(int)
    for r in records:
        referrals[r.get("referral_source", "Unknown")] += 1
    
    return {
        "average_ltv": avg_ltv,
        "average_transactions": avg_txn_count,
        "average_notification_open_rate": avg_notification_rate,
        "average_feature_adoption_score": avg_adoption_score,
        "platform_distribution": dict(platforms),
        "referral_sources": dict(referrals),
        "total_users_in_sample": total,
    }
