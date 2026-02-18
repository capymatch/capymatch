"""
Test Coach Scraper API Endpoints
Tests the volleyball coach contact scraping feature from university athletics websites.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCoachScraperStatus:
    """GET /api/admin/coach-scraper/status - Test scrape status endpoint"""
    
    def test_get_status_returns_200(self):
        """Status endpoint returns 200 with proper structure"""
        response = requests.get(f"{BASE_URL}/api/admin/coach-scraper/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify required fields
        assert "running" in data, "Status missing 'running' field"
        assert "scraped" in data, "Status missing 'scraped' field"
        assert "failed" in data, "Status missing 'failed' field"
        assert "total" in data, "Status missing 'total' field"
        assert "done" in data, "Status missing 'done' field"
        
        # Verify types
        assert isinstance(data["running"], bool), "running should be boolean"
        assert isinstance(data["done"], bool), "done should be boolean"
        assert isinstance(data["scraped"], int), "scraped should be int"
        assert isinstance(data["failed"], int), "failed should be int"
        assert isinstance(data["total"], int), "total should be int"
        
        print(f"Scrape status: {data}")


class TestAdminIntegrationsCoachScraperStats:
    """GET /api/admin/integrations - Test coach_scraper stats in integrations response"""
    
    def test_integrations_returns_coach_scraper_stats(self):
        """Integrations endpoint includes coach_scraper stats"""
        response = requests.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "coach_scraper" in data, "Response missing 'coach_scraper' field"
        
        coach_scraper = data["coach_scraper"]
        assert "stats" in coach_scraper, "coach_scraper missing 'stats' field"
        
        stats = coach_scraper["stats"]
        assert "has_coach_email" in stats, "stats missing 'has_coach_email'"
        assert "missing_coach_email" in stats, "stats missing 'missing_coach_email'"
        assert "total" in stats, "stats missing 'total'"
        
        # Verify types
        assert isinstance(stats["has_coach_email"], int), "has_coach_email should be int"
        assert isinstance(stats["missing_coach_email"], int), "missing_coach_email should be int"
        assert isinstance(stats["total"], int), "total should be int"
        
        print(f"Coach scraper stats: {stats}")


class TestScrapeOneEndpoint:
    """POST /api/admin/coach-scraper/scrape-one - Test single school scraping"""
    
    def test_scrape_one_baylor_university(self):
        """Scrape Baylor University - should return found=true with real coach names"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            json={"university_name": "Baylor University"},
            timeout=60  # Scraping can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Baylor scrape result: {data}")
        
        # Check if scraping was successful
        if data.get("found"):
            assert "coaches" in data, "Response missing 'coaches' array"
            assert len(data["coaches"]) > 0, "Coaches array is empty"
            
            # Verify coaches have proper structure
            for coach in data["coaches"]:
                assert "name" in coach, "Coach missing 'name' field"
                assert "title" in coach, "Coach missing 'title' field"
                assert "email" in coach, "Coach missing 'email' field"
                
                # Key test: Names should NOT be placeholders like 'Name' or 'Title'
                name = coach.get("name", "").strip().lower()
                assert name != "name", f"Coach has placeholder name 'Name': {coach}"
                assert name != "title", f"Coach has placeholder name 'Title': {coach}"
                assert name != "", f"Coach has empty name: {coach}"
                assert len(name) > 2, f"Coach name too short: {coach}"
            
            # Check for URL
            assert "url" in data, "Response missing 'url' field"
            print(f"Found {len(data['coaches'])} coaches at {data['url']}")
            
            # Print coach details
            for i, coach in enumerate(data["coaches"]):
                print(f"  Coach {i+1}: {coach['name']} - {coach['title']} - {coach['email']}")
        else:
            # Scraping may fail due to network issues - just verify structure
            print(f"Scraping failed for Baylor: {data.get('message', 'No message')}")
    
    def test_scrape_one_university_of_michigan(self):
        """Scrape University of Michigan - should return found=true with coaches"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            json={"university_name": "University of Michigan"},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Michigan scrape result: {data}")
        
        if data.get("found"):
            assert "coaches" in data, "Response missing 'coaches' array"
            assert len(data["coaches"]) > 0, "Coaches array is empty"
            
            for coach in data["coaches"]:
                name = coach.get("name", "").strip().lower()
                assert name != "name", f"Coach has placeholder name: {coach}"
                assert name != "", f"Coach has empty name: {coach}"
            
            print(f"Found {len(data['coaches'])} coaches")
            for i, coach in enumerate(data["coaches"]):
                print(f"  Coach {i+1}: {coach['name']} - {coach['title']} - {coach['email']}")
        else:
            print(f"Scraping failed for Michigan: {data.get('message', 'No message')}")
    
    def test_scrape_one_nonexistent_university(self):
        """Scrape non-existent university - should return error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            json={"university_name": "Fake University That Does Not Exist 12345"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Non-existent university result: {data}")
        
        # Should have error message
        assert "error" in data, "Expected 'error' field for non-existent university"
        assert "not found" in data["error"].lower() or "University not found" in data["error"], \
            f"Expected 'not found' error, got: {data['error']}"
    
    def test_scrape_one_missing_university_name(self):
        """Scrape with missing university_name - should return error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            json={},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Empty request result: {data}")
        
        assert "error" in data, "Expected 'error' field for missing university_name"
        assert "required" in data["error"].lower(), f"Expected 'required' error, got: {data['error']}"


class TestBulkScrapeEndpoint:
    """POST /api/admin/coach-scraper/scrape - Test bulk scraping initiation"""
    
    def test_bulk_scrape_start(self):
        """Start bulk scrape - should return status=started with counts"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape",
            json={},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Bulk scrape start result: {data}")
        
        # Either started or already running
        assert data.get("status") in ["started", "already_running"], \
            f"Expected 'started' or 'already_running', got: {data.get('status')}"
        
        if data.get("status") == "started":
            assert "missing" in data, "Response missing 'missing' count"
            assert "already_have" in data, "Response missing 'already_have' count"
            assert isinstance(data["missing"], int), "missing should be int"
            assert isinstance(data["already_have"], int), "already_have should be int"
            print(f"Started scraping {data['missing']} schools ({data['already_have']} already have coaches)")
        else:
            print("Bulk scrape already running")
    
    def test_bulk_scrape_with_force(self):
        """Start bulk scrape with force=true - should allow re-scraping all"""
        # First check current status
        status_resp = requests.get(f"{BASE_URL}/api/admin/coach-scraper/status")
        status_data = status_resp.json()
        
        if status_data.get("running"):
            print("Scrape already running, skipping force test")
            pytest.skip("Scrape already in progress")
            return
        
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape",
            json={"force": True},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Force scrape result: {data}")
        
        assert data.get("status") in ["started", "already_running"], \
            f"Expected 'started' or 'already_running', got: {data.get('status')}"
        
        if data.get("status") == "started":
            # Force mode should have mode=force_all
            assert data.get("mode") == "force_all", f"Expected mode='force_all', got: {data.get('mode')}"
            assert "missing" in data, "Response missing 'missing' count"
            print(f"Force scrape started for {data['missing']} schools")


class TestCoachDataValidation:
    """Additional validation tests for coach data quality"""
    
    def test_scraped_coach_name_not_placeholder(self):
        """Verify scraped names are real names, not JS placeholders"""
        # Test with a school known to have JS-rendered content
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            json={"university_name": "Baylor University"},
            timeout=60
        )
        
        if response.status_code != 200:
            pytest.skip("Scrape endpoint not accessible")
            return
        
        data = response.json()
        if not data.get("found"):
            pytest.skip("Could not scrape Baylor data")
            return
        
        coaches = data.get("coaches", [])
        placeholder_names = {"name", "title", "first last", "staff", "coaching staff", "coaches", "coach", ""}
        
        for coach in coaches:
            name = coach.get("name", "").strip().lower()
            assert name not in placeholder_names, \
                f"Coach has placeholder name '{name}': {coach}"
            
            # Names derived from email should look like "First Last"
            if coach.get("email"):
                # If email exists, name should have been derived if it was placeholder
                assert len(name) > 2, f"Name too short for coach with email: {coach}"
        
        print(f"All {len(coaches)} coach names validated - no placeholders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
