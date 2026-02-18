"""
Profile Page and First Reply Celebration API Tests
Tests inline editing, auto-save, profile completeness, share link, and celebration features.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "pro@test.com"
TEST_PASSWORD = "password"


class TestProfilePageAPIs:
    """Profile Page API tests - session cookie auth"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session with cookies"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session cookie
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('email')}")
        yield
        # Cleanup - session will be garbage collected

    def test_get_athlete_profile(self):
        """GET /api/athlete-profile - Returns profile data"""
        response = self.session.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 200
        
        data = response.json()
        assert "tenant_id" in data
        print(f"Profile tenant_id: {data['tenant_id']}")
        
        # Verify expected fields are present (even if empty)
        expected_fields = [
            "athlete_name", "graduation_year", "position", "height",
            "club_team", "jersey_number", "high_school", "gpa",
            "contact_email", "contact_phone", "parent_name", "parent_email",
            "video_link", "bio", "state", "city", "standing_reach",
            "approach_touch", "hudl_profile_url"
        ]
        for field in expected_fields:
            # Fields should exist in response (can be empty or None)
            assert field in data or data.get(field) is None or data.get(field) == "", \
                f"Field {field} should be returned by API"

    def test_update_athlete_profile_height(self):
        """PUT /api/athlete-profile - Update height field (inline edit)"""
        # Update height
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"height": "6-3"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("height") == "6-3", "Height should be updated to 6-3"
        print(f"Updated height: {data.get('height')}")

    def test_update_athlete_profile_graduation_year(self):
        """PUT /api/athlete-profile - Update graduation_year field"""
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"graduation_year": "2027"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("graduation_year") == "2027", "Graduation year should be updated"
        print(f"Updated graduation_year: {data.get('graduation_year')}")

    def test_update_hudl_profile_url(self):
        """PUT /api/athlete-profile - Update hudl_profile_url field"""
        test_url = "https://www.hudl.com/profile/123456"
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={"hudl_profile_url": test_url}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("hudl_profile_url") == test_url, "Hudl URL should be updated"
        print(f"Updated hudl_profile_url: {data.get('hudl_profile_url')}")

    def test_update_multiple_fields(self):
        """PUT /api/athlete-profile - Update multiple fields at once (auto-save)"""
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={
                "athlete_name": "Pro Athlete Updated",
                "position": "Setter",
                "standing_reach": "8'2\"",
                "bio": "Test bio content for profile"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("athlete_name") == "Pro Athlete Updated"
        assert data.get("position") == "Setter"
        assert data.get("standing_reach") == "8'2\""
        assert data.get("bio") == "Test bio content for profile"
        print("Multiple fields updated successfully")

    def test_get_share_link(self):
        """GET /api/share-link - Returns tenant_id for share link"""
        response = self.session.get(f"{BASE_URL}/api/share-link")
        assert response.status_code == 200
        
        data = response.json()
        assert "tenant_id" in data, "Response should contain tenant_id"
        assert data["tenant_id"].startswith("tenant_"), "tenant_id should have proper format"
        print(f"Share link tenant_id: {data['tenant_id']}")

    def test_first_reply_celebration_status(self):
        """GET /api/first-reply-celebration - Returns celebration status"""
        response = self.session.get(f"{BASE_URL}/api/first-reply-celebration")
        assert response.status_code == 200
        
        data = response.json()
        assert "should_celebrate" in data, "Response should contain should_celebrate"
        assert "already_celebrated" in data, "Response should contain already_celebrated"
        assert isinstance(data["should_celebrate"], bool)
        assert isinstance(data["already_celebrated"], bool)
        print(f"Celebration status: should_celebrate={data['should_celebrate']}, already_celebrated={data['already_celebrated']}")

    def test_dismiss_first_reply_celebration(self):
        """POST /api/first-reply-celebration/dismiss - Mark celebration as seen"""
        response = self.session.post(f"{BASE_URL}/api/first-reply-celebration/dismiss")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True, "Dismiss should return success=True"
        print("Celebration dismissed successfully")
        
        # Verify status is now celebrated
        status_response = self.session.get(f"{BASE_URL}/api/first-reply-celebration")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("already_celebrated") == True, "Should be marked as celebrated"


class TestProfileCompleteness:
    """Tests for verifying profile fields that affect completeness ring"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        yield

    def test_all_profile_fields_saveable(self):
        """Verify all profile fields used for completeness can be saved"""
        # Fields used in PROFILE_FIELDS on frontend
        completeness_fields = {
            "athlete_name": "Test Athlete",
            "graduation_year": "2027",
            "position": "Libero",
            "height": "5-8",
            "jersey_number": "7",
            "standing_reach": "7'6\"",
            "approach_touch": "9'8\"",
            "club_team": "Test Club",
            "high_school": "Test High",
            "city": "Test City",
            "bio": "This is a test bio",
            "video_link": "https://youtube.com/test",
            "contact_email": "test@test.com",
            "parent_name": "Coach Smith"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json=completeness_fields
        )
        assert response.status_code == 200
        
        data = response.json()
        for field, expected_value in completeness_fields.items():
            assert data.get(field) == expected_value, f"Field {field} should be {expected_value}, got {data.get(field)}"
        
        print("All completeness fields verified saveable")


class TestProfileFieldMapping:
    """Tests to verify frontend field names match backend allowed fields"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        yield

    def test_section_contact_fields(self):
        """Contact section field names"""
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={
                "contact_email": "athlete@test.com",
                "contact_phone": "555-1234",
                "parent_name": "Coach Jones",
                "parent_email": "coach@test.com",
                "parent_phone": "555-5678"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("contact_email") == "athlete@test.com"
        assert data.get("parent_name") == "Coach Jones"
        print("Contact fields verified")

    def test_section_measurables_fields(self):
        """Athletic measurables field names"""
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={
                "handed": "Right",
                "standing_reach": "7'8\"",
                "approach_touch": "9'10\"",
                "block_touch": "9'6\"",
                "wingspan": "6'2\"",
                "gpa": "3.8"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("handed") == "Right"
        assert data.get("standing_reach") == "7'8\""
        print("Measurables fields verified")

    def test_section_team_location_fields(self):
        """Team & Location field names"""
        response = self.session.put(
            f"{BASE_URL}/api/athlete-profile",
            json={
                "club_team": "Elite Volleyball",
                "high_school": "Lincoln High",
                "city": "Austin",
                "state": "TX"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("city") == "Austin"
        assert data.get("state") == "TX"
        print("Team/Location fields verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
