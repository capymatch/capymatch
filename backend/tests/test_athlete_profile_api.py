"""
Test cases for Athlete Profile and Public Schedule APIs
- GET /api/athlete-profile (auth required)
- PUT /api/athlete-profile (auth required)
- POST /api/athlete-profile/photo (auth required)
- GET /api/public/schedule/{tenant_id} (no auth required)
- GET /api/share-link (auth required)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
# Test session credentials from provided context
TEST_SESSION_TOKEN = "sess_visual_94cd37ba"
TEST_TENANT_ID = "tenant_19adfbd08518"


class TestAthleteProfileAuth:
    """Tests for authentication requirements on athlete profile endpoints"""
    
    def test_get_profile_requires_auth(self):
        """GET /api/athlete-profile should return 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/athlete-profile returns 401 without auth")

    def test_put_profile_requires_auth(self):
        """PUT /api/athlete-profile should return 401 without authentication"""
        response = requests.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"athlete_name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PUT /api/athlete-profile returns 401 without auth")

    def test_photo_upload_requires_auth(self):
        """POST /api/athlete-profile/photo should return 401 without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/athlete-profile/photo",
            json={"photo_data": "data:image/png;base64,test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/athlete-profile/photo returns 401 without auth")

    def test_share_link_requires_auth(self):
        """GET /api/share-link should return 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/share-link")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/share-link returns 401 without auth")


class TestAthleteProfileCRUD:
    """Tests for athlete profile CRUD operations with auth"""
    
    @pytest.fixture
    def auth_session(self):
        """Session with authentication cookie"""
        session = requests.Session()
        session.cookies.set("session_token", TEST_SESSION_TOKEN)
        return session

    def test_get_profile_with_auth(self, auth_session):
        """GET /api/athlete-profile should return profile data with authentication"""
        response = auth_session.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate expected profile fields exist
        expected_fields = [
            "tenant_id", "athlete_name", "grad_year", "position", "height",
            "club_team", "jersey_number", "high_school", "gpa", 
            "contact_email", "contact_phone", "parent_name", 
            "parent_email", "parent_phone", "video_link", "photo_url", "bio"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ GET /api/athlete-profile returns profile with all fields")
        print(f"  Profile name: {data.get('athlete_name')}")
        return data

    def test_update_profile(self, auth_session):
        """PUT /api/athlete-profile should update profile fields"""
        update_data = {
            "athlete_name": "TEST_Clara Smith",
            "position": "Outside Hitter",
            "grad_year": "2027",
            "height": "5'10\"",
            "club_team": "Test Club VB",
            "gpa": "3.9"
        }
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify updates were applied
        for key, value in update_data.items():
            assert data.get(key) == value, f"Field {key} not updated. Expected {value}, got {data.get(key)}"
        
        print("✓ PUT /api/athlete-profile updates profile correctly")
        return data

    def test_update_contact_info(self, auth_session):
        """PUT /api/athlete-profile should update contact info"""
        contact_data = {
            "contact_email": "test.athlete@test.com",
            "contact_phone": "(555) 123-4567"
        }
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json=contact_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("contact_email") == contact_data["contact_email"]
        assert data.get("contact_phone") == contact_data["contact_phone"]
        print("✓ PUT /api/athlete-profile updates contact info correctly")

    def test_update_parent_info(self, auth_session):
        """PUT /api/athlete-profile should update parent/guardian info"""
        parent_data = {
            "parent_name": "Test Parent",
            "parent_email": "parent@test.com",
            "parent_phone": "(555) 987-6543"
        }
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json=parent_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("parent_name") == parent_data["parent_name"]
        assert data.get("parent_email") == parent_data["parent_email"]
        assert data.get("parent_phone") == parent_data["parent_phone"]
        print("✓ PUT /api/athlete-profile updates parent info correctly")

    def test_update_video_link(self, auth_session):
        """PUT /api/athlete-profile should update video link"""
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"video_link": "https://youtube.com/test-highlights"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("video_link") == "https://youtube.com/test-highlights"
        print("✓ PUT /api/athlete-profile updates video link correctly")

    def test_update_bio(self, auth_session):
        """PUT /api/athlete-profile should update bio"""
        bio_text = "Test athlete bio - passionate about volleyball and academics."
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"bio": bio_text}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("bio") == bio_text
        print("✓ PUT /api/athlete-profile updates bio correctly")

    def test_update_location_info(self, auth_session):
        """PUT /api/athlete-profile should update city/state"""
        location_data = {"city": "Austin", "state": "TX"}
        response = auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json=location_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("city") == location_data["city"]
        assert data.get("state") == location_data["state"]
        print("✓ PUT /api/athlete-profile updates city/state correctly")


class TestPhotoUpload:
    """Tests for athlete photo upload endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        session.cookies.set("session_token", TEST_SESSION_TOKEN)
        return session

    def test_photo_upload_accepts_base64(self, auth_session):
        """POST /api/athlete-profile/photo should accept photo_data"""
        # Small valid base64 image (1x1 transparent PNG)
        small_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        response = auth_session.post(
            f"{BASE_URL}/api/athlete-profile/photo",
            json={"photo_data": small_base64}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("✓ POST /api/athlete-profile/photo accepts valid base64 photo")

    def test_photo_upload_requires_photo_data(self, auth_session):
        """POST /api/athlete-profile/photo should require photo_data field"""
        response = auth_session.post(
            f"{BASE_URL}/api/athlete-profile/photo",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/athlete-profile/photo returns 400 when photo_data missing")

    def test_photo_upload_empty_data_fails(self, auth_session):
        """POST /api/athlete-profile/photo should reject empty photo_data"""
        response = auth_session.post(
            f"{BASE_URL}/api/athlete-profile/photo",
            json={"photo_data": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/athlete-profile/photo returns 400 for empty photo_data")


class TestShareLink:
    """Tests for share link endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        session.cookies.set("session_token", TEST_SESSION_TOKEN)
        return session

    def test_get_share_link(self, auth_session):
        """GET /api/share-link should return tenant_id"""
        response = auth_session.get(f"{BASE_URL}/api/share-link")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tenant_id" in data, "Response should contain tenant_id"
        assert data["tenant_id"], "tenant_id should not be empty"
        print(f"✓ GET /api/share-link returns tenant_id: {data['tenant_id']}")
        return data["tenant_id"]


class TestPublicSchedule:
    """Tests for public schedule endpoint (NO AUTH REQUIRED)"""

    def test_public_schedule_valid_tenant(self):
        """GET /api/public/schedule/{tenant_id} should return profile + events without auth"""
        response = requests.get(f"{BASE_URL}/api/public/schedule/{TEST_TENANT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "profile" in data, "Response should contain profile"
        assert "upcoming_events" in data, "Response should contain upcoming_events"
        assert "past_events" in data, "Response should contain past_events"
        
        # Validate profile has expected fields
        profile = data["profile"]
        profile_fields = ["tenant_id", "athlete_name", "position", "grad_year", "height"]
        for field in profile_fields:
            assert field in profile, f"Profile missing field: {field}"
        
        # Validate events are lists
        assert isinstance(data["upcoming_events"], list)
        assert isinstance(data["past_events"], list)
        
        print(f"✓ GET /api/public/schedule/{TEST_TENANT_ID} returns profile and events")
        print(f"  Athlete: {profile.get('athlete_name')}")
        print(f"  Upcoming events: {len(data['upcoming_events'])}")
        print(f"  Past events: {len(data['past_events'])}")
        return data

    def test_public_schedule_invalid_tenant(self):
        """GET /api/public/schedule/{invalid_id} should return 404"""
        invalid_id = "invalid_tenant_xyz123"
        response = requests.get(f"{BASE_URL}/api/public/schedule/{invalid_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/public/schedule/{invalid_id} returns 404")

    def test_public_schedule_no_auth_cookie(self):
        """GET /api/public/schedule/{tenant_id} should work WITHOUT any auth cookie"""
        # Explicitly use a fresh session without any cookies
        session = requests.Session()
        session.cookies.clear()
        
        response = session.get(f"{BASE_URL}/api/public/schedule/{TEST_TENANT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Public schedule endpoint works WITHOUT any authentication")

    def test_public_schedule_profile_fields(self):
        """Verify public schedule returns all expected profile fields"""
        response = requests.get(f"{BASE_URL}/api/public/schedule/{TEST_TENANT_ID}")
        assert response.status_code == 200
        data = response.json()
        profile = data["profile"]
        
        # All fields that should be accessible publicly
        public_fields = [
            "tenant_id", "athlete_name", "grad_year", "position", "height",
            "club_team", "jersey_number", "high_school", "gpa",
            "contact_email", "contact_phone", "parent_name", 
            "parent_email", "parent_phone", "video_link", "photo_url", "bio",
            "city", "state"
        ]
        
        for field in public_fields:
            assert field in profile, f"Public profile missing field: {field}"
        
        print("✓ Public schedule profile contains all expected fields")

    def test_public_schedule_events_structure(self):
        """Verify event objects have correct structure"""
        response = requests.get(f"{BASE_URL}/api/public/schedule/{TEST_TENANT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Check if there are any events to validate
        all_events = data.get("upcoming_events", []) + data.get("past_events", [])
        if all_events:
            event = all_events[0]
            event_fields = ["event_id", "title", "event_type", "start_date"]
            for field in event_fields:
                assert field in event, f"Event missing field: {field}"
            print(f"✓ Events have correct structure (sample: {event.get('title')})")
        else:
            print("✓ Events structure check skipped (no events found)")


class TestDataPersistence:
    """Test that profile changes persist correctly"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        session.cookies.set("session_token", TEST_SESSION_TOKEN)
        return session

    def test_profile_update_persists(self, auth_session):
        """PUT then GET should show updated data"""
        # Update profile
        test_gpa = "4.0"
        auth_session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"gpa": test_gpa}
        )
        
        # Get and verify
        response = auth_session.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 200
        data = response.json()
        assert data.get("gpa") == test_gpa, f"GPA not persisted. Expected {test_gpa}, got {data.get('gpa')}"
        print("✓ Profile updates persist correctly (Create → GET verification)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
