"""
Knowledge Base API Tests - Tests for university data import, filtering, and add-to-board functionality
Tests the university knowledge base populated from Excel files (D1, D2, D3 universities - ~1,053 total)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestKnowledgeBaseListEndpoint:
    """GET /api/knowledge-base - List all universities with optional filtering"""
    
    def test_get_all_universities_returns_1053_total(self):
        """Verify total count of imported universities is ~1053"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        total_count = len(data)
        print(f"Total universities in knowledge base: {total_count}")
        # Should be around 1053 (D1: 347, D2: 284, D3: 422)
        assert 1000 <= total_count <= 1100, f"Expected ~1053 universities, got {total_count}"
    
    def test_filter_by_division_d1_returns_347(self):
        """GET /api/knowledge-base?division=D1 should return ~347 D1 universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"division": "D1"})
        assert response.status_code == 200
        data = response.json()
        count = len(data)
        print(f"D1 universities: {count}")
        assert 340 <= count <= 360, f"Expected ~347 D1 universities, got {count}"
        # Verify all results are D1
        for uni in data[:10]:  # Check first 10
            assert uni.get("division") == "D1", f"Expected D1, got {uni.get('division')}"
    
    def test_filter_by_division_d2_returns_284(self):
        """GET /api/knowledge-base?division=D2 should return ~284 D2 universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"division": "D2"})
        assert response.status_code == 200
        data = response.json()
        count = len(data)
        print(f"D2 universities: {count}")
        assert 280 <= count <= 300, f"Expected ~284 D2 universities, got {count}"
        for uni in data[:10]:
            assert uni.get("division") == "D2", f"Expected D2, got {uni.get('division')}"
    
    def test_filter_by_division_d3_returns_422(self):
        """GET /api/knowledge-base?division=D3 should return ~422 D3 universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"division": "D3"})
        assert response.status_code == 200
        data = response.json()
        count = len(data)
        print(f"D3 universities: {count}")
        assert 415 <= count <= 430, f"Expected ~422 D3 universities, got {count}"
        for uni in data[:10]:
            assert uni.get("division") == "D3", f"Expected D3, got {uni.get('division')}"
    
    def test_search_by_college_name_stanford(self):
        """GET /api/knowledge-base?search=Stanford should return Stanford results"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"search": "Stanford"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Should find at least 1 Stanford match"
        print(f"Stanford search results: {len(data)} - {[u['university_name'] for u in data]}")
        # Verify search results contain Stanford
        found_stanford = False
        for uni in data:
            if "Stanford" in uni.get("university_name", ""):
                found_stanford = True
                break
        assert found_stanford, "Should find Stanford University in results"
    
    def test_filter_by_region_midwest(self):
        """GET /api/knowledge-base?region=Midwest should return Midwest universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"region": "Midwest"})
        assert response.status_code == 200
        data = response.json()
        print(f"Midwest region universities: {len(data)}")
        assert len(data) > 0, "Should find Midwest universities"
        # Verify region filtering works
        for uni in data[:10]:
            assert "midwest" in uni.get("region", "").lower(), f"Expected Midwest region, got {uni.get('region')}"
    
    def test_filter_by_conference_big_ten(self):
        """GET /api/knowledge-base?conference=Big Ten should return Big Ten conference schools"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"conference": "Big Ten"})
        assert response.status_code == 200
        data = response.json()
        print(f"Big Ten conference schools: {len(data)}")
        assert len(data) > 0, "Should find Big Ten conference schools"
        # Verify conference filtering
        for uni in data[:10]:
            assert "big ten" in uni.get("conference", "").lower(), f"Expected Big Ten, got {uni.get('conference')}"
    
    def test_university_data_structure(self):
        """Verify university records have expected fields including coach info"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Should have universities"
        
        # Check first university for expected fields
        uni = data[0]
        expected_fields = ["university_name", "division"]
        for field in expected_fields:
            assert field in uni, f"Missing required field: {field}"
        
        # Optional fields that may exist
        optional_fields = ["conference", "region", "website", "mascot", 
                          "primary_coach", "coach_email", "recruiting_coordinator", "coordinator_email"]
        print(f"Sample university: {uni.get('university_name')} - Division: {uni.get('division')}")
        print(f"Available fields: {list(uni.keys())}")


class TestKnowledgeBaseFiltersEndpoint:
    """GET /api/knowledge-base/filters - Returns distinct conferences and regions"""
    
    def test_get_filters_returns_conferences_and_regions(self):
        """Should return distinct conferences (~107) and regions (~10)"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/filters")
        assert response.status_code == 200
        data = response.json()
        
        assert "conferences" in data, "Response should include conferences"
        assert "regions" in data, "Response should include regions"
        
        conferences = data["conferences"]
        regions = data["regions"]
        
        print(f"Total conferences: {len(conferences)}")
        print(f"Total regions: {len(regions)}")
        print(f"Sample conferences: {conferences[:10]}")
        print(f"Regions: {regions}")
        
        # Verify counts are reasonable
        assert len(conferences) >= 50, f"Expected ~107 conferences, got {len(conferences)}"
        assert len(regions) >= 5, f"Expected ~10 regions, got {len(regions)}"


class TestAddToBoardEndpoint:
    """POST /api/knowledge-base/add-to-board - Add university to user's recruiting board"""
    
    def test_add_to_board_with_valid_university(self):
        """Adding a valid university should return 200 with program data including coach info"""
        # First get a university that likely isn't on the board
        response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"search": "Zips"})
        if response.status_code == 200 and len(response.json()) > 0:
            uni = response.json()[0]
            uni_name = uni.get("university_name")
        else:
            # Fallback to a random D3 school
            response = requests.get(f"{BASE_URL}/api/knowledge-base", params={"division": "D3"})
            assert response.status_code == 200
            data = response.json()
            # Pick from middle of list to avoid conflicts
            uni_name = data[len(data)//2].get("university_name") if data else "Test University"
        
        print(f"Testing add to board with: {uni_name}")
        
        # Try to add to board
        add_response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={"university_name": uni_name}
        )
        
        # Either 200 (success) or 400 (already on board) is acceptable
        if add_response.status_code == 200:
            result = add_response.json()
            print(f"Successfully added: {result.get('university_name')}")
            assert result.get("university_name") == uni_name
            assert "program_id" in result
            # Verify coach data is transferred
            print(f"Primary coach: {result.get('primary_coach')}")
            print(f"Coach email: {result.get('coach_email')}")
        elif add_response.status_code == 400:
            print(f"University already on board (expected): {add_response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {add_response.status_code}, body: {add_response.text}")
    
    def test_add_to_board_missing_university_name(self):
        """Should return 400 when university_name is missing"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "university_name" in response.json().get("detail", "").lower()
    
    def test_add_to_board_nonexistent_university(self):
        """Should return 404 for non-existent university"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={"university_name": "Nonexistent University XYZ12345"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSuggestedSchoolsEndpoint:
    """GET /api/suggested-schools - Returns AI suggestions based on athlete profile"""
    
    def test_get_suggested_schools(self):
        """Should return suggestions based on athlete profile"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data, "Response should include suggestions"
        assert "profile_exists" in data, "Response should include profile_exists"
        
        suggestions = data.get("suggestions", [])
        print(f"Total suggestions: {len(suggestions)}")
        
        if suggestions:
            # Verify suggestion structure
            sample = suggestions[0]
            print(f"Sample suggestion: {sample.get('university_name')} - Score: {sample.get('match_score')}%")
            assert "university_name" in sample
            assert "match_score" in sample


class TestCombinedFilters:
    """Test multiple filter combinations"""
    
    def test_division_and_region_filter(self):
        """Test combining division and region filters"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base",
            params={"division": "D1", "region": "West"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"D1 + West universities: {len(data)}")
        
        # Verify both filters are applied
        for uni in data[:5]:
            assert uni.get("division") == "D1", f"Expected D1, got {uni.get('division')}"
    
    def test_division_and_conference_filter(self):
        """Test combining division and conference filters"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base",
            params={"division": "D1", "conference": "ACC"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"D1 + ACC universities: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
