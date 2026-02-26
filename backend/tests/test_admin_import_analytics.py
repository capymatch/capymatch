"""
Admin Import Analytics API Tests
Tests for the admin dashboard endpoints that track Gmail History Import analytics.
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin session token provided in test credentials
ADMIN_SESSION_TOKEN = "sess_b4ae6400ec06424ebd67b63d01c9dbef"

# Demo user credentials (non-admin)
DEMO_EMAIL = "demo@capymatch.com"
DEMO_PASSWORD = "demo2026"


@pytest.fixture(scope="module")
def demo_session_token():
    """Get a demo user session token for non-admin tests."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip("Could not login as demo user")


@pytest.fixture(scope="module")
def admin_headers():
    """Headers for admin requests."""
    return {
        "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def demo_headers(demo_session_token):
    """Headers for demo user (non-admin) requests."""
    return {
        "Authorization": f"Bearer {demo_session_token}",
        "Content-Type": "application/json"
    }


# ===== Admin Access Tests =====

class TestAdminAccessControl:
    """Test that admin endpoints return 403 for non-admin users."""

    def test_overview_returns_403_for_non_admin(self, demo_headers):
        """GET /api/admin/import-analytics/overview returns 403 for demo user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/overview",
            headers=demo_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Overview endpoint returns 403 for non-admin demo user")

    def test_funnel_returns_403_for_non_admin(self, demo_headers):
        """GET /api/admin/import-analytics/funnel returns 403 for demo user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/funnel",
            headers=demo_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Funnel endpoint returns 403 for non-admin demo user")

    def test_behavior_returns_403_for_non_admin(self, demo_headers):
        """GET /api/admin/import-analytics/behavior returns 403 for demo user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/behavior",
            headers=demo_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Behavior endpoint returns 403 for non-admin demo user")

    def test_recent_runs_returns_403_for_non_admin(self, demo_headers):
        """GET /api/admin/import-analytics/recent-runs returns 403 for demo user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/recent-runs",
            headers=demo_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Recent-runs endpoint returns 403 for non-admin demo user")

    def test_stage_distribution_returns_403_for_non_admin(self, demo_headers):
        """GET /api/admin/import-analytics/stage-distribution returns 403 for demo user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/stage-distribution",
            headers=demo_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Stage-distribution endpoint returns 403 for non-admin demo user")


# ===== Admin Endpoint Response Structure Tests =====

class TestAdminOverviewEndpoint:
    """Test GET /api/admin/import-analytics/overview returns correct structure."""

    def test_overview_returns_200_for_admin(self, admin_headers):
        """GET /api/admin/import-analytics/overview returns 200 for admin user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/overview",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Overview returns 200 for admin user")

    def test_overview_has_required_fields(self, admin_headers):
        """Overview endpoint returns all required fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/overview",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        required_fields = [
            "total_completed_imports",
            "unique_users",
            "pending_runs",
            "ready_not_confirmed",
            "total_schools_imported",
            "total_schools_skipped",
            "total_coaches_from_kb",
            "total_coaches_from_gmail",
            "total_messages_scanned",
            "avg_scan_duration_s",
            "avg_conversion_rate",
            "avg_schools_per_run"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"  - {field}: {data[field]}")
        
        print("PASS: Overview endpoint has all required fields")


class TestAdminFunnelEndpoint:
    """Test GET /api/admin/import-analytics/funnel returns aggregated funnel data."""

    def test_funnel_returns_200_for_admin(self, admin_headers):
        """GET /api/admin/import-analytics/funnel returns 200 for admin user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/funnel",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Funnel returns 200 for admin user")

    def test_funnel_has_required_fields(self, admin_headers):
        """Funnel endpoint returns all funnel step fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/funnel",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "messages_scanned",
            "schools_found",
            "high_confidence",
            "user_selected",
            "actually_created"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required funnel field: {field}"
            print(f"  - {field}: {data[field]}")
        
        print("PASS: Funnel endpoint has all required fields")


class TestAdminBehaviorEndpoint:
    """Test GET /api/admin/import-analytics/behavior returns user behavior event counts."""

    def test_behavior_returns_200_for_admin(self, admin_headers):
        """GET /api/admin/import-analytics/behavior returns 200 for admin user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/behavior",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Behavior returns 200 for admin user")

    def test_behavior_has_required_fields(self, admin_headers):
        """Behavior endpoint returns all event count fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/behavior",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "consent_shown",
            "started",
            "preview_shown",
            "confirmed",
            "abandoned",
            "start_rate",
            "abandon_rate",
            "confirm_rate",
            "total_deselections",
            "total_reselections",
            "add_manually_clicks"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required behavior field: {field}"
            print(f"  - {field}: {data[field]}")
        
        print("PASS: Behavior endpoint has all required fields")


class TestAdminRecentRunsEndpoint:
    """Test GET /api/admin/import-analytics/recent-runs returns runs with user enrichment."""

    def test_recent_runs_returns_200_for_admin(self, admin_headers):
        """GET /api/admin/import-analytics/recent-runs returns 200 for admin user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/recent-runs",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Recent-runs returns 200 for admin user")

    def test_recent_runs_has_correct_structure(self, admin_headers):
        """Recent runs endpoint returns runs array with total count."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/recent-runs",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "runs" in data, "Missing 'runs' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["runs"], list), "'runs' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        
        print(f"  - Total runs: {data['total']}")
        print(f"  - Runs returned: {len(data['runs'])}")
        print("PASS: Recent-runs has correct structure")

    def test_recent_runs_enriched_fields(self, admin_headers):
        """Runs in response have user enrichment and analytics fields."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/recent-runs",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["runs"]) > 0:
            run = data["runs"][0]
            # Check expected fields in each run
            expected_fields = [
                "run_id", "user_email", "user_name", "status",
                "started_at", "completed_at", "confirmed_at",
                "messages_scanned", "schools_found", "schools_high_confidence",
                "confirmed_school_ids", "scan_analytics", "confirm_analytics",
                "unmapped_domains", "error"
            ]
            for field in expected_fields:
                assert field in run, f"Missing field in run: {field}"
            
            print(f"  - First run_id: {run['run_id']}")
            print(f"  - User email: {run['user_email']}")
            print(f"  - Status: {run['status']}")
            print("PASS: Recent-runs has enriched fields")
        else:
            print("PASS: Recent-runs returned empty list (no runs yet)")


class TestAdminStageDistributionEndpoint:
    """Test GET /api/admin/import-analytics/stage-distribution returns stage counts."""

    def test_stage_distribution_returns_200_for_admin(self, admin_headers):
        """GET /api/admin/import-analytics/stage-distribution returns 200 for admin user."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/stage-distribution",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Stage-distribution returns 200 for admin user")

    def test_stage_distribution_has_correct_structure(self, admin_headers):
        """Stage distribution returns stages object."""
        response = requests.get(
            f"{BASE_URL}/api/admin/import-analytics/stage-distribution",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stages" in data, "Missing 'stages' field"
        assert isinstance(data["stages"], dict), "'stages' should be a dict"
        
        if data["stages"]:
            print(f"  - Stages: {data['stages']}")
        else:
            print("  - Stages: empty (no confirmed imports with stage data yet)")
        
        print("PASS: Stage-distribution has correct structure")


# ===== Unauthenticated Access Tests =====

class TestUnauthenticatedAccess:
    """Test that admin endpoints return 401 for unauthenticated requests."""

    def test_overview_returns_401_without_auth(self):
        """GET /api/admin/import-analytics/overview returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/admin/import-analytics/overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Overview returns 401 without authentication")

    def test_funnel_returns_401_without_auth(self):
        """GET /api/admin/import-analytics/funnel returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/admin/import-analytics/funnel")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Funnel returns 401 without authentication")

    def test_behavior_returns_401_without_auth(self):
        """GET /api/admin/import-analytics/behavior returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/admin/import-analytics/behavior")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Behavior returns 401 without authentication")

    def test_recent_runs_returns_401_without_auth(self):
        """GET /api/admin/import-analytics/recent-runs returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/admin/import-analytics/recent-runs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Recent-runs returns 401 without authentication")

    def test_stage_distribution_returns_401_without_auth(self):
        """GET /api/admin/import-analytics/stage-distribution returns 401 without auth."""
        response = requests.get(f"{BASE_URL}/api/admin/import-analytics/stage-distribution")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Stage-distribution returns 401 without authentication")
