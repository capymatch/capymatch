"""
Tests for Gmail Import Duplicate Detection & Plan Limit Enforcement

Features tested:
1. Status endpoint marks existing programs as already_on_board=true
2. Status endpoint returns plan_info with tier, max_schools, current_count, remaining_slots
3. Confirm endpoint enforces plan limits (skips schools when plan is full)
4. Idempotency still works (duplicate programs are skipped)
5. Schools within plan limit are still imported correctly
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
    """Generate unique test run ID"""
    return f"test_dup_plan_{uuid.uuid4().hex[:8]}"

@pytest.fixture(scope="module")
def mongo_client():
    """Create MongoDB connection"""
    import pymongo
    client = pymongo.MongoClient("mongodb://localhost:27017")
    return client["test_database"]


class TestStatusEndpointDuplicateDetection:
    """Test that status endpoint marks existing programs as already_on_board"""

    def test_status_marks_duplicates(self, auth_headers, mongo_client, test_run_id):
        """Status endpoint should mark programs already on board as already_on_board=true"""
        run_id = f"{test_run_id}_dup"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Create import_run with suggestions including schools already on board
        # Demo user has: Stanford University, UCLA, Penn State, University of Texas, etc.
        suggestions = [
            {
                "school_id": "Stanford University",  # Already on board
                "normalized_domain": "stanford.edu",
                "confidence": 95,
                "proposed_stage": "outreach",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "match_reason": "Domain match to KB",
                "ignored": False,
            },
            {
                "school_id": "UCLA",  # Already on board
                "normalized_domain": "ucla.edu",
                "confidence": 90,
                "proposed_stage": "in_conversation",
                "outbound_count": 2,
                "inbound_count": 2,
                "thread_count": 3,
                "match_reason": "Domain match to KB",
                "ignored": False,
            },
            {
                "school_id": "TEST_NEW_University_DupTest",  # New school (should be importable)
                "normalized_domain": "testnew.edu",
                "confidence": 85,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Domain match to KB",
                "ignored": False,
            },
        ]

        # Insert test import_run
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
        })

        # Add KB entry for test school
        mongo_client.university_knowledge_base.insert_one({
            "university_name": "TEST_NEW_University_DupTest",
            "domain": "testnew.edu",
            "division": "D1",
            "conference": "Test Conference",
            "region": "Test Region",
        })

        try:
            # Call status endpoint
            response = requests.get(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Status failed: {response.text}"
            data = response.json()

            # Verify phase is ready
            assert data["phase"] == "ready"

            # Verify suggestions are returned
            assert "suggestions" in data
            suggestions_result = data["suggestions"]
            assert len(suggestions_result) == 3

            # Check that existing schools are marked as already_on_board
            stanford = next((s for s in suggestions_result if s.get("school_id") == "Stanford University"), None)
            assert stanford is not None, "Stanford should be in suggestions"
            assert stanford.get("already_on_board") == True, "Stanford should be marked as already_on_board"

            ucla = next((s for s in suggestions_result if s.get("school_id") == "UCLA"), None)
            assert ucla is not None, "UCLA should be in suggestions"
            assert ucla.get("already_on_board") == True, "UCLA should be marked as already_on_board"

            # Check that new school is NOT marked as already_on_board
            new_school = next((s for s in suggestions_result if "TEST_NEW" in s.get("school_id", "")), None)
            assert new_school is not None, "New test school should be in suggestions"
            assert new_school.get("already_on_board") == False, "New school should NOT be marked as already_on_board"

            print("✓ Status endpoint correctly marks duplicates with already_on_board=true")

        finally:
            # Cleanup
            mongo_client.import_runs.delete_one({"run_id": run_id})
            mongo_client.university_knowledge_base.delete_many({"university_name": {"$regex": "^TEST_"}})


class TestStatusEndpointPlanInfo:
    """Test that status endpoint returns plan_info"""

    def test_status_returns_plan_info_for_premium(self, auth_headers, mongo_client, test_run_id):
        """Status endpoint should return plan_info with tier, max_schools, current_count, remaining_slots"""
        run_id = f"{test_run_id}_plan_premium"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Create minimal import_run
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
            "suggestions": [
                {
                    "school_id": "Test School Plan",
                    "normalized_domain": "testplan.edu",
                    "confidence": 90,
                    "proposed_stage": "added",
                    "outbound_count": 1,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "match_reason": "Test",
                    "ignored": False,
                }
            ],
        })

        try:
            response = requests.get(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Status failed: {response.text}"
            data = response.json()

            # Verify plan_info is returned
            assert "plan_info" in data, "plan_info should be in response"
            plan_info = data["plan_info"]

            # Verify plan_info structure
            assert "tier" in plan_info, "plan_info should have tier"
            assert "max_schools" in plan_info, "plan_info should have max_schools"
            assert "current_count" in plan_info, "plan_info should have current_count"
            assert "remaining_slots" in plan_info, "plan_info should have remaining_slots"

            # Demo user is on premium
            assert plan_info["tier"] == "premium", f"Expected premium tier, got {plan_info['tier']}"
            assert plan_info["max_schools"] == -1, f"Premium should have unlimited (-1) max_schools, got {plan_info['max_schools']}"
            assert plan_info["remaining_slots"] == -1, f"Premium should have unlimited (-1) remaining_slots, got {plan_info['remaining_slots']}"
            assert plan_info["current_count"] >= 0, "current_count should be a non-negative number"

            print(f"✓ Plan info returned correctly: {plan_info}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})

    def test_status_returns_plan_info_for_basic(self, auth_headers, mongo_client, test_run_id):
        """Test plan_info for basic tier (after temporarily changing tenant plan)"""
        run_id = f"{test_run_id}_plan_basic"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Save original plan
        original_tenant = mongo_client.tenants.find_one({"tenant_id": tenant_id})
        original_plan = original_tenant.get("plan", "premium")

        # Temporarily set to basic plan
        mongo_client.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"plan": "basic"}}
        )

        # Create minimal import_run
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
            "suggestions": [
                {
                    "school_id": "Test School Basic",
                    "normalized_domain": "testbasic.edu",
                    "confidence": 90,
                    "proposed_stage": "added",
                    "outbound_count": 1,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "match_reason": "Test",
                    "ignored": False,
                }
            ],
        })

        try:
            response = requests.get(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Status failed: {response.text}"
            data = response.json()

            plan_info = data["plan_info"]

            # Basic tier should show limits
            assert plan_info["tier"] == "basic", f"Expected basic tier, got {plan_info['tier']}"
            assert plan_info["max_schools"] == 5, f"Basic should have max_schools=5, got {plan_info['max_schools']}"
            
            # Demo user has 10 programs, so with basic (max 5), remaining should be 0
            assert plan_info["current_count"] == 10, f"Expected 10 current programs, got {plan_info['current_count']}"
            assert plan_info["remaining_slots"] == 0, f"With 10 programs and max 5, remaining should be 0, got {plan_info['remaining_slots']}"

            print(f"✓ Basic plan info shows correct limits: {plan_info}")

        finally:
            # Restore original plan
            mongo_client.tenants.update_one(
                {"tenant_id": tenant_id},
                {"$set": {"plan": original_plan}}
            )
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestConfirmEndpointPlanLimitEnforcement:
    """Test that confirm endpoint enforces plan limits"""

    def test_confirm_skips_when_plan_full(self, auth_headers, mongo_client, test_run_id):
        """Confirm should skip schools when plan limit is reached"""
        run_id = f"{test_run_id}_confirm_limit"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Save original plan
        original_tenant = mongo_client.tenants.find_one({"tenant_id": tenant_id})
        original_plan = original_tenant.get("plan", "premium")

        # Set to basic plan (max 5 schools)
        mongo_client.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"plan": "basic"}}
        )

        # Add KB entries for test schools
        test_schools = [
            "TEST_LIMIT_School_A",
            "TEST_LIMIT_School_B",
            "TEST_LIMIT_School_C",
        ]
        for school in test_schools:
            mongo_client.university_knowledge_base.insert_one({
                "university_name": school,
                "domain": f"{school.lower().replace('_', '')}.edu",
                "division": "D1",
                "conference": "Test",
            })

        # Create import_run with suggestions
        suggestions = [
            {
                "school_id": school,
                "normalized_domain": f"{school.lower().replace('_', '')}.edu",
                "confidence": 90,
                "proposed_stage": "added",
                "outbound_count": 1,
                "inbound_count": 0,
                "thread_count": 1,
                "match_reason": "Test",
                "ignored": False,
            }
            for school in test_schools
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
        })

        try:
            # Try to confirm all 3 schools (but plan is full - 10 existing, max 5)
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/confirm",
                headers=auth_headers,
                json={"selected": [{"school_id": school} for school in test_schools]}
            )
            
            assert response.status_code == 200, f"Confirm failed: {response.text}"
            data = response.json()

            # All should be skipped due to plan limit (10 existing > 5 max)
            assert data["created_count"] == 0, f"Expected 0 created (plan full), got {data['created_count']}"
            assert data["skipped_count"] == 3, f"Expected 3 skipped (plan limit), got {data['skipped_count']}"

            # Verify skip_reasons.plan_limit was incremented
            run = mongo_client.import_runs.find_one({"run_id": run_id})
            confirm_analytics = run.get("confirm_analytics", {})
            skip_reasons = confirm_analytics.get("skip_reasons", {})
            assert skip_reasons.get("plan_limit", 0) == 3, f"Expected plan_limit=3 in skip_reasons, got {skip_reasons}"

            print(f"✓ Confirm correctly skipped all 3 schools due to plan limit: {data}")

        finally:
            # Restore original plan
            mongo_client.tenants.update_one(
                {"tenant_id": tenant_id},
                {"$set": {"plan": original_plan}}
            )
            # Cleanup
            mongo_client.import_runs.delete_one({"run_id": run_id})
            mongo_client.university_knowledge_base.delete_many({"university_name": {"$regex": "^TEST_LIMIT_"}})
            mongo_client.programs.delete_many({"university_name": {"$regex": "^TEST_LIMIT_"}})

    def test_confirm_works_within_plan_limit(self, auth_headers, mongo_client, test_run_id):
        """Confirm should work for schools within plan limit (regression test)"""
        run_id = f"{test_run_id}_confirm_ok"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Ensure premium plan (unlimited)
        original_tenant = mongo_client.tenants.find_one({"tenant_id": tenant_id})
        original_plan = original_tenant.get("plan", "premium")
        
        mongo_client.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"plan": "premium"}}
        )

        # Add KB entry for test school
        test_school = "TEST_CONFIRM_OK_University"
        mongo_client.university_knowledge_base.insert_one({
            "university_name": test_school,
            "domain": "testconfirmok.edu",
            "division": "D1",
            "conference": "Test Conf",
            "region": "Test Region",
            "coach_email": "coach@testconfirmok.edu",
            "primary_coach": "Test Coach",
        })

        # Create import_run
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
            "suggestions": [
                {
                    "school_id": test_school,
                    "normalized_domain": "testconfirmok.edu",
                    "confidence": 95,
                    "proposed_stage": "added",
                    "outbound_count": 1,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "match_reason": "Domain match",
                    "ignored": False,
                }
            ],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/confirm",
                headers=auth_headers,
                json={"selected": [{"school_id": test_school}]}
            )
            
            assert response.status_code == 200, f"Confirm failed: {response.text}"
            data = response.json()

            assert data["created_count"] == 1, f"Expected 1 created, got {data['created_count']}"
            assert data["skipped_count"] == 0, f"Expected 0 skipped, got {data['skipped_count']}"

            # Verify program was actually created
            program = mongo_client.programs.find_one({
                "tenant_id": tenant_id,
                "university_name": test_school
            })
            assert program is not None, "Program should have been created"
            assert program["division"] == "D1", "Program should have KB data"

            print(f"✓ Confirm worked correctly for premium user: {data}")

        finally:
            # Restore plan
            mongo_client.tenants.update_one(
                {"tenant_id": tenant_id},
                {"$set": {"plan": original_plan}}
            )
            # Cleanup
            mongo_client.import_runs.delete_one({"run_id": run_id})
            mongo_client.programs.delete_many({"university_name": test_school})
            mongo_client.university_knowledge_base.delete_many({"university_name": test_school})
            mongo_client.coaches.delete_many({"university_name": test_school})


class TestConfirmIdempotency:
    """Test that confirm still skips duplicate programs (regression)"""

    def test_confirm_skips_existing_programs(self, auth_headers, mongo_client, test_run_id):
        """Confirm should skip programs that already exist on board (idempotency)"""
        run_id = f"{test_run_id}_idemp"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Demo user already has Stanford University on their board
        # Create import_run with Stanford as suggestion
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
            "suggestions": [
                {
                    "school_id": "Stanford University",  # Already exists
                    "normalized_domain": "stanford.edu",
                    "confidence": 95,
                    "proposed_stage": "outreach",
                    "outbound_count": 3,
                    "inbound_count": 1,
                    "thread_count": 2,
                    "match_reason": "Domain match",
                    "ignored": False,
                }
            ],
        })

        try:
            response = requests.post(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/confirm",
                headers=auth_headers,
                json={"selected": [{"school_id": "Stanford University"}]}
            )
            
            assert response.status_code == 200, f"Confirm failed: {response.text}"
            data = response.json()

            # Should skip since Stanford already exists
            assert data["created_count"] == 0, f"Expected 0 created (already exists), got {data['created_count']}"
            assert data["skipped_count"] == 1, f"Expected 1 skipped (already exists), got {data['skipped_count']}"

            # Verify skip_reasons.already_exists was incremented
            run = mongo_client.import_runs.find_one({"run_id": run_id})
            confirm_analytics = run.get("confirm_analytics", {})
            skip_reasons = confirm_analytics.get("skip_reasons", {})
            assert skip_reasons.get("already_exists", 0) == 1, f"Expected already_exists=1 in skip_reasons, got {skip_reasons}"

            print(f"✓ Confirm correctly skipped existing program: {data}")

        finally:
            mongo_client.import_runs.delete_one({"run_id": run_id})


class TestProPlanRemainingSlots:
    """Test that pro plan (max 25 schools) shows correct remaining slots"""

    def test_pro_plan_remaining_slots(self, auth_headers, mongo_client, test_run_id):
        """Pro plan should show remaining_slots = max(0, 25 - current_count)"""
        run_id = f"{test_run_id}_pro_slots"
        tenant_id = "tenant_user_653ee8f71acd"
        user_id = "user_653ee8f71acd"

        # Save original plan
        original_tenant = mongo_client.tenants.find_one({"tenant_id": tenant_id})
        original_plan = original_tenant.get("plan", "premium")

        # Set to pro plan (max 25 schools)
        mongo_client.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"plan": "pro"}}
        )

        # Create import_run
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
            "suggestions": [
                {
                    "school_id": "Test Pro School",
                    "normalized_domain": "testpro.edu",
                    "confidence": 90,
                    "proposed_stage": "added",
                    "outbound_count": 1,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "match_reason": "Test",
                    "ignored": False,
                }
            ],
        })

        try:
            response = requests.get(
                f"{BASE_URL}/api/gmail/import-history/{run_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Status failed: {response.text}"
            data = response.json()

            plan_info = data["plan_info"]

            # Pro tier checks
            assert plan_info["tier"] == "pro", f"Expected pro tier, got {plan_info['tier']}"
            assert plan_info["max_schools"] == 25, f"Pro should have max_schools=25, got {plan_info['max_schools']}"
            
            # Demo user has 10 programs, so remaining = 25 - 10 = 15
            assert plan_info["current_count"] == 10, f"Expected 10 current programs, got {plan_info['current_count']}"
            assert plan_info["remaining_slots"] == 15, f"With 10 programs and max 25, remaining should be 15, got {plan_info['remaining_slots']}"

            print(f"✓ Pro plan shows correct remaining slots: {plan_info}")

        finally:
            # Restore original plan
            mongo_client.tenants.update_one(
                {"tenant_id": tenant_id},
                {"$set": {"plan": original_plan}}
            )
            mongo_client.import_runs.delete_one({"run_id": run_id})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
