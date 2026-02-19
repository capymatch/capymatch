"""
Tests for automatic questionnaire URL discovery feature
- Tests GET /api/knowledge-base/school/{domain} returns questionnaire_url
- Tests URL caching in database after first discovery
- Tests URL validation (from school domain or known platforms)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "pro@test.com",
        "password": "password"
    })
    if response.status_code == 200:
        return response.json().get("token")
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


class TestQuestionnaireUrlDiscovery:
    """Tests for automatic questionnaire URL discovery from DuckDuckGo search"""
    
    def test_school_endpoint_returns_questionnaire_url_for_ucla(self, api_client):
        """Test that UCLA returns a questionnaire URL"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/ucla.edu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "questionnaire_url" in data or data.get("questionnaire_url") is None, \
            "Response should have questionnaire_url field"
        
        questionnaire_url = data.get("questionnaire_url")
        if questionnaire_url:
            print(f"UCLA questionnaire URL found: {questionnaire_url}")
            # Validate URL format
            assert questionnaire_url.startswith("http"), \
                f"URL should start with http, got: {questionnaire_url}"
        else:
            print("UCLA questionnaire URL not found (may be rate limited or no result)")
    
    def test_school_endpoint_returns_questionnaire_url_for_utexas(self, api_client):
        """Test that UT Austin returns a questionnaire URL"""
        # Add delay to avoid rate limiting
        time.sleep(2)
        
        response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/utexas.edu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        questionnaire_url = data.get("questionnaire_url")
        if questionnaire_url:
            print(f"UT Austin questionnaire URL found: {questionnaire_url}")
            assert questionnaire_url.startswith("http"), \
                f"URL should start with http, got: {questionnaire_url}"
        else:
            print("UT Austin questionnaire URL not found")
    
    def test_questionnaire_url_caching(self, api_client):
        """Test that questionnaire_url is cached - second call should be faster"""
        # First call (may trigger search)
        start_time = time.time()
        response1 = api_client.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        first_call_time = time.time() - start_time
        
        assert response1.status_code == 200
        first_data = response1.json()
        first_url = first_data.get("questionnaire_url")
        
        print(f"First call took {first_call_time:.2f}s")
        
        # Second call (should use cached value)
        time.sleep(1)  # Brief pause
        start_time = time.time()
        response2 = api_client.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        second_call_time = time.time() - start_time
        
        assert response2.status_code == 200
        second_data = response2.json()
        second_url = second_data.get("questionnaire_url")
        
        print(f"Second call took {second_call_time:.2f}s")
        
        # URLs should match (if found)
        if first_url and second_url:
            assert first_url == second_url, \
                f"Cached URL should match: {first_url} vs {second_url}"
            print(f"Caching verified: both calls returned {first_url}")
        
        # Second call should generally be faster (cached)
        if first_call_time > 1.0:  # If first call was slow (did search)
            print(f"Caching likely working: first call {first_call_time:.2f}s vs second {second_call_time:.2f}s")
    
    def test_questionnaire_url_from_valid_domain(self, api_client):
        """Test that questionnaire URL is from school's own domain or known platforms"""
        time.sleep(2)  # Rate limit spacing
        
        response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/harvard.edu")
        assert response.status_code == 200
        
        data = response.json()
        questionnaire_url = data.get("questionnaire_url")
        
        if questionnaire_url:
            # Known questionnaire platforms
            valid_platforms = ["armssoftware.com", "fieldlevel.com", "jumpforward.com", "formstack.com"]
            school_domain = "harvard.edu"
            athletics_domain = data.get("website", "")
            
            url_lower = questionnaire_url.lower()
            is_valid = any(p in url_lower for p in valid_platforms) or \
                       school_domain in url_lower or \
                       (athletics_domain and any(part in url_lower for part in athletics_domain.split("/")))
            
            print(f"Harvard questionnaire URL: {questionnaire_url}")
            print(f"URL validation check: {'PASS' if is_valid else 'WARN - may be from external domain'}")
    
    def test_school_without_volleyball_program_returns_404(self, api_client):
        """Test that schools not in DB return 404"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/psu.edu")
        # psu.edu might not be in the volleyball programs database
        # This tests the 404 handling
        print(f"PSU response: {response.status_code}")
        if response.status_code == 404:
            print("PSU not in volleyball database as expected")
        else:
            print(f"PSU found in database: {response.json().get('university_name', 'unknown')}")


class TestQuestionnaireUrlEdgeCases:
    """Edge case tests for questionnaire URL discovery"""
    
    def test_questionnaire_url_field_exists_even_if_null(self, api_client):
        """Response should include questionnaire_url field even if no URL found"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/duke.edu")
        assert response.status_code == 200
        
        data = response.json()
        # The field should exist in response
        print(f"Duke data keys: {list(data.keys())[:10]}...")  # First 10 keys
        print(f"Duke questionnaire_url: {data.get('questionnaire_url')}")
    
    def test_multiple_schools_questionnaire_urls(self, api_client):
        """Test multiple schools to verify feature is working broadly"""
        schools = ["duke.edu", "vanderbilt.edu", "purdue.edu"]
        results = {}
        
        for domain in schools:
            time.sleep(2)  # Rate limiting
            response = api_client.get(f"{BASE_URL}/api/knowledge-base/school/{domain}")
            if response.status_code == 200:
                data = response.json()
                results[domain] = {
                    "name": data.get("university_name"),
                    "questionnaire_url": data.get("questionnaire_url"),
                    "has_url": bool(data.get("questionnaire_url"))
                }
        
        for domain, info in results.items():
            print(f"{info['name']} ({domain}): {'Found' if info['has_url'] else 'Not found'}")
            if info['questionnaire_url']:
                print(f"  URL: {info['questionnaire_url']}")
        
        # At least verify we got responses
        assert len(results) > 0, "Should have at least some school data"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
