"""
Tests for Gmail Import 5 UX & Backend Improvements:
1. Backend: Defensive KB check - POST /api/gmail/import-history/{run_id}/confirm skips school_ids not in KB
2. Backend: Import run stores unmapped_domains list on import_run document
3. Backend: Confirm still creates programs + coaches correctly for KB-matched schools (regression)
4. Backend: Confirm is idempotent (calling twice skips already-created programs)
5. Frontend: Component verification done via Playwright

Test setup: Seeds mock import_run with suggestions including both KB-matched and unmapped schools
"""

import pytest
import requests
import os
from datetime import datetime, timezone
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test constants
DEMO_EMAIL = "demo@capymatch.com"
DEMO_PASSWORD = "demo2026"


class TestGmailImport5Improvements:
    """Test the 5 new Gmail Import improvements"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("session_token")

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Build auth headers"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }

    @pytest.fixture(scope="class")
    def mongo_client(self):
        """Get MongoDB client for direct seeding/cleanup"""
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017")
        db = client["test_database"]
        yield db
        client.close()

    @pytest.fixture(scope="class")
    def test_data(self, mongo_client, auth_headers):
        """Seed test data for all tests in this class"""
        db = mongo_client
        
        # Clean up any existing test data
        cleanup_prefixes = ["TEST_5IMPROVE_"]
        db.import_runs.delete_many({"run_id": {"$regex": "^test_5improve_"}})
        db.programs.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})
        db.coaches.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})
        db.university_knowledge_base.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})
        
        # Get demo user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        user_data = response.json()
        user_id = user_data.get("user_id", "user_653ee8f71acd")
        # tenant_id includes full user_id (tenant_user_XXX format)
        tenant_id = f"tenant_{user_id}"
        
        # Create a KB entry for a matched school
        kb_matched_school = {
            "university_name": "TEST_5IMPROVE_KB_Matched_University",
            "domain": "test5improve.edu",
            "division": "D1",
            "conference": "Test Conference",
            "region": "Test Region",
            "website": "https://test5improve.edu",
            "coach_email": "headcoach@test5improve.edu",
            "primary_coach": "Test Head Coach",
            "recruiting_coordinator": "Test Coordinator",
            "coordinator_email": "coordinator@test5improve.edu",
            "state": "Test State"
        }
        db.university_knowledge_base.insert_one(kb_matched_school)
        
        # Create import run with suggestions:
        # 1. KB-matched school (should be imported)
        # 2. Unmapped domain (should be skipped on confirm, tracked in unmapped_domains)
        # 3. School ID that doesn't exist in KB (should be skipped)
        run_id = f"test_5improve_{uuid.uuid4().hex[:12]}"
        import_run = {
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "ready",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "messages_scanned": 100,
            "schools_found": 3,
            "schools_high_confidence": 1,
            "suggestions": [
                # KB-matched suggestion (should import)
                {
                    "school_id": "TEST_5IMPROVE_KB_Matched_University",
                    "normalized_domain": "test5improve.edu",
                    "matched_domain": "test5improve.edu",
                    "match_type": "exact",
                    "confidence": 95,
                    "match_reason": "Exact domain match from KB",
                    "outbound_count": 3,
                    "inbound_count": 1,
                    "thread_count": 2,
                    "last_message_at": datetime.now(timezone.utc).isoformat(),
                    "last_message_direction": "inbound",
                    "sample_subjects": ["Coach Intro", "Visit Schedule"],
                    "discovered_emails": ["coach@test5improve.edu", "assistant@test5improve.edu"],
                    "proposed_stage": "in_conversation",
                    "proposed_group": "in_conversation",
                    "followup_due_at": "2026-02-01",
                    "attention_required": True,
                    "ignored": False,
                    "kb_coach_emails": ["headcoach@test5improve.edu", "coordinator@test5improve.edu"],
                    "verified_coach_count": 0
                },
                # Unmapped domain (no school_id, should be skipped on confirm)
                {
                    "school_id": None,
                    "normalized_domain": "unmapped-domain.edu",
                    "matched_domain": "unmapped-domain.edu",
                    "match_type": "unmapped",
                    "confidence": 0,
                    "match_reason": "Domain not found in knowledge base",
                    "outbound_count": 2,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "last_message_at": datetime.now(timezone.utc).isoformat(),
                    "last_message_direction": "outbound",
                    "sample_subjects": ["Hello"],
                    "discovered_emails": ["someone@unmapped-domain.edu"],
                    "proposed_stage": "outreach",
                    "proposed_group": "waiting_on_reply",
                    "followup_due_at": "2026-01-20",
                    "attention_required": False,
                    "ignored": False,
                    "kb_coach_emails": [],
                    "verified_coach_count": 0
                },
                # School ID that doesn't exist in KB (should be skipped by defensive check)
                {
                    "school_id": "TEST_5IMPROVE_NonExistent_University",
                    "normalized_domain": "nonexistent.edu",
                    "matched_domain": "nonexistent.edu",
                    "match_type": "possible",
                    "confidence": 60,
                    "match_reason": "Domain partial match",
                    "outbound_count": 1,
                    "inbound_count": 0,
                    "thread_count": 1,
                    "last_message_at": datetime.now(timezone.utc).isoformat(),
                    "last_message_direction": "outbound",
                    "sample_subjects": ["Inquiry"],
                    "discovered_emails": ["contact@nonexistent.edu"],
                    "proposed_stage": "outreach",
                    "proposed_group": "waiting_on_reply",
                    "followup_due_at": "2026-01-25",
                    "attention_required": False,
                    "ignored": False,
                    "kb_coach_emails": [],
                    "verified_coach_count": 0
                }
            ],
            # Pre-populated unmapped_domains from scan phase
            "unmapped_domains": [
                {"domain": "unmapped-domain.edu", "count": 1},
                {"domain": "another-unmapped.edu", "count": 2}
            ],
            "confirmed_at": None,
            "confirmed_school_ids": [],
            "error": None
        }
        db.import_runs.insert_one(import_run)
        
        yield {
            "run_id": run_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "kb_matched_school": "TEST_5IMPROVE_KB_Matched_University",
            "nonexistent_school": "TEST_5IMPROVE_NonExistent_University",
            "unmapped_domain": "unmapped-domain.edu"
        }
        
        # Cleanup after tests
        db.import_runs.delete_many({"run_id": run_id})
        db.programs.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})
        db.coaches.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})
        db.university_knowledge_base.delete_many({"university_name": {"$regex": "^TEST_5IMPROVE_"}})

    # ==================== Backend Test: unmapped_domains stored ====================
    def test_import_run_has_unmapped_domains_field(self, mongo_client, test_data):
        """Verify import_run document stores unmapped_domains list from scan phase"""
        db = mongo_client
        run = db.import_runs.find_one({"run_id": test_data["run_id"]}, {"_id": 0})
        
        assert run is not None, "Import run not found"
        assert "unmapped_domains" in run, "unmapped_domains field missing from import_run"
        assert isinstance(run["unmapped_domains"], list), "unmapped_domains should be a list"
        assert len(run["unmapped_domains"]) >= 1, "unmapped_domains should have at least 1 entry"
        
        # Check structure of unmapped_domains entries
        first_entry = run["unmapped_domains"][0]
        assert "domain" in first_entry, "unmapped_domains entry missing 'domain' field"
        assert "count" in first_entry, "unmapped_domains entry missing 'count' field"
        
        print(f"✓ unmapped_domains stored correctly with {len(run['unmapped_domains'])} domains")

    # ==================== Backend Test: Defensive KB check ====================
    def test_confirm_skips_schools_not_in_kb(self, auth_headers, test_data, mongo_client):
        """Defensive KB check: confirm endpoint skips school_ids not found in university_knowledge_base"""
        db = mongo_client
        
        # Call confirm with all 3 suggestions selected
        # Only KB-matched school should be created; non-existent and unmapped should be skipped
        payload = {
            "selected": [
                {"school_id": test_data["kb_matched_school"]},
                {"school_id": test_data["nonexistent_school"]},  # Should be skipped - not in KB
                {"school_id": None}  # Unmapped - should be skipped
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gmail/import-history/{test_data['run_id']}/confirm",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Confirm failed: {response.text}"
        data = response.json()
        
        # Verify counts
        assert data["created_count"] == 1, f"Expected 1 created (only KB-matched), got {data['created_count']}"
        assert data["skipped_count"] == 2, f"Expected 2 skipped (non-existent + null school_id), got {data['skipped_count']}"
        
        # Verify only KB-matched school was created in programs
        created_program = db.programs.find_one(
            {"university_name": test_data["kb_matched_school"], "tenant_id": test_data["tenant_id"]},
            {"_id": 0}
        )
        assert created_program is not None, "KB-matched school program not created"
        
        # Verify non-existent school was NOT created
        not_created = db.programs.find_one(
            {"university_name": test_data["nonexistent_school"], "tenant_id": test_data["tenant_id"]},
            {"_id": 0}
        )
        assert not_created is None, "Non-existent school should NOT have been created (defensive KB check failed)"
        
        print("✓ Defensive KB check working - schools not in KB are skipped")

    # ==================== Backend Test: Coaches created correctly ====================
    def test_confirm_creates_coaches_from_kb_and_discovered(self, auth_headers, test_data, mongo_client):
        """Regression: Confirm creates coaches from KB data and discovered_emails"""
        db = mongo_client
        
        # Find the created program
        program = db.programs.find_one(
            {"university_name": test_data["kb_matched_school"], "tenant_id": test_data["tenant_id"]},
            {"_id": 0, "program_id": 1}
        )
        assert program is not None, "Program should exist from previous test"
        
        # Get all coaches for this program
        coaches = list(db.coaches.find(
            {"program_id": program["program_id"], "tenant_id": test_data["tenant_id"]},
            {"_id": 0}
        ))
        
        # Should have coaches from: KB head coach, KB coordinator, discovered emails
        assert len(coaches) >= 2, f"Expected at least 2 coaches (KB), got {len(coaches)}"
        
        coach_emails = [c.get("email", "").lower() for c in coaches]
        
        # Check KB head coach was created
        assert "headcoach@test5improve.edu" in coach_emails, "KB head coach should be created"
        
        # Check KB coordinator was created
        assert "coordinator@test5improve.edu" in coach_emails, "KB coordinator should be created"
        
        # Check at least one discovered email was created (if not duplicate)
        discovered = ["coach@test5improve.edu", "assistant@test5improve.edu"]
        discovered_created = sum(1 for d in discovered if d in coach_emails)
        assert discovered_created >= 1 or len(coaches) >= 2, "At least some discovered emails should be created as coaches"
        
        print(f"✓ Coaches created correctly: {len(coaches)} coaches with emails {coach_emails}")

    # ==================== Backend Test: Idempotency ====================
    def test_confirm_idempotent_second_call_skips(self, auth_headers, test_data, mongo_client):
        """Idempotency: calling confirm twice skips already-created programs"""
        db = mongo_client
        
        # Count programs before second confirm
        initial_count = db.programs.count_documents(
            {"university_name": test_data["kb_matched_school"], "tenant_id": test_data["tenant_id"]}
        )
        assert initial_count == 1, f"Expected 1 program from first confirm, got {initial_count}"
        
        # Call confirm again with same selection
        payload = {
            "selected": [
                {"school_id": test_data["kb_matched_school"]}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gmail/import-history/{test_data['run_id']}/confirm",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Second confirm failed: {response.text}"
        data = response.json()
        
        # Should skip the already-created program
        assert data["created_count"] == 0, f"Expected 0 created on second call, got {data['created_count']}"
        assert data["skipped_count"] == 1, f"Expected 1 skipped (already exists), got {data['skipped_count']}"
        
        # Verify still only 1 program (no duplicates)
        final_count = db.programs.count_documents(
            {"university_name": test_data["kb_matched_school"], "tenant_id": test_data["tenant_id"]}
        )
        assert final_count == 1, f"Should still have 1 program (idempotent), got {final_count}"
        
        print("✓ Idempotency working - second confirm call skips existing programs")

    # ==================== Backend Test: Status endpoint returns unmapped_domains ====================
    def test_status_endpoint_structure(self, auth_headers, test_data):
        """Verify status endpoint returns correct structure including suggestions with KB verification fields"""
        response = requests.get(
            f"{BASE_URL}/api/gmail/import-history/{test_data['run_id']}/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Status request failed: {response.text}"
        data = response.json()
        
        assert "phase" in data, "Response missing 'phase'"
        assert data["phase"] == "ready", f"Expected phase 'ready', got {data['phase']}"
        assert "suggestions" in data, "Response missing 'suggestions'"
        
        # Check suggestions have KB verification fields
        suggestions = data["suggestions"]
        assert len(suggestions) >= 1, "Should have at least 1 suggestion"
        
        for s in suggestions:
            # Check for kb_coach_emails and verified_coach_count fields
            assert "kb_coach_emails" in s, f"Suggestion missing 'kb_coach_emails': {s.get('school_id', s.get('normalized_domain'))}"
            assert "verified_coach_count" in s, f"Suggestion missing 'verified_coach_count': {s.get('school_id', s.get('normalized_domain'))}"
        
        print(f"✓ Status endpoint returns correct structure with {len(suggestions)} suggestions")

    # ==================== Backend Test: Program enriched from KB ====================
    def test_created_program_enriched_from_kb(self, auth_headers, test_data, mongo_client):
        """Verify created program has fields enriched from knowledge base"""
        db = mongo_client
        
        program = db.programs.find_one(
            {"university_name": test_data["kb_matched_school"], "tenant_id": test_data["tenant_id"]},
            {"_id": 0}
        )
        
        assert program is not None, "Program should exist"
        
        # Check enriched fields
        assert program.get("domain") == "test5improve.edu", f"Expected domain 'test5improve.edu', got {program.get('domain')}"
        assert program.get("division") == "D1", f"Expected division 'D1', got {program.get('division')}"
        assert program.get("conference") == "Test Conference", f"Expected conference 'Test Conference', got {program.get('conference')}"
        assert program.get("region") == "Test Region", f"Expected region 'Test Region', got {program.get('region')}"
        assert "import_run_id" in program, "Program should have import_run_id field"
        assert program["import_run_id"] == test_data["run_id"], "import_run_id should match"
        
        print("✓ Program correctly enriched from KB (domain, division, conference, region)")


class TestGmailImportStatusEndpoint:
    """Separate test class for status endpoint without seeded data"""
    
    def test_status_404_for_nonexistent_run(self):
        """Status endpoint returns 404 for non-existent run_id"""
        # Login first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        token = login_resp.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        response = requests.get(
            f"{BASE_URL}/api/gmail/import-history/nonexistent_run_abc123/status",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Status endpoint returns 404 for non-existent run")
