"""
Test Suite for Coach Card Feature
Tests:
- Schedule CRUD endpoints (GET, POST, PUT, DELETE, bulk)
- Schedule AI parse endpoint
- Coach Card config endpoints (GET, PUT)
- Public Coach Card endpoint (GET /api/card/{slug})
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "demo@capymatch.com"
TEST_PASSWORD = "demo2026"

# Known test data
KNOWN_PROGRAM_ID = "prog_e8ee256e0c79"  # Stanford University
KNOWN_SLUG = "clara-gimenes-stanford-university-a73931"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code}")
    data = response.json()
    # API returns session_token, not token
    token = data.get("session_token") or data.get("token")
    if not token:
        pytest.skip("No session_token in login response")
    return token


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestScheduleEndpoints:
    """Schedule CRUD and parse endpoint tests."""
    
    created_event_id = None
    
    def test_get_schedule(self, api_client):
        """GET /api/schedule - returns events for authenticated user."""
        response = api_client.get(f"{BASE_URL}/api/schedule")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "events" in data, "Response should have 'events' key"
        assert isinstance(data["events"], list), "events should be a list"
        print(f"✓ GET /api/schedule returned {len(data['events'])} events")
    
    def test_post_schedule(self, api_client):
        """POST /api/schedule - creates a new event."""
        unique_name = f"TEST_Tournament_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": unique_name,
            "start_date": "2026-03-15",
            "end_date": "2026-03-16",
            "location": "San Diego, CA",
            "division": "16 Elite",
            "jersey_number": "7",
            "notes": "Test event"
        }
        response = api_client.post(f"{BASE_URL}/api/schedule", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "event_id" in data, "Response should contain event_id"
        assert data["name"] == unique_name, "Event name should match"
        assert data["location"] == "San Diego, CA", "Event location should match"
        TestScheduleEndpoints.created_event_id = data["event_id"]
        print(f"✓ POST /api/schedule created event: {data['event_id']}")
    
    def test_get_schedule_verify_creation(self, api_client):
        """GET /api/schedule - verify created event appears in list."""
        if not TestScheduleEndpoints.created_event_id:
            pytest.skip("No event was created in previous test")
        response = api_client.get(f"{BASE_URL}/api/schedule")
        assert response.status_code == 200
        data = response.json()
        event_ids = [e["event_id"] for e in data["events"]]
        assert TestScheduleEndpoints.created_event_id in event_ids, "Created event should be in schedule"
        print(f"✓ Created event {TestScheduleEndpoints.created_event_id} found in schedule")
    
    def test_put_schedule(self, api_client):
        """PUT /api/schedule/{event_id} - updates an event."""
        if not TestScheduleEndpoints.created_event_id:
            pytest.skip("No event was created in previous test")
        event_id = TestScheduleEndpoints.created_event_id
        updates = {
            "name": "TEST_Updated_Tournament",
            "location": "Los Angeles, CA"
        }
        response = api_client.put(f"{BASE_URL}/api/schedule/{event_id}", json=updates)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should have ok: True"
        print(f"✓ PUT /api/schedule/{event_id} updated successfully")
    
    def test_bulk_add_events(self, api_client):
        """POST /api/schedule/bulk - adds multiple events at once."""
        events = [
            {
                "name": f"TEST_Bulk_Event_1_{uuid.uuid4().hex[:4]}",
                "start_date": "2026-04-01",
                "end_date": "2026-04-02",
                "location": "Phoenix, AZ"
            },
            {
                "name": f"TEST_Bulk_Event_2_{uuid.uuid4().hex[:4]}",
                "start_date": "2026-04-15",
                "end_date": "2026-04-15",
                "location": "Denver, CO"
            }
        ]
        response = api_client.post(f"{BASE_URL}/api/schedule/bulk", json={"events": events})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "created" in data, "Response should have 'created' count"
        assert data["created"] == 2, "Should have created 2 events"
        assert len(data["events"]) == 2, "Should return 2 created events"
        # Store IDs for cleanup
        for ev in data["events"]:
            if ev["name"].startswith("TEST_"):
                # Delete bulk-created events
                api_client.delete(f"{BASE_URL}/api/schedule/{ev['event_id']}")
        print(f"✓ POST /api/schedule/bulk created {data['created']} events")
    
    def test_schedule_parse_ai(self, api_client):
        """POST /api/schedule/parse - AI-powered schedule parsing."""
        text = """
        Upcoming Tournament Schedule:
        1. West Coast Championship - January 3rd & 4th, 2026 - Las Vegas, NV - 16 Elite
        2. SoCal Qualifier - February 15, 2026 - Long Beach, CA - 18 Open
        3. Spring Showcase - March 20-22, 2026 - Phoenix, AZ
        """
        response = api_client.post(f"{BASE_URL}/api/schedule/parse", json={"text": text})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "events" in data, "Response should have 'events' key"
        # AI may or may not parse successfully, check for valid response
        if data.get("error"):
            print(f"⚠ AI parse returned error (may be rate limited): {data['error']}")
        else:
            assert isinstance(data["events"], list), "events should be a list"
            print(f"✓ POST /api/schedule/parse returned {len(data['events'])} parsed events")
    
    def test_delete_schedule(self, api_client):
        """DELETE /api/schedule/{event_id} - deletes an event."""
        if not TestScheduleEndpoints.created_event_id:
            pytest.skip("No event was created to delete")
        event_id = TestScheduleEndpoints.created_event_id
        response = api_client.delete(f"{BASE_URL}/api/schedule/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should have ok: True"
        print(f"✓ DELETE /api/schedule/{event_id} deleted successfully")
    
    def test_verify_deletion(self, api_client):
        """GET /api/schedule - verify deleted event no longer in list."""
        if not TestScheduleEndpoints.created_event_id:
            pytest.skip("No event was created to verify deletion")
        response = api_client.get(f"{BASE_URL}/api/schedule")
        assert response.status_code == 200
        data = response.json()
        event_ids = [e["event_id"] for e in data["events"]]
        assert TestScheduleEndpoints.created_event_id not in event_ids, "Deleted event should not be in schedule"
        print(f"✓ Deleted event no longer in schedule")


class TestCoachCardConfig:
    """Coach Card configuration endpoint tests."""
    
    def test_get_coach_card_config(self, api_client):
        """GET /api/coach-card/{program_id} - returns config or default."""
        response = api_client.get(f"{BASE_URL}/api/coach-card/{KNOWN_PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Check expected fields
        assert "program_id" in data, "Response should have program_id"
        assert "show_schedule" in data, "Response should have show_schedule toggle"
        assert "show_academics" in data, "Response should have show_academics toggle"
        assert "show_measurables" in data, "Response should have show_measurables toggle"
        assert "show_videos" in data, "Response should have show_videos toggle"
        print(f"✓ GET /api/coach-card/{KNOWN_PROGRAM_ID} returned config with slug: {data.get('slug', 'none')}")
    
    def test_put_coach_card_config(self, api_client):
        """PUT /api/coach-card/{program_id} - updates config and generates slug."""
        payload = {
            "coach_note": "Test note from pytest - excited about the program!",
            "featured_video": "https://youtube.com/watch?v=test123",
            "show_schedule": True,
            "show_academics": True,
            "show_measurables": True,
            "show_videos": True
        }
        response = api_client.put(f"{BASE_URL}/api/coach-card/{KNOWN_PROGRAM_ID}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "slug" in data, "Response should have generated slug"
        assert data["slug"], "Slug should not be empty"
        assert data["coach_note"] == payload["coach_note"], "Coach note should match"
        print(f"✓ PUT /api/coach-card/{KNOWN_PROGRAM_ID} updated with slug: {data['slug']}")
    
    def test_coach_card_config_persistence(self, api_client):
        """GET /api/coach-card - verify PUT changes persisted."""
        response = api_client.get(f"{BASE_URL}/api/coach-card/{KNOWN_PROGRAM_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "slug" in data and data["slug"], "Slug should persist"
        assert "coach_note" in data, "Coach note should persist"
        print(f"✓ Coach card config persisted correctly")


class TestPublicCoachCard:
    """Public Coach Card endpoint tests (no auth required)."""
    
    def test_get_public_coach_card(self):
        """GET /api/card/{slug} - returns public coach card data."""
        # Use direct requests without auth
        response = requests.get(f"{BASE_URL}/api/card/{KNOWN_SLUG}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "profile" in data, "Response should have 'profile'"
        assert "config" in data, "Response should have 'config'"
        assert "schedule" in data, "Response should have 'schedule'"
        assert "program" in data, "Response should have 'program'"
        
        # Validate profile fields
        profile = data["profile"]
        # Should have athlete_name or first/last name
        has_name = profile.get("athlete_name") or (profile.get("first_name") and profile.get("last_name"))
        assert has_name, "Profile should have name field"
        
        # Validate config fields
        config = data["config"]
        assert "show_schedule" in config, "Config should have show_schedule"
        assert "show_academics" in config, "Config should have show_academics"
        assert "show_measurables" in config, "Config should have show_measurables"
        
        print(f"✓ GET /api/card/{KNOWN_SLUG} returned public coach card data")
        print(f"  Profile: {profile.get('athlete_name', 'N/A')}")
        print(f"  Program: {data['program'].get('university_name', 'N/A')}")
        print(f"  Schedule events: {len(data['schedule'])}")
    
    def test_public_coach_card_not_found(self):
        """GET /api/card/{invalid_slug} - returns 404."""
        response = requests.get(f"{BASE_URL}/api/card/invalid-slug-that-does-not-exist")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/card/invalid-slug returned 404 as expected")


class TestScheduleAuthRequired:
    """Verify schedule endpoints require authentication."""
    
    def test_schedule_requires_auth(self):
        """GET /api/schedule without auth should return 401."""
        response = requests.get(f"{BASE_URL}/api/schedule")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/schedule requires auth (401)")
    
    def test_coach_card_config_requires_auth(self):
        """GET /api/coach-card/{program_id} without auth should return 401."""
        response = requests.get(f"{BASE_URL}/api/coach-card/{KNOWN_PROGRAM_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/coach-card requires auth (401)")


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup(api_client):
    """Cleanup TEST_ prefixed events after test module."""
    yield
    # Cleanup any remaining TEST_ events
    try:
        response = api_client.get(f"{BASE_URL}/api/schedule")
        if response.status_code == 200:
            events = response.json().get("events", [])
            for ev in events:
                if ev.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/schedule/{ev['event_id']}")
                    print(f"Cleaned up test event: {ev['event_id']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")
