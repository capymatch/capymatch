"""
Test suite for Social Spotlight Trending feature.
Tests the /api/social-spotlight/feed endpoint trending array.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSocialSpotlightTrending:
    """Tests for Social Spotlight trending feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        session_token = login_response.json().get("session_token")
        assert session_token, "No session_token in login response"
        
        self.session.cookies.set("session_token", session_token)
    
    def test_feed_endpoint_returns_trending_array(self):
        """Verify /api/social-spotlight/feed returns trending array"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200, f"Feed endpoint failed: {response.text}"
        
        data = response.json()
        assert "trending" in data, "Response missing 'trending' field"
        assert isinstance(data["trending"], list), "'trending' should be a list"
    
    def test_trending_has_max_3_videos(self):
        """Verify trending array has at most 3 videos"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        assert len(trending) <= 3, f"Expected max 3 trending videos, got {len(trending)}"
    
    def test_trending_videos_sorted_by_view_count_descending(self):
        """Verify trending videos are sorted by view_count descending"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        if len(trending) > 1:
            view_counts = [v.get("view_count", 0) for v in trending]
            assert view_counts == sorted(view_counts, reverse=True), \
                f"Trending not sorted by view_count desc: {view_counts}"
    
    def test_trending_videos_have_minimum_100_views(self):
        """Verify all trending videos have at least 100 views"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        for video in trending:
            view_count = video.get("view_count", 0)
            assert view_count >= 100, \
                f"Video {video.get('video_id')} has {view_count} views, expected >= 100"
    
    def test_trending_video_has_required_fields(self):
        """Verify trending videos have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        required_fields = [
            "video_id", "title", "thumbnail_url", "url", 
            "university_name", "view_count", "published_at"
        ]
        
        for video in trending:
            for field in required_fields:
                assert field in video, f"Trending video missing field: {field}"
    
    def test_feed_response_structure(self):
        """Verify feed response has all expected top-level fields"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ["videos", "trending", "school_count", "total_videos"]
        for field in expected_fields:
            assert field in data, f"Response missing field: {field}"
    
    def test_trending_videos_have_youtube_url_format(self):
        """Verify trending video URLs are valid YouTube watch URLs"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        for video in trending:
            url = video.get("url", "")
            assert url.startswith("https://www.youtube.com/watch?v="), \
                f"Invalid YouTube URL: {url}"
    
    def test_current_trending_data_accuracy(self):
        """Verify current trending data matches expected values (integration check)"""
        response = self.session.get(f"{BASE_URL}/api/social-spotlight/feed")
        assert response.status_code == 200
        
        trending = response.json().get("trending", [])
        
        # Should have 3 trending videos
        assert len(trending) == 3, f"Expected 3 trending videos, got {len(trending)}"
        
        # First video should have highest view count (956 based on prior verification)
        if trending:
            top_video = trending[0]
            assert top_video.get("view_count", 0) > 0, "Top trending video should have views"
            assert top_video.get("university_name"), "Top video should have university_name"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
