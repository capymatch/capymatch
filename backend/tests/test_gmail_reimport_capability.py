"""
Tests for Gmail Import Re-import Capability

Features tested:
1. POST /api/gmail/import-history returns {run_id, resumed: true} when there's a ready run with unimported suggestions
2. Resume check excludes schools already on the user's board (already_on_board)
3. Resume check excludes schools from the confirmed_school_ids list
4. If all suggestions are already imported/on board, falls through to Gmail check (no resume)
5. Resume works even without Gmail connected (check happens before Gmail credential check)
6. New scan still works normally when no resumable run exists (regression)
7. Status endpoint still returns correct plan_info and already_on_board for resumed runs (regression)
"""

import pytest
import requests
import os
from datetime import datetime, timezone
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def session_token():
    """Login as demo user and get session token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@capymatch.com", "password": "demo2026"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["session_token"]

@pytest.fixture(scope="module")
def auth_headers(session_token):
    """Return auth headers for API requests"""
    return {"Authorization": f"Bearer {session_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def test_run_id():
    """Generate unique test run ID prefix"""
    return f"test_reimport_{uuid.uuid4().hex[:8]}"

@pytest.fixture(scope="module")
def mongo_client():
    """Create MongoDB connection"""
    import pymongo
    client = pymongo.MongoClient("mongodb://localhost:27017")
    return client["test_database"]


class TestResumeCheckBasic:
    """Test basic resume check functionality"""

    def test_resume_returns_run_id_and_resumed_true(self, auth_headers, mongo_client, test_run_id):
        """
        POST /api/gmail/import-history should return {run_id, resumed: true}
        when there's a ready run with unimported suggestions
        """
        run_id = f"{test_run_id}_resume_basic"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Create an import_run with status='ready' and suggestions that are NOT on board
        # New school that doesn't exist on demo user's board
        suggestions = [
            {
                "school_id": "TEST_RESUME_NewSchool_A",
                "normalized_domain": "testresumea.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 2,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match to KB",
                "ignored": False,
            },
            {
                "school_id": "TEST_RESUME_NewSchool_B",
                "normalized_domain": "testresumeb.edu",
                "confidence": 85,
                "proposed_stage": "outreach",
                "outbound_count": 1,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match to KB",
                "ignored": False,
            },
        ]

        # Insert test import_run (status='ready' with unconfirmed suggestions)
        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 2,
            "schools_high_confidence": 2,
            "suggestions": suggestions,
            "confirmed_school_ids": [],  # Nothing confirmed yet
        })

        try:
            # Call start_import - should detect resumable run
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            assert response.status_code == 200, f"Start import failed: {response.text}"
            data = response.json()

            # Verify resumed response
            assert "run_id" in data, "Response should contain run_id"
            assert data["run_id"] == run_id, f"Expected run_id={run_id}, got {data['run_id']}"
            assert data.get("resumed") == True, f"Expected resumed=true, got {data.get('resumed')}"

            print(f"✓ Resume check returns run_id and resumed=true: {data}")

        finally:
            # Cleanup
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestResumeExcludesExistingSchools:
    """Test that resume check excludes schools already on user's board"""

    def test_resume_excludes_already_on_board(self, auth_headers, mongo_client, test_run_id):
        """
        Resume check should exclude schools that are already on the user's board
        (matching against existing programs by university_name)
        """
        run_id = f"{test_run_id}_exclude_onboard"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Create suggestions with mix of existing and new schools
        # Demo user has Stanford University, UCLA, Penn State on their board
        suggestions = [
            {
                "school_id": "Stanford University",  # Already on board
                "normalized_domain": "stanford.edu",
                "confidence": 95,
                "proposed_stage": "outreach",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "UCLA",  # Already on board
                "normalized_domain": "ucla.edu",
                "confidence": 92,
                "proposed_stage": "in_conversation",
                "outbound_count": 2,
                "inbound_count": 2,
                "thread_count": 3,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_RESUME_NewForExclusion",  # NOT on board
                "normalized_domain": "testnewexcl.edu",
                "confidence": 88,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 3,
            "schools_high_confidence": 3,
            "suggestions": suggestions,
            "confirmed_school_ids": [],
        })

        try:
            # Call start_import - should resume because there's at least one new school
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            assert response.status_code == 200, f"Start import failed: {response.text}"
            data = response.json()

            # Should resume because TEST_RESUME_NewForExclusion is not on board
            assert data.get("resumed") == True, f"Expected resumed=true (one new school), got {data}"
            assert data["run_id"] == run_id

            print(f"✓ Resume check correctly found remaining school after excluding existing: {data}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestResumeExcludesConfirmedSchools:
    """Test that resume check excludes schools from confirmed_school_ids"""

    def test_resume_excludes_confirmed_school_ids(self, auth_headers, mongo_client, test_run_id):
        """
        Resume check should exclude schools that are in confirmed_school_ids
        (schools the user already confirmed in a previous import session)
        """
        run_id = f"{test_run_id}_exclude_confirmed"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        suggestions = [
            {
                "school_id": "TEST_RESUME_ConfirmedSchool",  # Was confirmed previously
                "normalized_domain": "testconfirmed.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_RESUME_UnconfirmedSchool",  # NOT confirmed
                "normalized_domain": "testunconfirmed.edu",
                "confidence": 85,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 2,
            "schools_high_confidence": 2,
            "suggestions": suggestions,
            # One school was already confirmed (imported) previously
            "confirmed_school_ids": ["TEST_RESUME_ConfirmedSchool"],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            assert response.status_code == 200, f"Start import failed: {response.text}"
            data = response.json()

            # Should resume because TEST_RESUME_UnconfirmedSchool is not confirmed
            assert data.get("resumed") == True, f"Expected resumed=true (one unconfirmed school), got {data}"
            assert data["run_id"] == run_id

            print(f"✓ Resume check correctly excludes confirmed_school_ids: {data}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestNoResumeWhenAllImported:
    """Test that resume falls through when all suggestions are imported/on board"""

    def test_no_resume_when_all_on_board(self, auth_headers, mongo_client, test_run_id):
        """
        If all suggestions are already on board, should NOT resume.
        Should fall through to Gmail check (which will fail for demo user since Gmail not connected)
        """
        run_id = f"{test_run_id}_all_onboard"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # All suggestions are schools already on demo user's board
        suggestions = [
            {
                "school_id": "Stanford University",
                "normalized_domain": "stanford.edu",
                "confidence": 95,
                "proposed_stage": "outreach",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "UCLA",
                "normalized_domain": "ucla.edu",
                "confidence": 92,
                "proposed_stage": "in_conversation",
                "outbound_count": 2,
                "inbound_count": 2,
                "thread_count": 3,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 2,
            "schools_high_confidence": 2,
            "suggestions": suggestions,
            "confirmed_school_ids": [],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            # Should fail with 403 "Gmail not connected" because:
            # 1. All suggestions are already on board, so no resume
            # 2. Falls through to Gmail check, which fails (demo user has no Gmail)
            assert response.status_code == 403, f"Expected 403 (Gmail not connected), got {response.status_code}: {response.text}"
            assert "Gmail not connected" in response.text, f"Expected 'Gmail not connected' error: {response.text}"

            print(f"✓ No resume when all schools are already on board - falls through to Gmail check")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})

    def test_no_resume_when_all_confirmed(self, auth_headers, mongo_client, test_run_id):
        """
        If all suggestions are in confirmed_school_ids, should NOT resume.
        """
        run_id = f"{test_run_id}_all_confirmed"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        suggestions = [
            {
                "school_id": "TEST_ALL_CONFIRMED_A",
                "normalized_domain": "testa.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_ALL_CONFIRMED_B",
                "normalized_domain": "testb.edu",
                "confidence": 85,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 2,
            "schools_high_confidence": 2,
            "suggestions": suggestions,
            # Both already confirmed
            "confirmed_school_ids": ["TEST_ALL_CONFIRMED_A", "TEST_ALL_CONFIRMED_B"],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            # Should fail with 403 "Gmail not connected" because no remaining schools
            assert response.status_code == 403, f"Expected 403 (Gmail not connected), got {response.status_code}: {response.text}"

            print(f"✓ No resume when all schools are already confirmed")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestResumeWithoutGmailConnected:
    """Test that resume works even without Gmail connected"""

    def test_resume_works_without_gmail(self, auth_headers, mongo_client, test_run_id):
        """
        Resume check happens BEFORE Gmail credential check.
        So even if Gmail is not connected, a resumable run should return resumed=true.
        (Demo user does NOT have Gmail connected)
        """
        run_id = f"{test_run_id}_no_gmail"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Ensure demo user has no Gmail token (should already be true)
        mongo_client.gmail_tokens.delete_many({"user_id": user_id})

        suggestions = [
            {
                "school_id": "TEST_RESUME_NoGmail_School",
                "normalized_domain": "testnogmail.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 50,
            "schools_found": 1,
            "schools_high_confidence": 1,
            "suggestions": suggestions,
            "confirmed_school_ids": [],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            # Should succeed with resume even without Gmail
            assert response.status_code == 200, f"Expected 200 (resume works without Gmail), got {response.status_code}: {response.text}"
            data = response.json()
            assert data.get("resumed") == True, f"Expected resumed=true, got {data}"

            print(f"✓ Resume works without Gmail connected: {data}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestNewScanRegression:
    """Test that new scan still works when no resumable run exists"""

    def test_no_resumable_run_triggers_gmail_check(self, auth_headers, mongo_client, test_run_id):
        """
        When there's no resumable run (status='ready'), should fall through to Gmail check.
        Demo user has no Gmail connected, so this should return 403.
        """
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Clean up any existing ready runs
        mongo_client.import_runs.delete_many({
            "user_id": user_id,
            "status": "ready"
        })

        # Also ensure no active scans
        mongo_client.import_runs.delete_many({
            "user_id": user_id,
            "status": {"$in": ["scanning", "mapping", "aggregating"]}
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            # Should fail with 403 "Gmail not connected"
            assert response.status_code == 403, f"Expected 403 (Gmail not connected), got {response.status_code}: {response.text}"
            assert "Gmail not connected" in response.text

            print(f"✓ New scan correctly falls through to Gmail check when no resumable run")

        finally:
            pass  # No cleanup needed


class TestStatusEndpointResumedRun:
    """Test that status endpoint returns correct data for resumed runs"""

    def test_status_returns_plan_info_for_resumed_run(self, auth_headers, mongo_client, test_run_id):
        """
        Status endpoint should return plan_info and already_on_board for resumed runs (regression)
        """
        run_id = f"{test_run_id}_status_resumed"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        suggestions = [
            {
                "school_id": "Stanford University",  # Already on board
                "normalized_domain": "stanford.edu",
                "confidence": 95,
                "proposed_stage": "outreach",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_STATUS_NewSchool",  # NOT on board
                "normalized_domain": "teststatus.edu",
                "confidence": 88,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 80,
            "schools_found": 2,
            "schools_high_confidence": 2,
            "suggestions": suggestions,
            "confirmed_school_ids": [],
        })

        try:
            # First verify resume works
            start_response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )
            assert start_response.status_code == 200
            assert start_response.json().get("resumed") == True

            # Now call status endpoint
            status_response = requests.get(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/status",
                headers=auth_headers
            )

            assert status_response.status_code == 200, f"Status failed: {status_response.text}"
            data = status_response.json()

            # Verify plan_info
            assert "plan_info" in data, "plan_info should be in response"
            plan_info = data["plan_info"]
            assert "tier" in plan_info
            assert "max_schools" in plan_info
            assert "current_count" in plan_info
            assert "remaining_slots" in plan_info

            # Verify already_on_board marking
            assert "suggestions" in data
            stanford = next((s for s in data["suggestions"] if s.get("school_id") == "Stanford University"), None)
            assert stanford is not None
            assert stanford.get("already_on_board") == True, "Stanford should be marked as already_on_board"

            new_school = next((s for s in data["suggestions"] if "TEST_STATUS" in s.get("school_id", "")), None)
            assert new_school is not None
            assert new_school.get("already_on_board") == False, "New school should NOT be marked as already_on_board"

            print(f"✓ Status endpoint returns correct plan_info and already_on_board for resumed run")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestIgnoredSuggestionsExcluded:
    """Test that ignored suggestions are excluded from resume check"""

    def test_ignored_suggestions_excluded_from_resume(self, auth_headers, mongo_client, test_run_id):
        """
        Suggestions with ignored=True should be excluded from the resume check
        """
        run_id = f"{test_run_id}_ignored"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        suggestions = [
            {
                "school_id": "TEST_IGNORED_School",
                "normalized_domain": "testignored.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": True,  # Ignored
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 50,
            "schools_found": 1,
            "schools_high_confidence": 1,
            "suggestions": suggestions,
            "confirmed_school_ids": [],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            # All suggestions are ignored, so no resume - should fall through to Gmail check
            assert response.status_code == 403, f"Expected 403 (no remaining suggestions), got {response.status_code}: {response.text}"

            print(f"✓ Ignored suggestions correctly excluded from resume check")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestResumeMixedScenario:
    """Test resume with a realistic mix of suggestions"""

    def test_resume_mixed_suggestions(self, auth_headers, mongo_client, test_run_id):
        """
        Test with a mix of:
        - Already on board (excluded)
        - Already confirmed (excluded)
        - Ignored (excluded)
        - One remaining (should resume)
        """
        run_id = f"{test_run_id}_mixed"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        suggestions = [
            {
                "school_id": "Stanford University",  # On board - excluded
                "normalized_domain": "stanford.edu",
                "confidence": 95,
                "proposed_stage": "outreach",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_MIXED_Confirmed",  # Confirmed - excluded
                "normalized_domain": "testconfirmed.edu",
                "confidence": 88,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
            {
                "school_id": "TEST_MIXED_Ignored",  # Ignored - excluded
                "normalized_domain": "testignored.edu",
                "confidence": 85,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": True,
            },
            {
                "school_id": "TEST_MIXED_Remaining",  # Should trigger resume
                "normalized_domain": "testremaining.edu",
                "confidence": 82,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match",
                "ignored": False,
            },
        ]

        mongo_client.import_runs.insert_one({
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 4,
            "schools_high_confidence": 4,
            "suggestions": suggestions,
            "confirmed_school_ids": ["TEST_MIXED_Confirmed"],  # One already confirmed
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history",
                headers=auth_headers
            )

            assert response.status_code == 200, f"Start import failed: {response.text}"
            data = response.json()

            # Should resume because TEST_MIXED_Remaining is not excluded
            assert data.get("resumed") == True, f"Expected resumed=true, got {data}"
            assert data["run_id"] == run_id

            print(f"✓ Resume correctly works with mixed scenario (1 remaining): {data}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
