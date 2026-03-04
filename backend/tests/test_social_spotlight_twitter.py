"""
Test Social Spotlight Twitter/X Quick Links and YouTube Feed enhancements.
Tests:
1. /api/social-spotlight/feed - returns videos from multiple schools (not just UCLA)
2. /api/social-spotlight/social-links - returns schools with Twitter URLs
3. Trending section functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestSocialSpotlightTwitterLinks:
    """Test Twitter Quick Links feature via /api/social-spotlight/social-links endpoint"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Authenticate and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["session_token"]
    
    def test_social_links_endpoint_returns_schools(self, session_token):
        """Test /api/social-spotlight/social-links returns schools with Twitter URLs"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/social-links",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "schools" in data, "Response should have 'schools' array"
        schools = data["schools"]
        
        # Should have 11 schools with Twitter
        assert len(schools) >= 11, f"Expected at least 11 schools with Twitter, got {len(schools)}"
    
    def test_social_links_school_structure(self, session_token):
        """Test each school in social-links has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/social-links",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        schools = response.json()["schools"]
        
        required_fields = ["program_id", "university_name", "twitter"]
        for school in schools:
            for field in required_fields:
                assert field in school, f"School missing required field: {field}"
            
            # Twitter URL should be a valid URL
            assert school["twitter"].startswith("https://twitter.com/") or school["twitter"].startswith("https://x.com/"), \
                f"Invalid Twitter URL: {school['twitter']}"
    
    def test_social_links_contains_key_schools(self, session_token):
        """Test social-links contains specific schools"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/social-links",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        schools = response.json()["schools"]
        
        school_names = [s["university_name"] for s in schools]
        
        # Verify key schools are present
        expected_schools = [
            "Stanford University",
            "UCLA", 
            "Penn State",
            "University of Florida",
            "Georgia Tech",
            "Johns Hopkins University"
        ]
        
        for name in expected_schools:
            assert name in school_names, f"Expected {name} in social links"


class TestSocialSpotlightFeedEnhancements:
    """Test YouTube feed returns videos from multiple schools"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Authenticate and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        assert response.status_code == 200
        return response.json()["session_token"]
    
    def test_feed_returns_multiple_schools(self, session_token):
        """Test feed returns videos from multiple schools, not just UCLA"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/feed",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Count unique schools
        schools = set()
        for video in data.get("videos", []):
            schools.add(video.get("university_name"))
        
        # Should have videos from more than 1 school
        assert len(schools) >= 3, f"Expected videos from at least 3 schools, got {len(schools)}: {schools}"
    
    def test_feed_returns_20_plus_videos(self, session_token):
        """Test feed returns around 20 videos (up from 7)"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/feed",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data.get("total_videos", 0)
        assert total >= 15, f"Expected at least 15 videos, got {total}"
    
    def test_feed_contains_fixed_schools(self, session_token):
        """Test feed contains videos from schools with fixed YouTube URLs"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/feed",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get unique school names in feed
        school_names = set(v.get("university_name") for v in data.get("videos", []))
        
        # At least some of these fixed schools should have videos
        fixed_schools = ["University of Texas", "University of Florida", "Georgia Tech", "Johns Hopkins University"]
        schools_with_videos = [s for s in fixed_schools if s in school_names]
        
        assert len(schools_with_videos) >= 2, f"Expected at least 2 fixed schools with videos, got {schools_with_videos}"
    
    def test_trending_returns_three_videos(self, session_token):
        """Test trending section returns up to 3 videos"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/feed",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        trending = data.get("trending", [])
        assert len(trending) <= 3, f"Expected max 3 trending videos, got {len(trending)}"
        
        # If there are trending videos, verify view_count exists
        if trending:
            for v in trending:
                assert "view_count" in v, "Trending video should have view_count"
    
    def test_feed_video_structure(self, session_token):
        """Test each video has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/social-spotlight/feed",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        videos = response.json().get("videos", [])
        
        required_fields = ["video_id", "title", "url", "university_name"]
        for video in videos[:5]:  # Check first 5
            for field in required_fields:
                assert field in video, f"Video missing field: {field}"


class TestFeedRefresh:
    """Test feed refresh endpoint"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        return response.json()["session_token"]
    
    def test_refresh_clears_cache(self, session_token):
        """Test /api/social-spotlight/feed/refresh clears cache"""
        response = requests.post(
            f"{BASE_URL}/api/social-spotlight/feed/refresh",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "cleared" in data, "Response should have 'cleared' count"
