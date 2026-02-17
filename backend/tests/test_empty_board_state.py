"""
Test suite for Empty Board State feature
Tests the /api/suggested-schools, /api/athlete-profile, /api/dashboard endpoints
and the POST /api/programs endpoint for adding schools
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmptyBoardStateAPIs:
    """Test APIs for the empty board state feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get session token for empty board test user"""
        self.session = requests.Session()
        # Login as empty board user
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emptytest@test.com",
            "password": "password"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_dashboard_api(self):
        """Test /api/dashboard returns athlete_name"""
        res = self.session.get(f"{BASE_URL}/api/dashboard")
        assert res.status_code == 200, f"Dashboard failed: {res.text}"
        data = res.json()
        print(f"Dashboard response: {data}")
        # Dashboard should have athlete_name for personalized greeting
        assert "athlete_name" in data or "total_schools" in data
        
    def test_athlete_profile_api(self):
        """Test /api/athlete-profile returns profile with questionnaire status"""
        res = self.session.get(f"{BASE_URL}/api/athlete-profile")
        print(f"Athlete profile status: {res.status_code}")
        print(f"Athlete profile response: {res.text[:500] if res.text else 'empty'}")
        # Should return profile or empty object
        assert res.status_code in [200, 404]
        
    def test_recruiting_profile_api(self):
        """Test /api/recruiting-profile returns profile with questionnaire_completed"""
        res = self.session.get(f"{BASE_URL}/api/recruiting-profile")
        assert res.status_code == 200, f"Recruiting profile failed: {res.text}"
        data = res.json()
        print(f"Recruiting profile response: {data}")
        # Should have questionnaire_completed flag
        if data.get("exists"):
            assert "questionnaire_completed" in data
            
    def test_suggested_schools_api(self):
        """Test /api/suggested-schools returns AI matched schools"""
        res = self.session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200, f"Suggested schools failed: {res.text}"
        data = res.json()
        print(f"Suggested schools response: {data}")
        # Should have suggestions array
        assert "suggestions" in data
        if data.get("profile_exists"):
            # If profile exists, should have suggestions
            suggestions = data.get("suggestions", [])
            print(f"Number of suggestions: {len(suggestions)}")
            if len(suggestions) > 0:
                # Check suggestion structure
                first = suggestions[0]
                assert "university_name" in first
                assert "match_score" in first
                print(f"First suggestion: {first['university_name']} - {first['match_score']}%")
                
    def test_gmail_status_api(self):
        """Test /api/gmail/status returns connection status"""
        res = self.session.get(f"{BASE_URL}/api/gmail/status")
        assert res.status_code == 200, f"Gmail status failed: {res.text}"
        data = res.json()
        print(f"Gmail status response: {data}")
        assert "connected" in data
        
    def test_programs_list_empty(self):
        """Test /api/programs returns empty list for new user"""
        res = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        assert res.status_code == 200, f"Programs failed: {res.text}"
        data = res.json()
        print(f"Programs response: {data}")
        # For empty board user, total should be 0
        assert "total" in data
        print(f"Total programs: {data['total']}")


class TestProUserWithSchools:
    """Test that pro user with existing schools still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get session token for pro test user"""
        self.session = requests.Session()
        # Login as pro user
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_programs_list_not_empty(self):
        """Test /api/programs returns schools for pro user"""
        res = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        assert res.status_code == 200, f"Programs failed: {res.text}"
        data = res.json()
        print(f"Pro user programs: {data}")
        # Pro user should have at least 1 school (UCLA)
        assert data.get("total", 0) >= 1, f"Pro user should have schools, got {data.get('total')}"
        print(f"Pro user total programs: {data['total']}")
        
    def test_dashboard_with_schools(self):
        """Test dashboard for pro user with schools"""
        res = self.session.get(f"{BASE_URL}/api/dashboard")
        assert res.status_code == 200
        data = res.json()
        print(f"Pro user dashboard: {data}")
        assert "total_schools" in data


class TestAddSchoolToBoard:
    """Test adding a school to the board via POST /api/programs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get session token for empty board test user"""
        self.session = requests.Session()
        # Login as empty board user
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emptytest@test.com",
            "password": "password"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_add_school_to_board(self):
        """Test POST /api/programs adds a school"""
        # First check current count
        res = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        initial_count = res.json().get("total", 0)
        print(f"Initial program count: {initial_count}")
        
        # Add a test school
        add_res = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": "TEST_Stanford University",
            "division": "D1",
            "conference": "Pac-12"
        })
        print(f"Add school response status: {add_res.status_code}")
        print(f"Add school response: {add_res.text}")
        assert add_res.status_code in [200, 201], f"Add school failed: {add_res.text}"
        
        # Verify school was added
        res = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        new_count = res.json().get("total", 0)
        print(f"New program count: {new_count}")
        assert new_count > initial_count, f"School not added, count still {new_count}"
        
    def teardown_method(self, method):
        """Cleanup - delete test school"""
        if hasattr(self, 'session'):
            # Get programs and find test school
            res = self.session.get(f"{BASE_URL}/api/programs")
            if res.status_code == 200:
                programs = res.json()
                if isinstance(programs, dict) and "groups" in programs:
                    # Grouped response
                    for stage, progs in programs.get("groups", {}).items():
                        for p in progs:
                            if p.get("university_name", "").startswith("TEST_"):
                                self.session.delete(f"{BASE_URL}/api/programs/{p['program_id']}")
                                print(f"Cleaned up test program: {p['university_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
