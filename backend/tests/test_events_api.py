"""
Test Events CRUD API endpoints
Tests: POST, GET, PUT, DELETE /api/events
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token from the testing request
TEST_SESSION_TOKEN = "sess_visual_test_587b350f"


@pytest.fixture
def auth_cookies():
    """Return cookies with test session token"""
    return {"session_token": TEST_SESSION_TOKEN}


class TestEventsAPI:
    """Events CRUD API tests"""
    
    created_event_ids = []  # Track created events for cleanup
    
    @pytest.fixture(autouse=True)
    def setup_cleanup(self):
        """Cleanup events after tests"""
        yield
        # Cleanup created test events
        for event_id in self.created_event_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/events/{event_id}",
                    cookies={"session_token": TEST_SESSION_TOKEN}
                )
            except:
                pass
        self.created_event_ids.clear()
    
    def test_auth_required_for_events(self):
        """Test that events endpoints require authentication"""
        # GET /events without auth
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/events returns 401 without auth")
        
        # POST /events without auth
        response = requests.post(f"{BASE_URL}/api/events", json={"title": "Test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/events returns 401 without auth")
    
    def test_list_events_authenticated(self, auth_cookies):
        """Test GET /api/events with authentication"""
        response = requests.get(f"{BASE_URL}/api/events", cookies=auth_cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/events returns 200 with {len(data)} events")
    
    def test_create_event_success(self, auth_cookies):
        """Test POST /api/events - create a new event"""
        test_title = f"TEST_Camp_{uuid.uuid4().hex[:8]}"
        event_data = {
            "title": test_title,
            "event_type": "Camp",
            "location": "Lincoln, NE",
            "description": "Test volleyball camp",
            "start_date": "2026-02-15",
            "end_date": "2026-02-16",
            "start_time": "09:00",
            "end_time": "17:00",
            "program_id": "",
            "color": "purple"
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, cookies=auth_cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_id" in data, "Response should contain event_id"
        assert data["title"] == test_title, f"Title mismatch: {data['title']} != {test_title}"
        assert data["event_type"] == "Camp", f"Event type mismatch: {data['event_type']}"
        assert data["location"] == "Lincoln, NE", f"Location mismatch: {data['location']}"
        assert data["start_date"] == "2026-02-15", f"Start date mismatch: {data['start_date']}"
        
        self.created_event_ids.append(data["event_id"])
        print(f"✓ POST /api/events creates event with id: {data['event_id']}")
        
        # Verify persistence - GET to confirm
        get_response = requests.get(f"{BASE_URL}/api/events/{data['event_id']}", cookies=auth_cookies)
        assert get_response.status_code == 200, f"Expected 200 for GET, got {get_response.status_code}"
        fetched = get_response.json()
        assert fetched["title"] == test_title, "Created event should be retrievable"
        print("✓ Created event is retrievable via GET /api/events/{id}")
        
        return data["event_id"]
    
    def test_create_event_empty_title_returns_400(self, auth_cookies):
        """Test POST /api/events with empty title returns 400"""
        event_data = {
            "title": "",
            "event_type": "Camp",
            "start_date": "2026-02-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, cookies=auth_cookies)
        assert response.status_code == 400, f"Expected 400 for empty title, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"✓ POST /api/events with empty title returns 400: {data['detail']}")
    
    def test_create_event_whitespace_title_returns_400(self, auth_cookies):
        """Test POST /api/events with whitespace-only title returns 400"""
        event_data = {
            "title": "   ",
            "event_type": "Showcase",
            "start_date": "2026-03-01"
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, cookies=auth_cookies)
        assert response.status_code == 400, f"Expected 400 for whitespace title, got {response.status_code}"
        print("✓ POST /api/events with whitespace title returns 400")
    
    def test_get_single_event(self, auth_cookies):
        """Test GET /api/events/{event_id}"""
        # First create an event
        test_title = f"TEST_Showcase_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/events", json={
            "title": test_title,
            "event_type": "Showcase",
            "location": "Austin, TX",
            "start_date": "2026-03-10"
        }, cookies=auth_cookies)
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        self.created_event_ids.append(event_id)
        
        # Now GET the event
        response = requests.get(f"{BASE_URL}/api/events/{event_id}", cookies=auth_cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["event_id"] == event_id, "Event ID should match"
        assert data["title"] == test_title, "Title should match"
        assert data["event_type"] == "Showcase", "Event type should match"
        print(f"✓ GET /api/events/{event_id} returns correct event data")
    
    def test_get_nonexistent_event_returns_404(self, auth_cookies):
        """Test GET /api/events/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/events/nonexistent_event_id", cookies=auth_cookies)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/events/{nonexistent_id} returns 404")
    
    def test_update_event(self, auth_cookies):
        """Test PUT /api/events/{event_id} - update an event"""
        # Create event
        test_title = f"TEST_Tournament_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/events", json={
            "title": test_title,
            "event_type": "Tournament",
            "location": "Denver, CO",
            "start_date": "2026-04-01"
        }, cookies=auth_cookies)
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        self.created_event_ids.append(event_id)
        
        # Update event
        updated_title = f"UPDATED_{test_title}"
        update_response = requests.put(f"{BASE_URL}/api/events/{event_id}", json={
            "title": updated_title,
            "location": "Boulder, CO",
            "end_date": "2026-04-02"
        }, cookies=auth_cookies)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        updated = update_response.json()
        assert updated["title"] == updated_title, f"Title not updated: {updated['title']}"
        assert updated["location"] == "Boulder, CO", f"Location not updated: {updated['location']}"
        assert updated["end_date"] == "2026-04-02", f"End date not updated"
        print(f"✓ PUT /api/events/{event_id} updates event correctly")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}", cookies=auth_cookies)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == updated_title, "Update should be persisted"
        print("✓ Updated event changes are persisted in database")
    
    def test_update_nonexistent_event_returns_404(self, auth_cookies):
        """Test PUT /api/events/{invalid_id} returns 404"""
        response = requests.put(f"{BASE_URL}/api/events/nonexistent_event_id", json={
            "title": "Updated Title"
        }, cookies=auth_cookies)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/events/{nonexistent_id} returns 404")
    
    def test_delete_event(self, auth_cookies):
        """Test DELETE /api/events/{event_id}"""
        # Create event
        test_title = f"TEST_Visit_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/events", json={
            "title": test_title,
            "event_type": "Visit",
            "start_date": "2026-05-01"
        }, cookies=auth_cookies)
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Delete event
        delete_response = requests.delete(f"{BASE_URL}/api/events/{event_id}", cookies=auth_cookies)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("ok") == True, "Should return ok: true"
        print(f"✓ DELETE /api/events/{event_id} returns 200")
        
        # Verify deletion - GET should return 404
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}", cookies=auth_cookies)
        assert get_response.status_code == 404, f"Expected 404 after delete, got {get_response.status_code}"
        print("✓ Deleted event is no longer retrievable (404)")
    
    def test_delete_nonexistent_event_returns_404(self, auth_cookies):
        """Test DELETE /api/events/{invalid_id} returns 404"""
        response = requests.delete(f"{BASE_URL}/api/events/nonexistent_event_id", cookies=auth_cookies)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /api/events/{nonexistent_id} returns 404")
    
    def test_list_events_with_date_filters(self, auth_cookies):
        """Test GET /api/events with date filters"""
        # Create test event with known date
        test_title = f"TEST_DateFilter_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/events", json={
            "title": test_title,
            "event_type": "Meeting",
            "start_date": "2026-06-15"
        }, cookies=auth_cookies)
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        self.created_event_ids.append(event_id)
        
        # Test date filter - should include the event
        response = requests.get(f"{BASE_URL}/api/events", params={
            "start_date": "2026-06-01",
            "end_date": "2026-06-30"
        }, cookies=auth_cookies)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check if our event is in the filtered results
        event_ids = [e["event_id"] for e in data]
        assert event_id in event_ids, "Created event should be in date-filtered results"
        print(f"✓ GET /api/events with date filters works correctly")
    
    def test_create_all_event_types(self, auth_cookies):
        """Test creating events with all supported event types"""
        event_types = ["Camp", "Showcase", "Tournament", "Visit", "Tryout", "Meeting", "Deadline", "Other"]
        
        for evt_type in event_types:
            test_title = f"TEST_{evt_type}_{uuid.uuid4().hex[:8]}"
            response = requests.post(f"{BASE_URL}/api/events", json={
                "title": test_title,
                "event_type": evt_type,
                "start_date": "2026-07-01"
            }, cookies=auth_cookies)
            
            assert response.status_code == 200, f"Failed to create {evt_type} event: {response.text}"
            data = response.json()
            assert data["event_type"] == evt_type, f"Event type mismatch: {data['event_type']} != {evt_type}"
            self.created_event_ids.append(data["event_id"])
        
        print(f"✓ All event types ({', '.join(event_types)}) can be created")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
