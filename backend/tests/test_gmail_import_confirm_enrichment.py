"""
Gmail History Import - Confirm Endpoint Enrichment Tests (Iteration 103)

Tests the NEW enrichment logic added to the confirm endpoint:
1. Program created WITH 'domain' field from KB
2. Auto-creates coach entries from KB (primary_coach + recruiting_coordinator)
3. Auto-creates coach entries from discovered_emails in suggestion
4. Coach deduplication - emails in both KB and discovered should only create one coach entry
5. Idempotent - calling confirm twice should skip already-created programs
6. GET /api/programs/{program_id} returns correct data (domain, coaches, journey_rail)
7. GET /api/programs/{program_id}/journey returns timeline data

Setup:
- Seeds KB entry with domain, primary_coach, coach_email, recruiting_coordinator, coordinator_email
- Creates mock import_run in 'ready' status with suggestions including discovered_emails
- Uses demo user credentials (tenant_id: tenant_demo123, user_id: user_653ee8f71acd)
"""
import pytest
import requests
import os
from datetime import datetime, timezone
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Test constants - demo user's actual tenant_id is None, which defaults to "tenant_public_default"
DEMO_TENANT_ID = "tenant_public_default"
DEMO_USER_ID = "user_653ee8f71acd"
TEST_UNIVERSITY_NAME = "TEST_Import_Enrich_University"
TEST_DOMAIN = "testimportenrich.edu"
TEST_KB_COACH_EMAIL = "headcoach@testimportenrich.edu"
TEST_KB_COORDINATOR_EMAIL = "recruiting@testimportenrich.edu"
TEST_DISCOVERED_EMAIL_1 = "assistcoach@testimportenrich.edu"
TEST_DISCOVERED_EMAIL_2 = "headcoach@testimportenrich.edu"  # Duplicate of KB to test dedup
TEST_DISCOVERED_EMAIL_3 = "jsmith@testimportenrich.edu"
TEST_RUN_ID = "import_test_enrich_103"


@pytest.fixture(scope="module")
def mongo_client():
    """MongoDB client for direct DB operations"""
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def auth_session():
    """Authenticated session as demo user"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@capymatch.com", "password": "demo2026"}
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    token = login_response.json().get("session_token")
    assert token, "No session_token in login response"
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    yield session
    session.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_data(mongo_client):
    """
    Setup:
    1. Seed KB entry with domain, primary_coach, coach_email, recruiting_coordinator, coordinator_email
    2. Create mock import_run in 'ready' status with suggestions including discovered_emails
    
    Cleanup after all tests.
    """
    db = mongo_client
    
    # ═══ SETUP ═══
    
    # 1. Seed KB entry
    kb_doc = {
        "university_name": TEST_UNIVERSITY_NAME,
        "domain": TEST_DOMAIN,
        "division": "D1",
        "conference": "Test Conference",
        "region": "Northeast",
        "website": f"https://{TEST_DOMAIN}",
        "primary_coach": "Test Head Coach",
        "coach_email": TEST_KB_COACH_EMAIL,
        "recruiting_coordinator": "Test Coordinator",
        "coordinator_email": TEST_KB_COORDINATOR_EMAIL,
        "state": "TS",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.university_knowledge_base.delete_one({"university_name": TEST_UNIVERSITY_NAME})
    db.university_knowledge_base.insert_one(kb_doc)
    
    # 2. Create mock import_run in 'ready' status
    # discovered_emails includes one duplicate of KB coach_email to test deduplication
    import_run_doc = {
        "run_id": TEST_RUN_ID,
        "user_id": DEMO_USER_ID,
        "tenant_id": DEMO_TENANT_ID,
        "status": "ready",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "messages_scanned": 100,
        "schools_found": 1,
        "schools_high_confidence": 1,
        "suggestions": [
            {
                "school_id": TEST_UNIVERSITY_NAME,
                "normalized_domain": TEST_DOMAIN,
                "matched_domain": TEST_DOMAIN,
                "match_type": "exact",
                "confidence": 95,
                "match_reason": "Exact domain match via KB",
                "outbound_count": 3,
                "inbound_count": 1,
                "thread_count": 2,
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "last_message_direction": "inbound",
                "sample_subjects": ["RE: Recruiting Inquiry", "Camp Registration"],
                "discovered_emails": [
                    TEST_DISCOVERED_EMAIL_1,  # New coach
                    TEST_DISCOVERED_EMAIL_2,  # Duplicate of KB coach_email
                    TEST_DISCOVERED_EMAIL_3,  # Another new coach
                ],
                "proposed_stage": "in_conversation",
                "proposed_group": "in_conversation",
                "followup_due_at": "2026-01-20",
                "attention_required": True,
                "ignored": False,
            }
        ],
        "confirmed_at": None,
        "confirmed_school_ids": [],
        "error": None,
    }
    db.import_runs.delete_one({"run_id": TEST_RUN_ID})
    db.import_runs.insert_one(import_run_doc)
    
    yield
    
    # ═══ CLEANUP ═══
    # Clean up all test data
    db.university_knowledge_base.delete_one({"university_name": TEST_UNIVERSITY_NAME})
    db.import_runs.delete_one({"run_id": TEST_RUN_ID})
    db.programs.delete_many({"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID})
    db.coaches.delete_many({"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID})
    print(f"\n[CLEANUP] Removed test data for {TEST_UNIVERSITY_NAME}")


class TestConfirmEndpointEnrichment:
    """Tests for confirm endpoint enrichment logic"""
    
    def test_1_confirm_import_creates_program_with_domain(self, auth_session, mongo_client):
        """
        Test that POST /api/gmail/import-history/{run_id}/confirm:
        - Creates a program with 'domain' field populated from KB
        """
        # Call confirm endpoint
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/import-history/{TEST_RUN_ID}/confirm",
            json={"selected": [{"school_id": TEST_UNIVERSITY_NAME}]}
        )
        
        assert response.status_code == 200, f"Confirm failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Should have created 1 program
        assert data.get("created_count") == 1, f"Expected 1 created, got {data}"
        assert data.get("skipped_count") == 0, f"Expected 0 skipped, got {data}"
        
        # Verify program in DB has domain field
        db = mongo_client
        program = db.programs.find_one(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID},
            {"_id": 0}
        )
        
        assert program is not None, "Program not found in database"
        assert program.get("domain") == TEST_DOMAIN, f"Expected domain={TEST_DOMAIN}, got {program.get('domain')}"
        
        # Store program_id for subsequent tests
        pytest.test_program_id = program.get("program_id")
        print(f"\n[PASS] Program created with domain={TEST_DOMAIN}, program_id={pytest.test_program_id}")
    
    def test_2_confirm_creates_coaches_from_kb(self, mongo_client):
        """
        Verify coaches are created from KB data:
        - primary_coach (Head Coach role)
        - recruiting_coordinator (Recruiting Coordinator role)
        """
        db = mongo_client
        coaches = list(db.coaches.find(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID},
            {"_id": 0}
        ))
        
        # Find coaches by email
        coach_emails = {c.get("email"): c for c in coaches}
        
        # Check KB head coach was created
        assert TEST_KB_COACH_EMAIL in coach_emails, f"KB head coach email {TEST_KB_COACH_EMAIL} not found"
        head_coach = coach_emails[TEST_KB_COACH_EMAIL]
        assert head_coach.get("role") == "Head Coach", f"Expected Head Coach role, got {head_coach.get('role')}"
        assert head_coach.get("coach_name") == "Test Head Coach", f"Wrong coach name: {head_coach.get('coach_name')}"
        assert "Auto-added from school database" in head_coach.get("notes", "")
        
        # Check KB coordinator was created
        assert TEST_KB_COORDINATOR_EMAIL in coach_emails, f"KB coordinator email {TEST_KB_COORDINATOR_EMAIL} not found"
        coordinator = coach_emails[TEST_KB_COORDINATOR_EMAIL]
        assert coordinator.get("role") == "Recruiting Coordinator", f"Expected Recruiting Coordinator role, got {coordinator.get('role')}"
        assert coordinator.get("coach_name") == "Test Coordinator", f"Wrong coordinator name: {coordinator.get('coach_name')}"
        
        print(f"\n[PASS] KB coaches created: Head Coach and Recruiting Coordinator")
    
    def test_3_confirm_creates_coaches_from_discovered_emails(self, mongo_client):
        """
        Verify coaches are created from discovered_emails:
        - assistcoach@testimportenrich.edu (new)
        - jsmith@testimportenrich.edu (new)
        """
        db = mongo_client
        coaches = list(db.coaches.find(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID},
            {"_id": 0}
        ))
        
        coach_emails = {c.get("email"): c for c in coaches}
        
        # Check assistcoach was created
        assert TEST_DISCOVERED_EMAIL_1 in coach_emails, f"Discovered email {TEST_DISCOVERED_EMAIL_1} not found"
        assistcoach = coach_emails[TEST_DISCOVERED_EMAIL_1]
        assert assistcoach.get("role") == "Coach", f"Expected Coach role, got {assistcoach.get('role')}"
        assert "Discovered from Gmail history" in assistcoach.get("notes", "")
        
        # Check jsmith was created
        assert TEST_DISCOVERED_EMAIL_3 in coach_emails, f"Discovered email {TEST_DISCOVERED_EMAIL_3} not found"
        jsmith = coach_emails[TEST_DISCOVERED_EMAIL_3]
        assert jsmith.get("role") == "Coach", f"Expected Coach role, got {jsmith.get('role')}"
        # Check name was derived from email local part (jsmith -> Jsmith)
        assert jsmith.get("coach_name", "").lower() == "jsmith", f"Coach name should be derived from email: {jsmith.get('coach_name')}"
        
        print(f"\n[PASS] Discovered coaches created from Gmail scan")
    
    def test_4_coach_deduplication(self, mongo_client):
        """
        Verify deduplication works:
        - headcoach@testimportenrich.edu appears in both KB and discovered_emails
        - Should only have ONE coach entry with that email
        """
        db = mongo_client
        coaches = list(db.coaches.find(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID, "email": TEST_KB_COACH_EMAIL},
            {"_id": 0}
        ))
        
        assert len(coaches) == 1, f"Expected 1 coach with email {TEST_KB_COACH_EMAIL}, found {len(coaches)}"
        
        # Should be the KB version (Head Coach), not the discovered version (Coach)
        assert coaches[0].get("role") == "Head Coach", f"Deduped coach should be Head Coach role: {coaches[0]}"
        
        print(f"\n[PASS] Coach deduplication working - only 1 entry for duplicate email")
    
    def test_5_total_coach_count(self, mongo_client):
        """
        Verify total coach count:
        - KB: headcoach@... (1), recruiting@... (1) = 2
        - Discovered: assistcoach@... (1), headcoach@... (DEDUP), jsmith@... (1) = 2 (not 3)
        - Total: 4 coaches
        """
        db = mongo_client
        coach_count = db.coaches.count_documents(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID}
        )
        
        assert coach_count == 4, f"Expected 4 coaches (2 KB + 2 discovered after dedup), got {coach_count}"
        print(f"\n[PASS] Total coach count = {coach_count} (correct after deduplication)")
    
    def test_6_idempotency_confirm_again_skips(self, auth_session, mongo_client):
        """
        Test idempotency: Calling confirm twice should skip already-created program
        """
        # Reset the import_run status back to 'ready' to test idempotency
        db = mongo_client
        db.import_runs.update_one(
            {"run_id": TEST_RUN_ID},
            {"$set": {"status": "ready"}}
        )
        
        # Call confirm again with same school
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/import-history/{TEST_RUN_ID}/confirm",
            json={"selected": [{"school_id": TEST_UNIVERSITY_NAME}]}
        )
        
        assert response.status_code == 200, f"Second confirm failed: {response.text}"
        data = response.json()
        
        # Should have skipped (not created again)
        assert data.get("created_count") == 0, f"Expected 0 created on second call, got {data}"
        assert data.get("skipped_count") == 1, f"Expected 1 skipped on second call, got {data}"
        
        # Verify still only one program
        program_count = db.programs.count_documents(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID}
        )
        assert program_count == 1, f"Expected 1 program after second confirm, got {program_count}"
        
        print(f"\n[PASS] Idempotency working - second confirm skipped existing program")
    
    def test_7_get_program_returns_correct_data(self, auth_session):
        """
        GET /api/programs/{program_id} returns correct data for imported program:
        - domain field
        - coaches list
        - journey_rail computed
        """
        program_id = getattr(pytest, 'test_program_id', None)
        assert program_id, "No program_id from previous test"
        
        response = auth_session.get(f"{BASE_URL}/api/programs/{program_id}")
        
        assert response.status_code == 200, f"GET program failed: {response.text}"
        program = response.json()
        
        # Check domain
        assert program.get("domain") == TEST_DOMAIN, f"Expected domain={TEST_DOMAIN}, got {program.get('domain')}"
        
        # Check coaches included
        coaches = program.get("coaches", [])
        assert len(coaches) >= 4, f"Expected at least 4 coaches, got {len(coaches)}"
        coach_emails = [c.get("email") for c in coaches]
        assert TEST_KB_COACH_EMAIL in coach_emails, "KB head coach email not in coaches"
        assert TEST_KB_COORDINATOR_EMAIL in coach_emails, "KB coordinator email not in coaches"
        
        # Check journey_rail computed
        journey_rail = program.get("journey_rail", {})
        assert "stages" in journey_rail, "journey_rail.stages missing"
        assert "active" in journey_rail, "journey_rail.active missing"
        assert journey_rail.get("stages", {}).get("added") == True, "journey_rail.stages.added should be True"
        
        # Check import metadata
        assert program.get("import_run_id") == TEST_RUN_ID, "import_run_id not set"
        assert program.get("imported_at") is not None, "imported_at not set"
        
        print(f"\n[PASS] GET program returns complete data with domain, coaches, journey_rail")
    
    def test_8_get_journey_returns_timeline(self, auth_session):
        """
        GET /api/programs/{program_id}/journey returns timeline data
        """
        program_id = getattr(pytest, 'test_program_id', None)
        assert program_id, "No program_id from previous test"
        
        response = auth_session.get(f"{BASE_URL}/api/programs/{program_id}/journey")
        
        assert response.status_code == 200, f"GET journey failed: {response.text}"
        data = response.json()
        
        # Should have timeline array (may be empty if no Gmail connected, but structure should be correct)
        assert "timeline" in data, "Expected 'timeline' key in response"
        assert isinstance(data["timeline"], list), "timeline should be a list"
        
        print(f"\n[PASS] GET journey endpoint returns timeline structure")


class TestProgramFieldsFromKB:
    """Additional tests for program fields populated from KB"""
    
    def test_program_has_kb_enriched_fields(self, mongo_client):
        """Verify program has all KB-sourced fields"""
        db = mongo_client
        program = db.programs.find_one(
            {"university_name": TEST_UNIVERSITY_NAME, "tenant_id": DEMO_TENANT_ID},
            {"_id": 0}
        )
        
        assert program is not None, "Program not found"
        
        # These fields should come from KB
        assert program.get("division") == "D1", f"Division mismatch: {program.get('division')}"
        assert program.get("conference") == "Test Conference", f"Conference mismatch: {program.get('conference')}"
        assert program.get("region") == "Northeast", f"Region mismatch: {program.get('region')}"
        assert program.get("website") == f"https://{TEST_DOMAIN}", f"Website mismatch: {program.get('website')}"
        
        print(f"\n[PASS] Program enriched with all KB fields (division, conference, region, website)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
