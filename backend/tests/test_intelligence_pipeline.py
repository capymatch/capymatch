"""
Test Suite: Intelligence Pipeline for School Insight Card
Tests the 3-stage intelligence pipeline (Schema Mapper → Payload Builder → AI Agent)
for the 'Why This School / Why Not' card.
"""

import os
import time
import pytest
import requests

# Get the base URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "douglas@yeslms.com"
TEST_PASSWORD = "password"

# Test program IDs
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"  # D1 school with full data
TAMPA_PROGRAM_ID = "prog_0a5dfa9c59d1"  # School with no KB data


@pytest.fixture(scope="module")
def session():
    """Create authenticated session with cookies."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login to get session cookie
    login_response = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    return s


class TestSchoolInsightFGCU:
    """Tests for FGCU (D1 school with full data)"""

    def test_endpoint_returns_valid_json(self, session):
        """POST /api/intelligence/school-insight/{program_id} returns valid card JSON with status 'ok'"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert data.get("card_type") == "school_insight"
        assert data.get("school_id") == FGCU_PROGRAM_ID
        print(f"PASS: FGCU endpoint returns status 'ok' with card_type 'school_insight'")

    def test_strengths_structure(self, session):
        """Card JSON contains exactly 3 strengths with text, based_on, citations, evidence fields"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        data = response.json()
        
        strengths = data.get("strengths", [])
        assert len(strengths) == 3, f"Expected 3 strengths, got {len(strengths)}"
        
        for i, s in enumerate(strengths):
            assert "text" in s, f"Strength {i} missing 'text' field"
            assert isinstance(s["text"], str), f"Strength {i} 'text' should be string"
            assert "based_on" in s, f"Strength {i} missing 'based_on' field"
            assert isinstance(s["based_on"], list), f"Strength {i} 'based_on' should be list"
            assert "citations" in s, f"Strength {i} missing 'citations' field"
            assert isinstance(s["citations"], list), f"Strength {i} 'citations' should be list"
            assert "evidence" in s, f"Strength {i} missing 'evidence' field"
            assert s["evidence"] in ["strong", "partial"], f"Strength {i} evidence should be strong/partial"
            
            # Validate citations structure
            for c in s["citations"]:
                assert "section" in c, f"Citation missing 'section'"
                assert "source_id" in c, f"Citation missing 'source_id'"
        
        print(f"PASS: All 3 strengths have required fields (text, based_on, citations, evidence)")

    def test_concerns_structure(self, session):
        """Card JSON contains exactly 3 concerns with text, based_on, citations, evidence, severity fields"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        data = response.json()
        
        concerns = data.get("concerns", [])
        assert len(concerns) == 3, f"Expected 3 concerns, got {len(concerns)}"
        
        for i, c in enumerate(concerns):
            assert "text" in c, f"Concern {i} missing 'text' field"
            assert isinstance(c["text"], str), f"Concern {i} 'text' should be string"
            assert "based_on" in c, f"Concern {i} missing 'based_on' field"
            assert isinstance(c["based_on"], list), f"Concern {i} 'based_on' should be list"
            assert "citations" in c, f"Concern {i} missing 'citations' field"
            assert isinstance(c["citations"], list), f"Concern {i} 'citations' should be list"
            assert "evidence" in c, f"Concern {i} missing 'evidence' field"
            assert c["evidence"] in ["strong", "partial"], f"Concern {i} evidence should be strong/partial"
            assert "severity" in c, f"Concern {i} missing 'severity' field"
            assert c["severity"] in ["high", "medium", "low"], f"Concern {i} severity should be high/medium/low"
        
        print(f"PASS: All 3 concerns have required fields (text, based_on, citations, evidence, severity)")

    def test_unknowns_from_known_unknowns(self, session):
        """Card JSON contains unknowns array derived from known_unknowns"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        data = response.json()
        
        unknowns = data.get("unknowns", [])
        assert isinstance(unknowns, list), "unknowns should be a list"
        assert len(unknowns) > 0, "Expected at least one unknown"
        
        for u in unknowns:
            assert "text" in u, "Unknown missing 'text' field"
            assert "missing_data" in u, "Unknown missing 'missing_data' field"
            assert "unlock_hint" in u, "Unknown missing 'unlock_hint' field"
        
        print(f"PASS: {len(unknowns)} unknowns with text, missing_data, unlock_hint fields")

    def test_metadata_fields(self, session):
        """Card contains data_quality, summary, school_id, school_name, division, generated_at, cache_ttl_hours, model fields"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        data = response.json()
        
        required_fields = [
            "data_quality", "summary", "school_id", "school_name", 
            "division", "generated_at", "cache_ttl_hours", "model"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate specific values
        assert data["school_name"] == "Florida Gulf Coast University"
        assert data["division"] == "D1"
        assert data["cache_ttl_hours"] == 24
        assert data["model"] == "claude-sonnet-4-5"
        assert data["summary"] is not None, "Summary should not be None for status 'ok'"
        
        # Validate data_quality structure
        dq = data.get("data_quality", {})
        for section in ["school", "academics", "athlete", "roster", "timeline", "nil"]:
            assert section in dq, f"data_quality missing section: {section}"
            assert dq[section] in ["high", "partial", "low", "unknown"], f"Invalid quality rating for {section}"
        
        print(f"PASS: All metadata fields present with correct values")

    def test_cached_response_fast(self, session):
        """Cached response returns in under 2 seconds (no AI call on second request)"""
        # First call to ensure cache is populated
        session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        
        # Second call should be cached
        start = time.time()
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"Cached response took {elapsed:.2f}s, expected < 2s"
        print(f"PASS: Cached response returned in {elapsed:.2f}s (< 2s)")

    def test_force_bypasses_cache(self, session):
        """force=true query param bypasses cache and generates fresh response"""
        # Get initial generated_at
        resp1 = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        gen1 = resp1.json().get("generated_at")
        
        # Wait a moment
        time.sleep(1)
        
        # Force refresh
        resp2 = session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}?force=true")
        gen2 = resp2.json().get("generated_at")
        
        assert resp2.status_code == 200
        assert gen2 != gen1, f"Expected different generated_at timestamps, got same: {gen1}"
        print(f"PASS: force=true generated new timestamp {gen2} (was {gen1})")


class TestSchoolInsightTampa:
    """Tests for Tampa University (no KB data - insufficient data)"""

    def test_insufficient_data_status(self, session):
        """Tampa University (no KB data) returns status 'insufficient_data' with reason and missing_sections"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{TAMPA_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "insufficient_data", f"Expected 'insufficient_data', got {data.get('status')}"
        assert data.get("reason") is not None, "Missing 'reason' field for insufficient_data"
        assert "missing data" in data.get("reason", "").lower() or "cannot generate" in data.get("reason", "").lower()
        
        missing_sections = data.get("missing_sections", [])
        assert isinstance(missing_sections, list), "missing_sections should be list"
        assert len(missing_sections) > 0, "Expected at least one missing_sections entry"
        
        # Strengths and concerns should be empty
        assert data.get("strengths", []) == [], "Strengths should be empty for insufficient_data"
        assert data.get("concerns", []) == [], "Concerns should be empty for insufficient_data"
        
        print(f"PASS: Tampa returns insufficient_data with reason and missing_sections: {missing_sections}")

    def test_insufficient_data_has_unknowns(self, session):
        """Insufficient data response still includes unknowns derived from known_unknowns"""
        response = session.post(f"{BASE_URL}/api/intelligence/school-insight/{TAMPA_PROGRAM_ID}")
        data = response.json()
        
        unknowns = data.get("unknowns", [])
        assert isinstance(unknowns, list), "unknowns should be a list"
        assert len(unknowns) > 0, "Expected at least one unknown even for insufficient_data"
        
        print(f"PASS: Insufficient data response has {len(unknowns)} unknowns")


class TestAuthenticationRequired:
    """Test that endpoint requires authentication"""

    def test_unauthenticated_request_fails(self):
        """Endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthenticated request returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
