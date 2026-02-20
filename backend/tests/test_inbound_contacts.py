"""
Test suite for Inbound Coach Contacts feature
- GET /api/inbound-contacts - List undismissed inbound contacts
- POST /api/inbound-contacts/scan-now - Manual scan trigger
- POST /api/inbound-contacts/{contact_id}/dismiss - Dismiss a contact
"""
import pytest
import requests
import os
from datetime import datetime, timezone
import pymongo

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "pro@test.com"
TEST_PASSWORD = "password"
TEST_TENANT_ID = "tenant_user_1d3910616536"

@pytest.fixture(scope="module")
def db_client():
    """Get MongoDB client for test data setup"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = pymongo.MongoClient(mongo_url)
    db = client["test_database"]
    yield db
    client.close()

@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session with cookie-based auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    
    return session


class TestInboundContactsAPI:
    """Tests for inbound contacts API endpoints"""
    
    def test_01_get_inbound_contacts_unauthenticated(self):
        """GET /api/inbound-contacts should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401")
    
    def test_02_get_inbound_contacts_authenticated(self, auth_session):
        """GET /api/inbound-contacts should return contacts list"""
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "contacts" in data, "Response should have 'contacts' field"
        assert "count" in data, "Response should have 'count' field"
        assert isinstance(data["contacts"], list), "contacts should be a list"
        assert data["count"] == len(data["contacts"]), "count should match contacts length"
        print(f"PASS: GET /api/inbound-contacts returns {data['count']} contacts")
    
    def test_03_post_scan_now_authenticated(self, auth_session):
        """POST /api/inbound-contacts/scan-now should trigger manual scan"""
        response = auth_session.post(f"{BASE_URL}/api/inbound-contacts/scan-now")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "new_schools_added" in data, "Response should have 'new_schools_added' field"
        assert "message" in data, "Response should have 'message' field"
        assert isinstance(data["new_schools_added"], int), "new_schools_added should be int"
        print(f"PASS: POST /api/inbound-contacts/scan-now returns: {data}")
    
    def test_04_insert_test_contact_and_retrieve(self, auth_session, db_client):
        """Insert a test contact and verify it appears in GET response"""
        # Clean up any existing test contact first
        db_client.inbound_contacts.delete_one({"contact_id": "ibc_pytest_001"})
        
        # Insert test contact
        test_contact = {
            "contact_id": "ibc_pytest_001",
            "tenant_id": TEST_TENANT_ID,
            "program_id": "prog_pytest_test",
            "university_name": "Stanford University",
            "coach_name": "Coach Johnson",
            "coach_email": "johnson@stanford.edu",
            "email_subject": "Interest in your recruiting",
            "gmail_message_id": "pytest_msg_001",
            "dismissed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db_client.inbound_contacts.insert_one(test_contact)
        
        # Verify it appears in GET response
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200
        
        data = response.json()
        contact_ids = [c["contact_id"] for c in data["contacts"]]
        assert "ibc_pytest_001" in contact_ids, "Test contact should appear in response"
        
        # Verify contact data structure
        test_contact_response = next(c for c in data["contacts"] if c["contact_id"] == "ibc_pytest_001")
        assert test_contact_response["university_name"] == "Stanford University"
        assert test_contact_response["coach_name"] == "Coach Johnson"
        assert test_contact_response["coach_email"] == "johnson@stanford.edu"
        assert test_contact_response["email_subject"] == "Interest in your recruiting"
        assert test_contact_response["dismissed"] == False
        print(f"PASS: Test contact inserted and retrieved successfully")
    
    def test_05_dismiss_contact(self, auth_session, db_client):
        """POST /api/inbound-contacts/{contact_id}/dismiss should mark contact as dismissed"""
        # Ensure test contact exists
        existing = db_client.inbound_contacts.find_one({"contact_id": "ibc_pytest_001"})
        if not existing:
            db_client.inbound_contacts.insert_one({
                "contact_id": "ibc_pytest_001",
                "tenant_id": TEST_TENANT_ID,
                "program_id": "prog_pytest_test",
                "university_name": "Stanford University",
                "coach_name": "Coach Johnson",
                "coach_email": "johnson@stanford.edu",
                "email_subject": "Interest in your recruiting",
                "gmail_message_id": "pytest_msg_001",
                "dismissed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            # Reset to not dismissed
            db_client.inbound_contacts.update_one(
                {"contact_id": "ibc_pytest_001"},
                {"$set": {"dismissed": False}}
            )
        
        # Dismiss the contact
        response = auth_session.post(f"{BASE_URL}/api/inbound-contacts/ibc_pytest_001/dismiss")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok: true"
        
        # Verify it's no longer in undismissed list
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200
        
        data = response.json()
        contact_ids = [c["contact_id"] for c in data["contacts"]]
        assert "ibc_pytest_001" not in contact_ids, "Dismissed contact should not appear"
        
        # Verify in database it's marked as dismissed
        contact = db_client.inbound_contacts.find_one({"contact_id": "ibc_pytest_001"})
        assert contact["dismissed"] == True, "Contact should be marked dismissed in DB"
        print("PASS: Contact dismissed successfully")
    
    def test_06_dismiss_nonexistent_contact(self, auth_session):
        """POST /api/inbound-contacts/{contact_id}/dismiss with invalid ID should still return 200"""
        response = auth_session.post(f"{BASE_URL}/api/inbound-contacts/nonexistent_id/dismiss")
        # The endpoint doesn't verify the contact exists, it just updates
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Dismiss nonexistent contact returns 200 (idempotent)")
    
    def test_07_scan_now_unauthenticated(self):
        """POST /api/inbound-contacts/scan-now should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/inbound-contacts/scan-now")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Scan-now unauthenticated returns 401")
    
    def test_08_dismiss_unauthenticated(self):
        """POST /api/inbound-contacts/{id}/dismiss should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/inbound-contacts/test_id/dismiss")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Dismiss unauthenticated returns 401")
    
    def test_09_cleanup_test_data(self, db_client):
        """Cleanup test data"""
        result = db_client.inbound_contacts.delete_many({"contact_id": {"$regex": "^ibc_pytest_"}})
        print(f"Cleaned up {result.deleted_count} test contacts")
        assert True


class TestInboundContactsIntegration:
    """Integration tests to verify the full flow"""
    
    def test_full_flow_create_retrieve_dismiss(self, auth_session, db_client):
        """Test complete flow: create -> retrieve -> dismiss -> verify removal"""
        contact_id = "ibc_flow_test_001"
        
        # 1. Clean any existing
        db_client.inbound_contacts.delete_one({"contact_id": contact_id})
        
        # 2. Verify no contact exists initially
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200
        data = response.json()
        contact_ids = [c["contact_id"] for c in data["contacts"]]
        assert contact_id not in contact_ids
        
        # 3. Insert contact
        db_client.inbound_contacts.insert_one({
            "contact_id": contact_id,
            "tenant_id": TEST_TENANT_ID,
            "program_id": "prog_flow_test",
            "university_name": "MIT",
            "coach_name": "Coach Williams",
            "coach_email": "williams@mit.edu",
            "email_subject": "Recruiting opportunity",
            "gmail_message_id": "flow_msg_001",
            "dismissed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # 4. Verify contact appears
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200
        data = response.json()
        contact_ids = [c["contact_id"] for c in data["contacts"]]
        assert contact_id in contact_ids, "Contact should appear after insert"
        
        # 5. Dismiss contact
        response = auth_session.post(f"{BASE_URL}/api/inbound-contacts/{contact_id}/dismiss")
        assert response.status_code == 200
        
        # 6. Verify contact no longer appears
        response = auth_session.get(f"{BASE_URL}/api/inbound-contacts")
        assert response.status_code == 200
        data = response.json()
        contact_ids = [c["contact_id"] for c in data["contacts"]]
        assert contact_id not in contact_ids, "Contact should not appear after dismiss"
        
        # 7. Cleanup
        db_client.inbound_contacts.delete_one({"contact_id": contact_id})
        print("PASS: Full flow test completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
