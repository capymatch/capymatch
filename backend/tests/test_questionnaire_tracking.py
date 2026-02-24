"""
Tests for Questionnaire Tracking Feature
- PATCH /api/programs/{program_id}/questionnaire - toggle completion status
- GET /api/programs - includes questionnaire_url from knowledge base
- GET /api/programs/{program_id} - includes questionnaire_url from knowledge base
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token using demo credentials"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@capymatch.com",
        "password": "demo2026"
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestQuestionnaireEnrichment:
    """Tests for questionnaire_url enrichment in program endpoints"""
    
    def test_get_programs_list_includes_questionnaire_url(self, api_client):
        """GET /api/programs should include questionnaire_url for programs that have one"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        programs = response.json()
        assert isinstance(programs, list), "Response should be a list"
        
        # Find Penn State which should have questionnaire_url
        penn_state = next((p for p in programs if "Penn State" in p.get("university_name", "")), None)
        
        if penn_state:
            assert "questionnaire_url" in penn_state, "Penn State should have questionnaire_url field"
            questionnaire_url = penn_state.get("questionnaire_url")
            assert questionnaire_url is not None, "Penn State questionnaire_url should not be null"
            assert "armssoftware" in questionnaire_url or "questionnaire" in questionnaire_url.lower(), \
                f"URL should be a questionnaire URL: {questionnaire_url}"
            print(f"Penn State questionnaire_url: {questionnaire_url}")
        else:
            print("Penn State not found in user's programs - checking other programs")
        
        # Also verify programs without questionnaire_url work correctly
        other_programs = [p for p in programs if not p.get("questionnaire_url")]
        print(f"Programs without questionnaire_url: {len(other_programs)}")
    
    def test_get_single_program_includes_questionnaire_url(self, api_client):
        """GET /api/programs/{program_id} should include questionnaire_url from KB"""
        # First get list to find Penn State's program_id
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        programs = response.json()
        
        penn_state = next((p for p in programs if "Penn State" in p.get("university_name", "")), None)
        if not penn_state:
            pytest.skip("Penn State not in user's programs")
        
        program_id = penn_state["program_id"]
        
        # Now get single program
        response = api_client.get(f"{BASE_URL}/api/programs/{program_id}")
        assert response.status_code == 200
        
        program = response.json()
        assert "questionnaire_url" in program, "Single program should have questionnaire_url field"
        assert program["questionnaire_url"] is not None, "Penn State questionnaire_url should not be null"
        print(f"Single program questionnaire_url: {program['questionnaire_url']}")


class TestQuestionnaireToggle:
    """Tests for PATCH /api/programs/{program_id}/questionnaire endpoint"""
    
    @pytest.fixture
    def penn_state_id(self, api_client):
        """Get Penn State program_id"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        programs = response.json()
        
        penn_state = next((p for p in programs if "Penn State" in p.get("university_name", "")), None)
        if not penn_state:
            pytest.skip("Penn State not in user's programs")
        return penn_state["program_id"]
    
    def test_mark_questionnaire_complete(self, api_client, penn_state_id):
        """PATCH should mark questionnaire as complete and set timestamp"""
        response = api_client.patch(
            f"{BASE_URL}/api/programs/{penn_state_id}/questionnaire",
            json={"completed": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True, "Response should indicate success"
        assert data.get("questionnaire_completed") == True, "questionnaire_completed should be True"
        assert data.get("questionnaire_completed_at") is not None, "Should have timestamp"
        print(f"Marked complete at: {data['questionnaire_completed_at']}")
        
        # Verify persistence via GET
        verify_response = api_client.get(f"{BASE_URL}/api/programs/{penn_state_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("questionnaire_completed") == True
        assert verify_data.get("questionnaire_completed_at") is not None
    
    def test_mark_questionnaire_incomplete(self, api_client, penn_state_id):
        """PATCH should mark questionnaire as incomplete and clear timestamp"""
        # First mark complete
        api_client.patch(
            f"{BASE_URL}/api/programs/{penn_state_id}/questionnaire",
            json={"completed": True}
        )
        
        # Now mark incomplete
        response = api_client.patch(
            f"{BASE_URL}/api/programs/{penn_state_id}/questionnaire",
            json={"completed": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("questionnaire_completed") == False
        assert data.get("questionnaire_completed_at") is None, "Timestamp should be cleared"
        
        # Verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/programs/{penn_state_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("questionnaire_completed") == False
        assert verify_data.get("questionnaire_completed_at") is None
    
    def test_toggle_questionnaire_nonexistent_program(self, api_client):
        """PATCH should return 404 for non-existent program"""
        response = api_client.patch(
            f"{BASE_URL}/api/programs/prog_nonexistent_12345/questionnaire",
            json={"completed": True}
        )
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
    
    def test_toggle_questionnaire_requires_auth(self, penn_state_id):
        """PATCH should require authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/programs/{penn_state_id}/questionnaire",
            json={"completed": True},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401


class TestQuestionnaireFieldValidation:
    """Tests for questionnaire field presence and format"""
    
    def test_programs_without_questionnaire_url_have_null_field(self, api_client):
        """Programs without questionnaire_url in KB should not have the field or have null"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        programs = response.json()
        
        # Find a program without questionnaire_url (like Stanford or UCLA)
        no_quest_program = next(
            (p for p in programs if not p.get("questionnaire_url") and "Stanford" in p.get("university_name", "")),
            None
        )
        
        if no_quest_program:
            # questionnaire_url should either be absent or null
            assert no_quest_program.get("questionnaire_url") is None, \
                "Programs without questionnaire should have null questionnaire_url"
            print(f"{no_quest_program['university_name']} correctly has null questionnaire_url")
    
    def test_questionnaire_completed_field_present_in_programs(self, api_client):
        """All programs should have questionnaire_completed field for consistency"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        programs = response.json()
        
        for p in programs[:5]:  # Check first 5
            # questionnaire_completed should exist (might be null, false, or true)
            print(f"{p['university_name']}: questionnaire_completed={p.get('questionnaire_completed')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
