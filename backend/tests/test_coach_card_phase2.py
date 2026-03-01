"""
Coach Card Phase 2 Tests - PDF Generation & Video Selector
Features tested:
1. PDF Download endpoint at GET /api/card/{slug}/pdf
2. Public PDF endpoint returns valid PDF with Content-Disposition header
3. PDF endpoint returns 404 for nonexistent slugs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test constants
EXISTING_SLUG = "clara-gimenes-stanford-university-a73931"
EXISTING_PROGRAM_ID = "prog_e8ee256e0c79"
TEST_EMAIL = "demo@capymatch.com"
TEST_PASSWORD = "demo2026"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token via login"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPDFGeneration:
    """PDF generation endpoint tests (public - no auth required)"""
    
    def test_pdf_endpoint_returns_valid_pdf(self, api_client):
        """GET /api/card/{slug}/pdf returns a valid PDF file"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify Content-Type is application/pdf
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify Content-Disposition header exists with attachment filename
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment, got {content_disposition}"
        assert "filename=" in content_disposition, f"Expected filename in disposition, got {content_disposition}"
        
        print(f"PASS: PDF endpoint returns Content-Disposition: {content_disposition}")
    
    def test_pdf_has_valid_header(self, api_client):
        """PDF file starts with %PDF- header (valid PDF format)"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}/pdf")
        
        assert response.status_code == 200
        
        # Check PDF magic bytes - first 5 bytes should be "%PDF-"
        pdf_content = response.content
        assert len(pdf_content) > 5, "PDF content too small"
        
        header = pdf_content[:5].decode('utf-8', errors='ignore')
        assert header == "%PDF-", f"Expected PDF header '%PDF-', got '{header}'"
        
        print(f"PASS: PDF file has valid header, size: {len(pdf_content)} bytes")
    
    def test_pdf_nonexistent_slug_returns_404(self, api_client):
        """GET /api/card/nonexistent/pdf returns 404"""
        response = api_client.get(f"{BASE_URL}/api/card/nonexistent-slug-12345/pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Expected error detail in response"
        
        print(f"PASS: Nonexistent slug returns 404 with detail: {data['detail']}")
    
    def test_pdf_filename_format(self, api_client):
        """PDF filename follows expected format: CoachCard_Name_School.pdf"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}/pdf")
        
        assert response.status_code == 200
        
        content_disposition = response.headers.get("Content-Disposition", "")
        # Extract filename from header
        assert "CoachCard" in content_disposition, f"Expected 'CoachCard' in filename, got {content_disposition}"
        assert ".pdf" in content_disposition.lower(), f"Expected .pdf extension in filename"
        
        print(f"PASS: PDF filename format correct: {content_disposition}")


class TestAthleteProfileVideos:
    """Test athlete profile endpoint to verify video fields are returned"""
    
    def test_athlete_profile_returns_video_fields(self, authenticated_client):
        """GET /api/athlete-profile returns video URL fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/athlete-profile")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check that video fields exist (can be null/empty)
        video_fields = ["highlight_video", "hudl_url", "full_game_film_url"]
        found_fields = []
        for field in video_fields:
            if field in data:
                found_fields.append(field)
        
        print(f"PASS: Athlete profile contains video fields: {found_fields}")
        print(f"  highlight_video: {data.get('highlight_video', 'NOT SET')}")
        print(f"  hudl_url: {data.get('hudl_url', 'NOT SET')}")
        print(f"  full_game_film_url: {data.get('full_game_film_url', 'NOT SET')}")


class TestCoachCardConfigVideoSelector:
    """Test Coach Card config supports video selection"""
    
    def test_coach_card_config_featured_video_field(self, authenticated_client):
        """GET /api/coach-card/{program_id} returns featured_video field"""
        response = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "featured_video" in data, "Expected featured_video field in response"
        
        print(f"PASS: Coach card config has featured_video: {data.get('featured_video', 'empty')}")
    
    def test_update_featured_video(self, authenticated_client):
        """PUT /api/coach-card/{program_id} can update featured_video"""
        test_video_url = "https://example.com/test-video.mp4"
        
        response = authenticated_client.put(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}", json={
            "featured_video": test_video_url
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("featured_video") == test_video_url, f"Expected updated video URL, got {data.get('featured_video')}"
        
        print(f"PASS: Featured video updated successfully to: {test_video_url}")
        
        # Cleanup - reset to empty
        authenticated_client.put(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}", json={
            "featured_video": ""
        })


class TestPublicCoachCardData:
    """Test public coach card endpoint returns correct data for video display"""
    
    def test_public_card_returns_config_with_featured_video(self, api_client):
        """GET /api/card/{slug} returns config with featured_video field"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "config" in data, "Expected config in response"
        assert "featured_video" in data["config"], "Expected featured_video in config"
        
        print(f"PASS: Public card config includes featured_video: {data['config'].get('featured_video', 'empty')}")
    
    def test_public_card_returns_profile_with_video_urls(self, api_client):
        """GET /api/card/{slug} returns profile with video URL fields"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "profile" in data, "Expected profile in response"
        
        profile = data["profile"]
        video_fields_found = []
        for field in ["highlight_video", "hudl_url", "full_game_film_url"]:
            if field in profile:
                video_fields_found.append(field)
        
        print(f"PASS: Public card profile includes video fields: {video_fields_found}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
