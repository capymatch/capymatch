"""
Test suite for Tour/Onboarding features - Backend API verification
Tests: /api/, /api/knowledge-base, /api/athlete-profile, /api/gmail/status, authenticated endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicEndpoints:
    """Test unauthenticated public endpoints"""
    
    def test_api_root_returns_message(self):
        """GET /api/ should return API message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Volleyball Recruiting CRM" in data["message"]
        print(f"SUCCESS: /api/ returns: {data['message']}")
    
    def test_knowledge_base_returns_universities(self):
        """GET /api/knowledge-base should return list of universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check first university has expected fields
        first = data[0]
        assert "university_name" in first
        assert "division" in first
        print(f"SUCCESS: /api/knowledge-base returns {len(data)} universities")
    
    def test_knowledge_base_filter_by_division(self):
        """GET /api/knowledge-base?division=D1 filters correctly"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base?division=D1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned items should be D1
        for uni in data:
            assert uni.get("division") == "D1", f"Expected D1, got {uni.get('division')}"
        print(f"SUCCESS: Division filter works - {len(data)} D1 schools")


class TestAuthRequiredEndpoints:
    """Test endpoints that require authentication return 401"""
    
    def test_athlete_profile_requires_auth(self):
        """GET /api/athlete-profile should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data or "error" in data
        print("SUCCESS: /api/athlete-profile returns 401 (auth required)")
    
    def test_gmail_status_requires_auth(self):
        """GET /api/gmail/status should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/gmail/status")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data or "error" in data
        print("SUCCESS: /api/gmail/status returns 401 (auth required)")
    
    def test_dashboard_requires_auth(self):
        """GET /api/dashboard should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 401
        print("SUCCESS: /api/dashboard returns 401 (auth required)")
    
    def test_programs_requires_auth(self):
        """GET /api/programs should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 401
        print("SUCCESS: /api/programs returns 401 (auth required)")
    
    def test_events_requires_auth(self):
        """GET /api/events should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 401
        print("SUCCESS: /api/events returns 401 (auth required)")
    
    def test_reminders_requires_auth(self):
        """GET /api/reminders should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 401
        print("SUCCESS: /api/reminders returns 401 (auth required)")
    
    def test_profile_views_requires_auth(self):
        """GET /api/profile-views should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/profile-views")
        assert response.status_code == 401
        print("SUCCESS: /api/profile-views returns 401 (auth required)")


class TestAuthenticatedEndpoints:
    """Test endpoints with valid authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create test user and session for authenticated tests"""
        import subprocess
        import json
        
        # Create session via mongosh
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var userId = 'test-pytest-' + Date.now();
            var sessionToken = 'pytest_session_' + Date.now();
            db.users.insertOne({
              user_id: userId,
              email: 'pytest.' + Date.now() + '@example.com',
              name: 'PyTest User',
              picture: 'https://via.placeholder.com/150',
              created_at: new Date()
            });
            db.user_sessions.insertOne({
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            });
            print(JSON.stringify({token: sessionToken, userId: userId}));
            '''
        ], capture_output=True, text=True)
        
        output_lines = result.stdout.strip().split('\n')
        for line in output_lines:
            if line.startswith('{'):
                data = json.loads(line)
                self.session_token = data['token']
                self.user_id = data['userId']
                break
        
        yield
        
        # Cleanup
        subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            db.users.deleteOne({{user_id: '{self.user_id}'}});
            db.user_sessions.deleteOne({{session_token: '{self.session_token}'}});
            '''
        ], capture_output=True)
    
    def test_auth_me_with_valid_session(self):
        """GET /api/auth/me with valid session returns user data"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"SUCCESS: /api/auth/me returns user: {data['name']}")
    
    def test_dashboard_with_valid_session(self):
        """GET /api/dashboard with valid session returns dashboard data"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Dashboard should have stats
        assert "total_programs" in data or "stats" in data or isinstance(data, dict)
        print("SUCCESS: /api/dashboard returns data with auth")
    
    def test_athlete_profile_with_valid_session(self):
        """GET /api/athlete-profile with valid session returns profile (may be empty)"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/athlete-profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # New user may have empty profile
        assert isinstance(data, dict)
        print("SUCCESS: /api/athlete-profile returns data with auth")
    
    def test_gmail_status_with_valid_session(self):
        """GET /api/gmail/status with valid session returns connection status"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/gmail/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        # New user should have connected=false
        assert data["connected"] == False
        print(f"SUCCESS: /api/gmail/status returns connected={data['connected']}")
    
    def test_programs_with_valid_session(self):
        """GET /api/programs with valid session returns programs list"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/programs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # New user should have empty programs
        assert isinstance(data, list)
        print(f"SUCCESS: /api/programs returns {len(data)} programs")
    
    def test_events_with_valid_session(self):
        """GET /api/events with valid session returns events list"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        response = requests.get(f"{BASE_URL}/api/events", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: /api/events returns {len(data)} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
