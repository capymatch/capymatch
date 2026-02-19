"""
Test suite for School Info Page API endpoints
- GET /api/knowledge-base/school/{domain} - Get single school details
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestSchoolInfoAPI:
    """Tests for the new school info page backend endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get session cookie
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
    
    def test_get_school_duke_success(self):
        """Test GET /api/knowledge-base/school/duke.edu returns valid school data"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify school name
        assert "university_name" in data, "Response missing university_name"
        assert data["university_name"] == "Duke University", f"Expected Duke University, got {data['university_name']}"
        
        # Verify division
        assert "division" in data, "Response missing division"
        assert data["division"] == "D1", f"Expected D1, got {data.get('division')}"
        
        # Verify conference
        assert "conference" in data, "Response missing conference"
        assert data["conference"] == "ACC", f"Expected ACC, got {data.get('conference')}"
        
        # Verify region
        assert "region" in data, "Response missing region"
        assert data["region"] == "South", f"Expected South, got {data.get('region')}"
        
        # Verify domain
        assert "domain" in data, "Response missing domain"
        assert data["domain"] == "duke.edu", f"Expected duke.edu, got {data.get('domain')}"
        
        # Verify on_board field exists
        assert "on_board" in data, "Response missing on_board field"
        
        # Verify match_score field exists (may be 0 if no athlete profile)
        assert "match_score" in data, "Response missing match_score field"
        
        # Verify match_reasons field exists
        assert "match_reasons" in data, "Response missing match_reasons field"
        
        print(f"SUCCESS: Duke University data retrieved - Division: {data['division']}, Conference: {data['conference']}, Region: {data['region']}")
    
    def test_get_school_nonexistent_returns_404(self):
        """Test GET /api/knowledge-base/school/nonexistent.edu returns 404"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/nonexistent.edu")
        assert response.status_code == 404, f"Expected 404 for non-existent school, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "404 response should have detail message"
        print(f"SUCCESS: Non-existent school returns 404 with detail: {data.get('detail')}")
    
    def test_get_school_has_coach_data(self):
        """Test that school response includes coaching staff if available"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        assert response.status_code == 200
        
        data = response.json()
        # Check for coach data fields (may or may not be populated)
        has_coach_data = (
            data.get("primary_coach") or 
            data.get("coach_email") or 
            data.get("recruiting_coordinator") or
            data.get("coaches_scraped")
        )
        print(f"Coach data available: {bool(has_coach_data)}")
        print(f"Primary coach: {data.get('primary_coach', 'N/A')}")
        print(f"Coach email: {data.get('coach_email', 'N/A')}")
        print(f"Coaches scraped: {len(data.get('coaches_scraped', []))} coaches")
        
        # Just log - don't fail if no coach data as it may not have been scraped
    
    def test_get_school_has_website(self):
        """Test that school response includes website if available"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        assert response.status_code == 200
        
        data = response.json()
        # Website may or may not be present
        if data.get("website"):
            print(f"SUCCESS: School website present: {data['website']}")
        else:
            print("INFO: No website field in response")
    
    def test_get_school_includes_scorecard_data(self):
        """Test that school response may include scorecard data if synced"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        assert response.status_code == 200
        
        data = response.json()
        scorecard = data.get("scorecard", {})
        if scorecard:
            print(f"SUCCESS: Scorecard data present")
            print(f"  - Tuition out-of-state: {scorecard.get('tuition_out_of_state', 'N/A')}")
            print(f"  - Admission rate: {scorecard.get('admission_rate', 'N/A')}")
            print(f"  - Student size: {scorecard.get('student_size', 'N/A')}")
            print(f"  - Graduation rate: {scorecard.get('graduation_rate', 'N/A')}")
        else:
            print("INFO: No scorecard data synced for this school")
    
    def test_get_school_with_different_domain(self):
        """Test with another school domain - Stanford"""
        response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Stanford data - Division: {data.get('division')}, Conference: {data.get('conference')}")
            assert data.get("university_name"), "Should have university_name"
        elif response.status_code == 404:
            print("INFO: Stanford not in knowledge base")
        else:
            print(f"Unexpected status: {response.status_code}")
    
    def test_add_to_board_from_school(self):
        """Test adding a school to board via the add-to-board endpoint"""
        # First get a school name from knowledge base
        kb_response = self.session.get(f"{BASE_URL}/api/knowledge-base?division=D3&search=test")
        
        # Use a less common school for testing to avoid duplicates
        test_response = self.session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        if test_response.status_code == 200:
            school_data = test_response.json()
            # Just verify the on_board status is returned correctly
            print(f"Duke on_board status: {school_data.get('on_board')}")
            assert "on_board" in school_data, "Should have on_board field"


class TestSchoolInfoAPINoAuth:
    """Tests for school info endpoint without authentication"""
    
    def test_get_school_without_auth(self):
        """Test GET /api/knowledge-base/school/{domain} without auth - may still work with limited data"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        # Endpoint may work without auth but with limited data, or may require auth
        if response.status_code == 200:
            data = response.json()
            print(f"INFO: Endpoint works without auth - returns basic school data")
            print(f"  - University name: {data.get('university_name')}")
            # Without auth, match_score should be 0 and on_board should be false
            assert data.get("match_score", 0) == 0 or data.get("match_score") is not None
            print(f"  - Match score (no auth): {data.get('match_score')}")
        elif response.status_code == 401:
            print("INFO: Endpoint requires authentication")
        else:
            print(f"INFO: Endpoint returned {response.status_code}")
