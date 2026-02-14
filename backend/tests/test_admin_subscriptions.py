"""
Admin Subscription Management API Tests - Phase 3
Tests all endpoints for admin subscription management including:
- GET /admin/subscriptions - List users with subscription info
- GET /admin/subscriptions?plan=X - Filter by plan
- GET /admin/subscriptions?search=X - Filter by search term
- PUT /admin/subscriptions/{user_id} - Change user plan with audit log
- GET /admin/subscription-logs - Get subscription change audit logs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestAdminSubscriptionsList:
    """Tests for GET /admin/subscriptions endpoint"""

    def test_list_subscriptions_returns_user_list(self):
        """GET /admin/subscriptions returns user list with subscription info"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "stats" in data
        assert isinstance(data["users"], list)
        
        # Check stats structure
        stats = data["stats"]
        assert "plan_counts" in stats
        assert "mrr" in stats
        assert "total_users" in stats
        
        # Verify plan_counts has all expected plans
        plan_counts = stats["plan_counts"]
        assert "basic" in plan_counts
        assert "pro" in plan_counts
        assert "premium" in plan_counts
        
        # Check MRR calculation (Pro=$19, Premium=$39)
        expected_mrr = plan_counts.get("pro", 0) * 19 + plan_counts.get("premium", 0) * 39
        assert stats["mrr"] == expected_mrr, f"Expected MRR {expected_mrr}, got {stats['mrr']}"

    def test_user_record_has_required_fields(self):
        """Each user record has all required subscription fields"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        if data["users"]:
            user = data["users"][0]
            required_fields = ["user_id", "tenant_id", "name", "email", "plan", 
                            "school_count", "school_limit", "ai_used", "ai_limit"]
            for field in required_fields:
                assert field in user, f"Missing field: {field}"

    def test_filter_by_basic_plan(self):
        """GET /admin/subscriptions?plan=basic returns only basic users"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", params={"plan": "basic"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert user["plan"] == "basic", f"Expected basic plan, got {user['plan']}"

    def test_filter_by_pro_plan(self):
        """GET /admin/subscriptions?plan=pro returns only pro users"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", params={"plan": "pro"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert user["plan"] == "pro", f"Expected pro plan, got {user['plan']}"

    def test_filter_by_premium_plan(self):
        """GET /admin/subscriptions?plan=premium returns only premium users"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", params={"plan": "premium"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert user["plan"] == "premium", f"Expected premium plan, got {user['plan']}"

    def test_search_by_name(self):
        """GET /admin/subscriptions?search=Athlete filters by search term"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", params={"search": "Athlete"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1, "Should find at least one user matching 'Athlete'"
        
        # Verify search is actually filtering (name, email, or athlete_name contains 'athlete')
        for user in data["users"]:
            name_match = "athlete" in (user.get("name") or "").lower()
            email_match = "athlete" in (user.get("email") or "").lower()
            athlete_match = "athlete" in (user.get("athlete_name") or "").lower()
            assert name_match or email_match or athlete_match, \
                f"User doesn't match search term: {user}"


class TestAdminSubscriptionChange:
    """Tests for PUT /admin/subscriptions/{user_id} endpoint"""

    def test_change_user_plan(self):
        """PUT /admin/subscriptions/{user_id} changes plan and creates audit log"""
        user_id = "user_public_default"
        
        # Get current plan first
        list_response = requests.get(f"{BASE_URL}/api/admin/subscriptions", params={"search": "Athlete"})
        users = list_response.json().get("users", [])
        current_user = next((u for u in users if u["user_id"] == user_id), None)
        old_plan = current_user["plan"] if current_user else "basic"
        
        # Change to a different plan
        new_plan = "pro" if old_plan == "basic" else "basic"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/{user_id}",
            json={"plan": new_plan, "reason": "Pytest admin change test"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "log" in data
        
        # Verify audit log entry
        log = data["log"]
        assert log["user_id"] == user_id
        assert log["old_plan"] == old_plan
        assert log["new_plan"] == new_plan
        assert log["reason"] == "Pytest admin change test"
        assert log["changed_by"] == "admin"
        assert "log_id" in log
        assert "created_at" in log
        
        # Reset plan back
        requests.put(
            f"{BASE_URL}/api/admin/subscriptions/{user_id}",
            json={"plan": old_plan, "reason": "Reset after pytest"}
        )

    def test_change_plan_invalid_plan(self):
        """PUT /admin/subscriptions/{user_id} with invalid plan returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "invalid_plan"}
        )
        assert response.status_code == 400
        assert "Invalid plan" in response.json().get("detail", "")

    def test_change_plan_user_not_found(self):
        """PUT /admin/subscriptions/{user_id} for non-existent user returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/nonexistent_user_12345",
            json={"plan": "pro"}
        )
        assert response.status_code == 404


class TestAdminSubscriptionLogs:
    """Tests for GET /admin/subscription-logs endpoint"""

    def test_list_subscription_logs(self):
        """GET /admin/subscription-logs returns audit logs"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert isinstance(data["logs"], list)

    def test_logs_have_required_fields(self):
        """Each log entry has all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 200
        
        data = response.json()
        if data["logs"]:
            log = data["logs"][0]
            required_fields = ["log_id", "user_id", "tenant_id", "old_plan", 
                            "new_plan", "changed_by", "created_at"]
            for field in required_fields:
                assert field in log, f"Missing field: {field}"

    def test_logs_show_recent_changes(self):
        """Logs contain recently made subscription changes"""
        # First make a change to ensure there's a log
        requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "pro", "reason": "Pytest log verification"}
        )
        
        # Get logs
        response = requests.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1, "Should have at least one log entry"
        
        # Verify most recent log
        recent_log = data["logs"][0]
        assert recent_log["user_id"] == "user_public_default"
        assert recent_log["new_plan"] == "pro"
        
        # Reset
        requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "basic", "reason": "Reset after pytest"}
        )


class TestSubscriptionStatsCalculation:
    """Tests for MRR and plan count calculations"""

    def test_mrr_calculation_accuracy(self):
        """MRR is calculated correctly: Pro*19 + Premium*39"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        stats = response.json()["stats"]
        plan_counts = stats["plan_counts"]
        
        expected_mrr = plan_counts["pro"] * 19 + plan_counts["premium"] * 39
        assert stats["mrr"] == expected_mrr, \
            f"MRR mismatch: expected {expected_mrr}, got {stats['mrr']}"

    def test_total_users_matches_plan_sum(self):
        """Total users equals sum of all plan counts"""
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        
        stats = response.json()["stats"]
        plan_sum = sum(stats["plan_counts"].values())
        
        # Note: total_users in stats should match total in response
        assert stats["total_users"] == plan_sum, \
            f"Total mismatch: total_users={stats['total_users']}, plan_sum={plan_sum}"
