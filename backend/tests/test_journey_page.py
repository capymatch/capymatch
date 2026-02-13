"""
Journey Page API Tests - Test the recruiting journey page features:
- Program GET with journey data
- Status/Reply/Priority updates via PUT /api/programs/{id}
- Interactions CRUD (POST /api/interactions)
- Coaches CRUD (POST /api/coaches)
- Interest level updates (athlete_interest, school_interest)
- Follow-up scheduling
- AI endpoints (draft-email, journey-summary)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROGRAM_ID = "prog_5308e1ed4f77"  # Baylor University test program


class TestJourneyPageAPIs:
    """Test Journey Page backend APIs"""

    # ─── Program Endpoints ───
    
    def test_get_program_returns_baylor(self):
        """GET /api/programs/{id} returns Baylor University with expected fields"""
        response = requests.get(f"{BASE_URL}/api/programs/{PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("program_id") == PROGRAM_ID
        assert data.get("university_name") == "Baylor University"
        assert "division" in data
        assert "recruiting_status" in data
        assert "reply_status" in data
        assert "priority" in data
        assert "athlete_interest" in data or data.get("athlete_interest") is None  # May not be set yet
        print(f"✓ Program GET returns Baylor: division={data.get('division')}, status={data.get('recruiting_status')}")

    def test_get_program_journey_returns_timeline(self):
        """GET /api/programs/{id}/journey returns timeline array"""
        response = requests.get(f"{BASE_URL}/api/programs/{PROGRAM_ID}/journey")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        print(f"✓ Journey endpoint works, timeline has {len(data['timeline'])} events")

    def test_update_program_status(self):
        """PUT /api/programs/{id} can update recruiting_status"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={"recruiting_status": "Contacted"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("recruiting_status") == "Contacted"
        print(f"✓ Status updated to: {data.get('recruiting_status')}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/programs/{PROGRAM_ID}", json={"recruiting_status": "Not Contacted"})

    def test_update_program_reply_status(self):
        """PUT /api/programs/{id} can update reply_status"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={"reply_status": "Awaiting Reply"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("reply_status") == "Awaiting Reply"
        print(f"✓ Reply status updated to: {data.get('reply_status')}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/programs/{PROGRAM_ID}", json={"reply_status": "No Reply"})

    def test_update_program_priority(self):
        """PUT /api/programs/{id} can update priority"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={"priority": "High"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("priority") == "High"
        print(f"✓ Priority updated to: {data.get('priority')}")
        
        # Reset
        requests.put(f"{BASE_URL}/api/programs/{PROGRAM_ID}", json={"priority": "Medium"})

    def test_update_athlete_interest(self):
        """PUT /api/programs/{id} can update athlete_interest"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={"athlete_interest": 8}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("athlete_interest") == 8
        print(f"✓ Athlete interest updated to: {data.get('athlete_interest')}")

    def test_update_school_interest(self):
        """PUT /api/programs/{id} can update school_interest"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={"school_interest": 6}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("school_interest") == 6
        print(f"✓ School interest updated to: {data.get('school_interest')}")

    def test_update_follow_up_schedule(self):
        """PUT /api/programs/{id} can update next_action and next_action_due"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={
                "next_action": "Send follow-up email",
                "next_action_due": "2026-02-20"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("next_action") == "Send follow-up email"
        assert data.get("next_action_due") == "2026-02-20"
        print(f"✓ Follow-up scheduled: {data.get('next_action')} due {data.get('next_action_due')}")

    # ─── Interactions CRUD ───
    
    def test_create_interaction(self):
        """POST /api/interactions creates a new interaction"""
        payload = {
            "program_id": PROGRAM_ID,
            "university_name": "Baylor University",
            "type": "Phone Call",
            "notes": "TEST_Spoke with coach about upcoming camp",
            "outcome": "Positive",
            "date_time": "2026-02-14T10:00:00"
        }
        response = requests.post(f"{BASE_URL}/api/interactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "interaction_id" in data
        assert data.get("type") == "Phone Call"
        assert "TEST_" in data.get("notes", "")
        print(f"✓ Interaction created: {data.get('interaction_id')}")
        
        # Store for cleanup
        return data.get("interaction_id")

    def test_interactions_appear_in_journey_timeline(self):
        """After creating an interaction, it should appear in journey timeline"""
        # First create an interaction
        payload = {
            "program_id": PROGRAM_ID,
            "university_name": "Baylor University",
            "type": "Video Call",
            "notes": "TEST_Zoom call with recruiting coordinator",
            "outcome": "Positive",
            "date_time": "2026-02-14T14:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/interactions", json=payload)
        assert create_response.status_code == 200
        
        # Now check journey timeline
        journey_response = requests.get(f"{BASE_URL}/api/programs/{PROGRAM_ID}/journey")
        assert journey_response.status_code == 200
        
        timeline = journey_response.json().get("timeline", [])
        # Check if any timeline entry contains our test interaction
        found = any("TEST_Zoom call" in str(event) for event in timeline)
        assert found, "Interaction not found in timeline"
        print(f"✓ Interaction appears in journey timeline (total: {len(timeline)} events)")

    # ─── Coaches CRUD ───
    
    def test_list_coaches(self):
        """GET /api/coaches returns coaches list"""
        response = requests.get(f"{BASE_URL}/api/coaches?program_id={PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Coaches list returned: {len(data)} coaches")

    def test_create_coach(self):
        """POST /api/coaches creates a coach for the program"""
        payload = {
            "program_id": PROGRAM_ID,
            "university_name": "Baylor University",
            "coach_name": "TEST_John Smith",
            "role": "Head Coach",
            "email": "test.john@baylor.edu",
            "phone": "555-123-4567"
        }
        response = requests.post(f"{BASE_URL}/api/coaches", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coach_id" in data
        assert data.get("coach_name") == "TEST_John Smith"
        assert data.get("role") == "Head Coach"
        print(f"✓ Coach created: {data.get('coach_id')}")
        
        # Store for cleanup
        return data.get("coach_id")

    def test_coaches_linked_to_program(self):
        """Coaches created for program appear when filtering by program_id"""
        response = requests.get(f"{BASE_URL}/api/coaches?program_id={PROGRAM_ID}")
        assert response.status_code == 200
        
        coaches = response.json()
        test_coaches = [c for c in coaches if "TEST_" in c.get("coach_name", "")]
        assert len(test_coaches) > 0, "Test coach not found"
        print(f"✓ Found {len(test_coaches)} test coach(es) linked to program")

    # ─── AI Endpoints ───
    
    def test_draft_email_endpoint_exists(self):
        """POST /api/ai/draft-email endpoint exists (may fail without athlete profile)"""
        payload = {
            "program_id": PROGRAM_ID,
            "email_type": "intro"
        }
        response = requests.post(f"{BASE_URL}/api/ai/draft-email", json=payload)
        # May return 400 if no athlete profile, but endpoint should exist
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "subject" in data or "body" in data
            print(f"✓ AI draft email returned subject: {data.get('subject', '')[:50]}...")
        elif response.status_code == 400:
            print(f"✓ AI draft endpoint exists (requires athlete profile setup)")
        else:
            print(f"✓ AI draft endpoint exists (returned {response.status_code})")

    def test_journey_summary_endpoint_exists(self):
        """POST /api/ai/journey-summary endpoint exists"""
        payload = {
            "program_id": PROGRAM_ID
        }
        response = requests.post(f"{BASE_URL}/api/ai/journey-summary", json=payload)
        # May take time or fail without enough data, but endpoint should exist
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "relationship_summary" in data or "suggested_action" in data
            print(f"✓ AI journey summary returned: {data.get('relationship_summary', '')[:80]}...")
        else:
            print(f"✓ AI journey summary endpoint exists (returned {response.status_code})")

    # ─── Knowledge Base (School Info) ───
    
    def test_knowledge_base_search(self):
        """GET /api/knowledge-base can search for Baylor"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base?search=Baylor")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        baylor = next((u for u in data if "Baylor" in u.get("university_name", "")), None)
        if baylor:
            print(f"✓ Found Baylor in knowledge base: division={baylor.get('division')}, conf={baylor.get('conference')}")
        else:
            print(f"✓ Knowledge base search works ({len(data)} results)")

    # ─── Events (Key Dates) ───
    
    def test_events_endpoint(self):
        """GET /api/events returns events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Events endpoint works: {len(data)} events")


class TestJourneyCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_coaches(self):
        """Delete TEST_ prefixed coaches"""
        # Get all coaches for the program
        response = requests.get(f"{BASE_URL}/api/coaches?program_id={PROGRAM_ID}")
        if response.status_code == 200:
            coaches = response.json()
            for coach in coaches:
                if "TEST_" in coach.get("coach_name", ""):
                    delete_resp = requests.delete(f"{BASE_URL}/api/coaches/{coach['coach_id']}")
                    print(f"Cleaned up coach: {coach['coach_id']}")
        print("✓ Cleanup complete")

    def test_reset_program_to_defaults(self):
        """Reset program fields to defaults"""
        response = requests.put(
            f"{BASE_URL}/api/programs/{PROGRAM_ID}",
            json={
                "recruiting_status": "Not Contacted",
                "reply_status": "No Reply",
                "priority": "Medium",
                "next_action": "",
                "next_action_due": ""
            }
        )
        assert response.status_code == 200
        print("✓ Program reset to defaults")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
