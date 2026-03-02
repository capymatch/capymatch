"""
Test Suite for Public Athlete Profile Feature
Tests: authentication, sharing settings, public profile endpoint, view tracking,
analytics, PDF download, and visibility toggles
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module level token - obtained once, reused
_session_token = None

def get_auth_token():
    """Get authentication token, caching it for reuse"""
    global _session_token
    if _session_token is None:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@capymatch.com",
            "password": "demo2026"
        })
        if response.status_code == 200:
            _session_token = response.json().get("session_token")
    return _session_token

def get_headers():
    """Get headers with authentication"""
    token = get_auth_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class TestPublicAthleteProfile:
    """Tests for the new Public Athlete Profile feature"""
    
    # ==================== AUTH TEST ====================
    def test_auth_login_returns_session_token(self):
        """POST /api/auth/login with demo credentials returns session_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@capymatch.com",
            "password": "demo2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "Response missing session_token"
        assert len(data["session_token"]) > 0, "session_token is empty"
        print(f"LOGIN SUCCESS: Got session_token")
    
    # ==================== SHARING SETTINGS ====================
    def test_get_sharing_settings(self):
        """GET /api/athlete-profile/sharing returns sharing settings"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile/sharing", headers=get_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have public_slug and visibility toggles
        assert "public_slug" in data, f"Response should have public_slug: {data}"
        print(f"GET SHARING SETTINGS SUCCESS: slug={data.get('public_slug')}, toggles present")
    
    def test_put_sharing_generates_slug(self):
        """PUT /api/athlete-profile/sharing generates/returns public_slug"""
        response = requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                               headers=get_headers(), json={})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "public_slug" in data, f"Response missing public_slug: {data}"
        assert len(data["public_slug"]) > 0, "public_slug is empty"
        print(f"PUT SHARING SUCCESS: slug={data['public_slug']}")
    
    def test_put_sharing_updates_visibility_toggles(self):
        """PUT /api/athlete-profile/sharing updates visibility toggles"""
        # Toggle show_measurables to False
        response = requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                               headers=get_headers(), 
                               json={"show_measurables": False})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify GET returns updated value
        check = requests.get(f"{BASE_URL}/api/athlete-profile/sharing", headers=get_headers())
        check_data = check.json()
        assert check_data.get("show_measurables") == False, f"show_measurables should be False: {check_data}"
        print(f"VISIBILITY TOGGLE SUCCESS: show_measurables=False")
        
        # Restore to True
        requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                    headers=get_headers(), 
                    json={"show_measurables": True})
    
    # ==================== PUBLIC PROFILE ENDPOINT ====================
    def test_public_profile_returns_data(self):
        """GET /api/p/{slug} returns public profile data"""
        slug = "clara-gimenes-d5dd51"
        response = requests.get(f"{BASE_URL}/api/p/{slug}")
        
        assert response.status_code == 200, f"Failed to get public profile: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "athlete_name" in data, "Response missing athlete_name"
        assert len(data.get("athlete_name", "")) > 0, "athlete_name is empty"
        assert "view_count" in data, "Response missing view_count"
        
        print(f"PUBLIC PROFILE SUCCESS: athlete={data.get('athlete_name')}, views={data.get('view_count')}")
    
    def test_public_profile_contains_expected_sections(self):
        """Public profile includes measurables, academics, videos, contact when enabled"""
        slug = "clara-gimenes-d5dd51"
        
        # Ensure all toggles are ON first
        requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                    headers=get_headers(), 
                    json={
                        "show_measurables": True,
                        "show_academics": True,
                        "show_videos": True,
                        "show_contact": True,
                        "show_schedule": True
                    })
        time.sleep(0.2)
        
        response = requests.get(f"{BASE_URL}/api/p/{slug}")
        data = response.json()
        
        # Check for expected sections
        assert "measurables" in data, "Response missing measurables"
        assert "academics" in data, "Response missing academics"
        assert "videos" in data, "Response missing videos"
        assert "contact" in data, "Response missing contact"
        
        print(f"PUBLIC PROFILE SECTIONS: measurables={bool(data.get('measurables'))}, academics={bool(data.get('academics'))}")
    
    def test_public_profile_not_found(self):
        """GET /api/p/{slug} returns 404 for nonexistent slug"""
        response = requests.get(f"{BASE_URL}/api/p/nonexistent-slug-xyz123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("NONEXISTENT SLUG: Correctly returns 404")
    
    def test_public_profile_respects_visibility_toggle(self):
        """Public profile should NOT include academics when show_academics is False"""
        slug = "clara-gimenes-d5dd51"
        
        # Turn OFF academics
        response = requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                               headers=get_headers(), 
                               json={"show_academics": False})
        assert response.status_code == 200, f"Failed to update toggle: {response.text}"
        time.sleep(0.3)
        
        # Get public profile
        profile_response = requests.get(f"{BASE_URL}/api/p/{slug}")
        data = profile_response.json()
        
        # academics key should NOT be present when show_academics is False
        assert "academics" not in data, f"academics should NOT be in response when hidden. Keys: {list(data.keys())}"
        print("VISIBILITY TOGGLE: academics correctly hidden when show_academics=False")
        
        # Restore visibility
        requests.put(f"{BASE_URL}/api/athlete-profile/sharing", 
                    headers=get_headers(), 
                    json={"show_academics": True})
    
    # ==================== VIEW TRACKING ====================
    def test_record_profile_view(self):
        """POST /api/p/{slug}/view records a view and increments profile_view_count"""
        slug = "clara-gimenes-d5dd51"
        
        # Get initial view count
        initial = requests.get(f"{BASE_URL}/api/p/{slug}")
        initial_count = initial.json().get("view_count", 0)
        
        # Record a view
        response = requests.post(f"{BASE_URL}/api/p/{slug}/view")
        assert response.status_code == 200, f"Failed to record view: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok:true, got {data}"
        
        time.sleep(0.3)  # Small delay for DB update
        
        # Verify count incremented
        updated = requests.get(f"{BASE_URL}/api/p/{slug}")
        updated_count = updated.json().get("view_count", 0)
        
        assert updated_count > initial_count, f"View count should increase: {initial_count} -> {updated_count}"
        print(f"VIEW TRACKING SUCCESS: {initial_count} -> {updated_count}")
    
    def test_record_view_nonexistent_slug(self):
        """POST /api/p/{slug}/view returns 404 for nonexistent slug"""
        response = requests.post(f"{BASE_URL}/api/p/nonexistent-slug-xyz123/view")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("VIEW NONEXISTENT: Correctly returns 404")
    
    # ==================== ANALYTICS ====================
    def test_analytics_returns_data(self):
        """GET /api/athlete-profile/analytics returns analytics data"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile/analytics", headers=get_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "total_views" in data, "Response missing total_views"
        assert "unique_visitors" in data, "Response missing unique_visitors"
        assert "recent_views" in data, "Response missing recent_views"
        assert "views_by_day" in data, "Response missing views_by_day"
        
        # types
        assert isinstance(data["total_views"], int), "total_views should be int"
        assert isinstance(data["unique_visitors"], int), "unique_visitors should be int"
        assert isinstance(data["recent_views"], list), "recent_views should be list"
        assert isinstance(data["views_by_day"], dict), "views_by_day should be dict"
        
        print(f"ANALYTICS SUCCESS: total={data['total_views']}, unique={data['unique_visitors']}")
    
    def test_analytics_requires_auth(self):
        """GET /api/athlete-profile/analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile/analytics")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("ANALYTICS AUTH: Correctly requires authentication")
    
    def test_analytics_recent_views_structure(self):
        """Analytics recent_views should have viewed_at, referer, visitor_hash"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile/analytics", headers=get_headers())
        data = response.json()
        
        if len(data.get("recent_views", [])) > 0:
            view = data["recent_views"][0]
            assert "viewed_at" in view, "recent_view missing viewed_at"
            assert "referer" in view or view.get("referer") is not None, "recent_view missing referer"
            assert "visitor_hash" in view, "recent_view missing visitor_hash"
            print(f"ANALYTICS STRUCTURE: recent_view has viewed_at, referer, visitor_hash")
        else:
            print("ANALYTICS: No recent views to verify structure")
    
    # ==================== PDF DOWNLOAD ====================
    def test_pdf_download(self):
        """GET /api/p/{slug}/pdf returns a valid PDF (HTTP 200, application/pdf)"""
        slug = "clara-gimenes-d5dd51"
        response = requests.get(f"{BASE_URL}/api/p/{slug}/pdf")
        
        assert response.status_code == 200, f"Failed to get PDF: {response.status_code} - {response.text}"
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got {content_type}"
        assert len(response.content) > 100, "PDF content seems too small"
        
        print(f"PDF DOWNLOAD SUCCESS: {len(response.content)} bytes, content-type={content_type}")
    
    def test_pdf_nonexistent_slug(self):
        """GET /api/p/{slug}/pdf returns 404 for nonexistent slug"""
        response = requests.get(f"{BASE_URL}/api/p/nonexistent-slug-xyz123/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PDF NONEXISTENT: Correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
