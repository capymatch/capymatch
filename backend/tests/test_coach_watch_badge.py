"""
Test Coach Watch Badge API for Journey Page
Tests GET /api/ai/coach-watch/alert/{university_name} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "pro@test.com"
TEST_PASSWORD = "password"
TEST_UNIVERSITY = "UCLA"  # UCLA - prog_4cc20b4d04f9
TENANT_ID = "tenant_user_1d3910616536"


class TestCoachWatchBadgeAPI:
    """Test Coach Watch Alert API for school badge"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_get_coach_watch_alert_for_school_no_alert(self, session):
        """Test getting coach watch alert for school without alerts (returns null)"""
        response = session.get(f"{BASE_URL}/api/ai/coach-watch/alert/{TEST_UNIVERSITY}")
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "alert" in data, "Response should have 'alert' key"
        # UCLA might have no alerts, so alert could be null
        print(f"Alert data: {data['alert']}")
    
    def test_get_coach_watch_alert_url_encoded_name(self, session):
        """Test getting coach watch alert with URL encoded school name"""
        # Test with a school name that has spaces
        school_name = "University of California Los Angeles"
        response = session.get(f"{BASE_URL}/api/ai/coach-watch/alert/{requests.utils.quote(school_name)}")
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "alert" in data, "Response should have 'alert' key"
    
    def test_get_coach_watch_alert_nonexistent_school(self, session):
        """Test getting coach watch alert for school not in database"""
        fake_school = "Nonexistent Test University XYZ123"
        response = session.get(f"{BASE_URL}/api/ai/coach-watch/alert/{requests.utils.quote(fake_school)}")
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "alert" in data, "Response should have 'alert' key"
        # Should return null for non-existent school
        assert data["alert"] is None, "Should return null for non-existent school"


class TestCoachWatchAlertsCollection:
    """Test Coach Watch Alerts full endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_get_all_coach_watch_alerts(self, session):
        """Test getting all coach watch alerts"""
        response = session.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "alerts" in data, "Response should have 'alerts' key"
        assert isinstance(data["alerts"], list), "Alerts should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
