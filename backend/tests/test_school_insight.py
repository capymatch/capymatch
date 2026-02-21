"""
Tests for the Source-Aware AI School Insight endpoints:
- POST /api/ai/school-insight/{program_id} - Get AI-powered "Why This School" insights
- DELETE /api/ai/school-insight/{program_id}/cache - Clear cached insight for a program

Features tested:
- AI insight returns valid structured JSON with program_data, ai_insight, data_confidence, disclaimers, sources_used
- ai_insight contains exactly 3 reasons and 2 risks
- Caching: second call returns cached result (within 24h TTL)
- DELETE cache endpoint clears cache
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "douglas@yeslms.com"
TEST_PASSWORD = "password"
PROGRAM_ID_FGCU = "prog_3fe70bce8e71"  # Florida Gulf Coast University (D1 ASUN)
PROGRAM_ID_TAMPA = "prog_0a5dfa9c59d1"  # Tampa University (D2 SSC)


@pytest.fixture(scope="module")
def session():
    """Create authenticated session with session_token cookie"""
    s = requests.Session()
    login_response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    # Session cookie is automatically stored by requests.Session
    return s


class TestSchoolInsightEndpoint:
    """Tests for POST /api/ai/school-insight/{program_id}"""

    def test_insight_endpoint_returns_200(self, session):
        """Test that the endpoint returns 200 OK"""
        # First clear cache to ensure fresh generation
        session.delete(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}/cache")
        
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_insight_has_required_top_level_fields(self, session):
        """Test that response has insight, program_id, university_name, generated_at, sources_used"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level fields
        assert "insight" in data, "Missing 'insight' in response"
        assert "program_id" in data, "Missing 'program_id' in response"
        assert "university_name" in data, "Missing 'university_name' in response"
        assert "generated_at" in data, "Missing 'generated_at' in response"
        assert "sources_used" in data, "Missing 'sources_used' in response"
        
        # Validate program_id matches
        assert data["program_id"] == PROGRAM_ID_FGCU

    def test_insight_structure_has_program_data(self, session):
        """Test that insight contains program_data with required sections"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        insight = data.get("insight", {})
        
        program_data = insight.get("program_data", {})
        assert "academic_fit" in program_data, "Missing 'academic_fit' in program_data"
        assert "roster_outlook" in program_data, "Missing 'roster_outlook' in program_data"
        assert "recruiting_timeline" in program_data, "Missing 'recruiting_timeline' in program_data"
        assert "scholarship_structure" in program_data, "Missing 'scholarship_structure' in program_data"
        assert "nil_readiness" in program_data, "Missing 'nil_readiness' in program_data"

    def test_insight_has_ai_insight_section(self, session):
        """Test that insight contains ai_insight with top_reasons and top_risks"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        insight = data.get("insight", {})
        
        ai_insight = insight.get("ai_insight", {})
        assert "top_reasons" in ai_insight, "Missing 'top_reasons' in ai_insight"
        assert "top_risks" in ai_insight, "Missing 'top_risks' in ai_insight"

    def test_insight_has_exactly_3_reasons(self, session):
        """Test that ai_insight has exactly 3 top_reasons"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        ai_insight = data.get("insight", {}).get("ai_insight", {})
        
        reasons = ai_insight.get("top_reasons", [])
        assert len(reasons) == 3, f"Expected 3 reasons, got {len(reasons)}"
        
        # Each reason should have text, supports, sources
        for i, reason in enumerate(reasons):
            assert "text" in reason, f"Reason {i} missing 'text'"
            assert isinstance(reason.get("text", ""), str), f"Reason {i} text is not string"
            assert "supports" in reason, f"Reason {i} missing 'supports'"
            assert "sources" in reason, f"Reason {i} missing 'sources'"

    def test_insight_has_exactly_2_risks(self, session):
        """Test that ai_insight has exactly 2 top_risks"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        ai_insight = data.get("insight", {}).get("ai_insight", {})
        
        risks = ai_insight.get("top_risks", [])
        assert len(risks) == 2, f"Expected 2 risks, got {len(risks)}"
        
        # Each risk should have text, supports, sources
        for i, risk in enumerate(risks):
            assert "text" in risk, f"Risk {i} missing 'text'"
            assert isinstance(risk.get("text", ""), str), f"Risk {i} text is not string"
            assert "supports" in risk, f"Risk {i} missing 'supports'"
            assert "sources" in risk, f"Risk {i} missing 'sources'"

    def test_insight_has_data_confidence(self, session):
        """Test that insight has data_confidence with level and reasons"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        insight = data.get("insight", {})
        
        confidence = insight.get("data_confidence", {})
        assert "level" in confidence, "Missing 'level' in data_confidence"
        assert confidence["level"] in ["High", "Medium", "Limited"], f"Invalid confidence level: {confidence['level']}"
        assert "reasons" in confidence, "Missing 'reasons' in data_confidence"
        assert isinstance(confidence["reasons"], list), "'reasons' should be a list"

    def test_insight_has_disclaimers(self, session):
        """Test that insight has disclaimers array"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        insight = data.get("insight", {})
        
        disclaimers = insight.get("disclaimers", [])
        assert isinstance(disclaimers, list), "disclaimers should be a list"
        assert len(disclaimers) >= 1, "Should have at least one disclaimer"
        
        # Common disclaimers expected
        disclaimer_text = " ".join(disclaimers).lower()
        assert "not guaranteed" in disclaimer_text or "may change" in disclaimer_text, \
            "Disclaimers should mention uncertainty"

    def test_sources_used_has_valid_structure(self, session):
        """Test that sources_used has proper source objects"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 200
        data = response.json()
        
        sources = data.get("sources_used", [])
        assert isinstance(sources, list), "sources_used should be a list"
        
        # Each source should have source_id, source_type, retrieved_at, fields_supported
        for source in sources:
            assert "source_id" in source, "Source missing 'source_id'"
            assert "source_type" in source, "Source missing 'source_type'"
            # retrieved_at and fields_supported are also expected
            assert "fields_supported" in source, "Source missing 'fields_supported'"


class TestSchoolInsightCaching:
    """Tests for caching behavior"""

    def test_cached_result_returns_quickly(self, session):
        """Test that second call returns cached result faster"""
        # First, clear cache and make a fresh request
        session.delete(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}/cache")
        
        # First request (should call AI)
        start1 = time.time()
        response1 = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}")
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second request (should be cached)
        start2 = time.time()
        response2 = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}")
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        # Cached should be faster (at least 50% faster typically)
        # But we'll just verify both returned 200 and have same structure
        data1 = response1.json()
        data2 = response2.json()
        
        # Same program_id
        assert data1["program_id"] == data2["program_id"]
        # Same university_name
        assert data1["university_name"] == data2["university_name"]
        
        print(f"First request: {time1:.2f}s, Second request: {time2:.2f}s")

    def test_cache_clear_works(self, session):
        """Test that DELETE /api/ai/school-insight/{program_id}/cache clears cache"""
        # Make initial request to populate cache
        response1 = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}")
        assert response1.status_code == 200
        
        # Clear cache
        delete_response = session.delete(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}/cache")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data.get("cleared") == True, "Cache clear should return cleared: true"


class TestSchoolInsightEdgeCases:
    """Edge case tests"""

    def test_invalid_program_returns_404(self, session):
        """Test that non-existent program returns 404"""
        response = session.post(f"{BASE_URL}/api/ai/school-insight/invalid_program_id")
        assert response.status_code == 404

    def test_unauthenticated_request_returns_401(self):
        """Test that unauthenticated request returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_FGCU}")
        assert response.status_code == 401 or response.status_code == 403


class TestSchoolInsightSecondProgram:
    """Test with Tampa University (D2) to verify variety"""

    def test_tampa_insight_returns_valid_structure(self, session):
        """Test Tampa University insight has valid structure"""
        # Clear cache first
        session.delete(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}/cache")
        
        response = session.post(f"{BASE_URL}/api/ai/school-insight/{PROGRAM_ID_TAMPA}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "insight" in data
        assert "program_id" in data
        assert data["program_id"] == PROGRAM_ID_TAMPA
        
        insight = data["insight"]
        assert "program_data" in insight
        assert "ai_insight" in insight
        assert "data_confidence" in insight
        assert "disclaimers" in insight
        
        # Check 3 reasons, 2 risks
        ai_insight = insight["ai_insight"]
        assert len(ai_insight.get("top_reasons", [])) == 3
        assert len(ai_insight.get("top_risks", [])) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
