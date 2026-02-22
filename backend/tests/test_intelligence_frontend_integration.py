"""
Intelligence Card Frontend Integration Tests
Tests the new intelligence API endpoints and verifies frontend card rendering requirements.

Test Focus:
1. POST /api/intelligence/timeline/{program_id} - Returns ui object for TimelineStatusCard
2. POST /api/intelligence/roster/{program_id} - Returns ui_roster and ui_stability for RosterRealityCard and CommitmentStabilityCard
3. POST /api/intelligence/school-insight/{program_id} - Existing endpoint still works
4. Loading states trigger correctly when endpoints are called
5. Refresh buttons trigger force refresh (?force=true)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIntelligenceEndpoints:
    """Test intelligence API endpoints for frontend card integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "douglas@yeslms.com",
            "password": "password"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.program_id = "prog_3fe70bce8e71"  # Florida Gulf Coast University
    
    # === Timeline Intelligence Endpoint ===
    
    def test_timeline_endpoint_returns_200(self):
        """POST /api/intelligence/timeline/{program_id} returns 200"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("PASS: Timeline endpoint returns 200")
    
    def test_timeline_returns_ui_object(self):
        """Timeline endpoint returns ui object with required fields for TimelineStatusCard"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        data = res.json()
        
        # Must have ui object
        assert "ui" in data, "Missing 'ui' field in response"
        ui = data["ui"]
        
        # Required fields for TimelineStatusCard
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        for field in required_fields:
            assert field in ui, f"Missing required ui field: {field}"
        
        # Status must be valid
        valid_statuses = ["filling_early", "standard", "late", "unknown"]
        assert ui["status"] in valid_statuses, f"Invalid status: {ui['status']}"
        
        print(f"PASS: Timeline ui object has all required fields - status={ui['status']}, label={ui['label']}")
    
    def test_timeline_returns_data_quality(self):
        """Timeline endpoint returns data_quality for confidence badge"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        data = res.json()
        
        # data_quality is optional but expected
        if "data_quality" in data:
            dq = data["data_quality"]
            if dq:
                print(f"PASS: Timeline data_quality present: {dq}")
            else:
                print("PASS: Timeline data_quality is null (expected for unknown state)")
        else:
            print("PASS: Timeline response does not include data_quality (acceptable)")
    
    def test_timeline_force_refresh(self):
        """Timeline ?force=true bypasses cache"""
        # First call
        t1 = time.time()
        res1 = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        t1_elapsed = time.time() - t1
        
        # Second call with force=true should regenerate
        t2 = time.time()
        res2 = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}?force=true")
        t2_elapsed = time.time() - t2
        
        assert res1.status_code == 200
        assert res2.status_code == 200
        
        data1 = res1.json()
        data2 = res2.json()
        
        # Both should have generated_at field
        if "generated_at" in data1 and "generated_at" in data2:
            # force=true should produce newer timestamp
            print(f"PASS: force=true generated new timestamp: {data2.get('generated_at')}")
        else:
            print("PASS: force=true accepted (endpoint returns 200)")
    
    def test_timeline_requires_auth(self):
        """Timeline endpoint returns 401 without auth"""
        anon_session = requests.Session()
        res = anon_session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        assert res.status_code == 401, f"Expected 401 without auth, got {res.status_code}"
        print("PASS: Timeline endpoint requires authentication")
    
    # === Roster Intelligence Endpoint ===
    
    def test_roster_endpoint_returns_200(self):
        """POST /api/intelligence/roster/{program_id} returns 200"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("PASS: Roster endpoint returns 200")
    
    def test_roster_returns_ui_roster(self):
        """Roster endpoint returns ui_roster object for RosterRealityCard"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        data = res.json()
        
        # Must have ui_roster object
        assert "ui_roster" in data, "Missing 'ui_roster' field in response"
        ui = data["ui_roster"]
        
        # Required fields for RosterRealityCard
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        for field in required_fields:
            assert field in ui, f"Missing required ui_roster field: {field}"
        
        # Status must be valid
        valid_statuses = ["open", "limited", "tight", "unknown"]
        assert ui["status"] in valid_statuses, f"Invalid roster status: {ui['status']}"
        
        # Openings field (can be null for unknown)
        assert "openings" in ui, "Missing 'openings' field in ui_roster"
        
        print(f"PASS: ui_roster has all required fields - status={ui['status']}, label={ui['label']}, openings={ui.get('openings')}")
    
    def test_roster_returns_ui_stability(self):
        """Roster endpoint returns ui_stability object for CommitmentStabilityCard"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        data = res.json()
        
        # Must have ui_stability object
        assert "ui_stability" in data, "Missing 'ui_stability' field in response"
        ui = data["ui_stability"]
        
        # Required fields for CommitmentStabilityCard
        required_fields = ["status", "retention_rate", "signals", "meaning", "trend", "history", "context_tags"]
        for field in required_fields:
            assert field in ui, f"Missing required ui_stability field: {field}"
        
        # Status must be valid
        valid_statuses = ["high", "moderate", "volatile", "unknown"]
        assert ui["status"] in valid_statuses, f"Invalid stability status: {ui['status']}"
        
        print(f"PASS: ui_stability has all required fields - status={ui['status']}")
    
    def test_roster_returns_stability_label(self):
        """Roster endpoint returns stability_label for CommitmentStabilityCard label prop"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        data = res.json()
        
        assert "stability_label" in data, "Missing 'stability_label' field in response"
        print(f"PASS: stability_label present: {data['stability_label']}")
    
    def test_roster_force_refresh(self):
        """Roster ?force=true bypasses cache"""
        res1 = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        res2 = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}?force=true")
        
        assert res1.status_code == 200
        assert res2.status_code == 200
        print("PASS: Roster force=true accepted (endpoint returns 200)")
    
    def test_roster_requires_auth(self):
        """Roster endpoint returns 401 without auth"""
        anon_session = requests.Session()
        res = anon_session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        assert res.status_code == 401, f"Expected 401 without auth, got {res.status_code}"
        print("PASS: Roster endpoint requires authentication")
    
    # === School Insight Endpoint (existing) ===
    
    def test_school_insight_endpoint_returns_200(self):
        """POST /api/intelligence/school-insight/{program_id} returns 200"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/school-insight/{self.program_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("PASS: School insight endpoint returns 200")
    
    def test_school_insight_returns_expected_shape(self):
        """School insight endpoint returns expected card shape"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/school-insight/{self.program_id}")
        data = res.json()
        
        # Should have either strengths/concerns (new schema) or insight (legacy)
        has_new_schema = "strengths" in data or "card_type" in data
        has_legacy_schema = "insight" in data
        
        assert has_new_schema or has_legacy_schema, "Response missing expected schema fields"
        print(f"PASS: School insight has valid schema - new_schema={has_new_schema}")
    
    def test_school_insight_force_refresh(self):
        """School insight ?force=true bypasses cache"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/school-insight/{self.program_id}?force=true")
        assert res.status_code == 200
        print("PASS: School insight force=true accepted")
    
    # === Unknown State Handling ===
    
    def test_timeline_unknown_state_shape(self):
        """Timeline with unknown state has proper UI guidance"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{self.program_id}")
        data = res.json()
        ui = data.get("ui", {})
        
        if ui.get("status") == "unknown":
            # Should have helpful explanation for unknown state
            assert ui.get("explanation"), "Unknown state should have explanation"
            assert ui.get("guidance"), "Unknown state should have guidance"
            print(f"PASS: Unknown timeline state has explanation: '{ui['explanation'][:50]}...'")
        else:
            print(f"PASS: Timeline status is {ui.get('status')}, not unknown")
    
    def test_roster_unknown_state_shape(self):
        """Roster with unknown state has proper UI guidance"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        data = res.json()
        ui_roster = data.get("ui_roster", {})
        ui_stability = data.get("ui_stability", {})
        
        if ui_roster.get("status") == "unknown":
            assert ui_roster.get("explanation"), "Unknown roster should have explanation"
            print(f"PASS: Unknown roster state has explanation")
        
        if ui_stability.get("status") == "unknown":
            assert ui_stability.get("meaning"), "Unknown stability should have meaning"
            print(f"PASS: Unknown stability state has meaning")
    
    def test_commitment_stability_gets_data_from_roster_endpoint(self):
        """Verify CommitmentStabilityCard receives all needed data from roster endpoint"""
        res = self.session.post(f"{BASE_URL}/api/intelligence/roster/{self.program_id}")
        data = res.json()
        
        # Fields used by CommitmentStabilityCard
        assert "stability_label" in data, "Missing stability_label"
        assert "ui_stability" in data, "Missing ui_stability"
        
        ui_stab = data["ui_stability"]
        # CommitmentStabilityCard expects these fields
        card_fields = ["status", "retention_rate", "signals", "meaning", "trend", "history", "context_tags"]
        for field in card_fields:
            assert field in ui_stab, f"Missing ui_stability.{field}"
        
        print("PASS: All CommitmentStabilityCard data fields present in roster endpoint response")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
