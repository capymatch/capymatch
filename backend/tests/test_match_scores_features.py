"""
Test cases for Match Score Integration and Auto-Suggest Schools features
- GET /api/match-scores: Returns match scores for programs in pipeline
- GET /api/suggested-schools: Returns schools that match athlete profile but not in pipeline
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://volley-recruit-2.preview.emergentagent.com").rstrip("/")


class TestMatchScoresAPI:
    """Tests for GET /api/match-scores endpoint"""

    def test_match_scores_endpoint_returns_200(self):
        """GET /api/match-scores should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        print(f"GET /api/match-scores returned status {response.status_code}")

    def test_match_scores_returns_scores_array(self):
        """GET /api/match-scores should return scores array"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        data = response.json()
        assert "scores" in data
        assert "profile_exists" in data
        assert isinstance(data["scores"], list)
        print(f"Returned {len(data['scores'])} match scores")

    def test_match_scores_contains_required_fields(self):
        """Each score should have program_id, university_name, match_score, match_reasons"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        data = response.json()
        
        if data["scores"]:
            score = data["scores"][0]
            assert "program_id" in score, "Missing program_id field"
            assert "university_name" in score, "Missing university_name field"
            assert "match_score" in score, "Missing match_score field"
            assert "match_reasons" in score, "Missing match_reasons field"
            print(f"Sample score: {score['university_name']} = {score['match_score']}%")

    def test_match_scores_values_are_valid(self):
        """Match scores should be integers between 0-100, match_reasons should be a list"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        data = response.json()
        
        for score in data["scores"][:5]:  # Check first 5
            assert isinstance(score["match_score"], int), "match_score should be int"
            assert 0 <= score["match_score"] <= 100, "match_score should be 0-100"
            assert isinstance(score["match_reasons"], list), "match_reasons should be list"
            print(f"Valid: {score['university_name']} = {score['match_score']}%, reasons: {score['match_reasons']}")

    def test_match_scores_sorted_by_score(self):
        """Match scores should be sorted in descending order"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        data = response.json()
        
        scores = [s["match_score"] for s in data["scores"]]
        assert scores == sorted(scores, reverse=True), "Scores should be sorted descending"
        print(f"Scores properly sorted: {scores[:5]}...")


class TestSuggestedSchoolsAPI:
    """Tests for GET /api/suggested-schools endpoint"""

    def test_suggested_schools_endpoint_returns_200(self):
        """GET /api/suggested-schools should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        print(f"GET /api/suggested-schools returned status {response.status_code}")

    def test_suggested_schools_returns_suggestions_array(self):
        """GET /api/suggested-schools should return suggestions array"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "profile_exists" in data
        assert isinstance(data["suggestions"], list)
        print(f"Returned {len(data['suggestions'])} suggestions")

    def test_suggested_schools_contains_required_fields(self):
        """Each suggestion should have university_name, match_score, match_reasons, division"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        data = response.json()
        
        if data["suggestions"]:
            suggestion = data["suggestions"][0]
            assert "university_name" in suggestion, "Missing university_name"
            assert "match_score" in suggestion, "Missing match_score"
            assert "match_reasons" in suggestion, "Missing match_reasons"
            assert "division" in suggestion, "Missing division"
            print(f"Sample suggestion: {suggestion['university_name']} ({suggestion['division']}) = {suggestion['match_score']}%")

    def test_suggested_schools_excludes_pipeline_programs(self):
        """Suggested schools should NOT include schools already in pipeline"""
        # Get pipeline programs
        pipeline_res = requests.get(f"{BASE_URL}/api/programs")
        pipeline_names = {p["university_name"] for p in pipeline_res.json()}
        
        # Get suggestions
        suggestions_res = requests.get(f"{BASE_URL}/api/suggested-schools")
        suggestions = suggestions_res.json()["suggestions"]
        suggestion_names = {s["university_name"] for s in suggestions}
        
        # Check no overlap
        overlap = pipeline_names & suggestion_names
        assert len(overlap) == 0, f"Suggestions should not include pipeline programs: {overlap}"
        print(f"Verified: {len(suggestion_names)} suggestions exclude {len(pipeline_names)} pipeline programs")

    def test_suggested_schools_sorted_by_score(self):
        """Suggestions should be sorted by match_score descending"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        data = response.json()
        
        scores = [s["match_score"] for s in data["suggestions"]]
        assert scores == sorted(scores, reverse=True), "Suggestions should be sorted descending"
        print(f"Suggestions properly sorted: {scores[:5]}...")

    def test_suggested_schools_max_12_results(self):
        """Suggestions should return max 12 results"""
        response = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["suggestions"]) <= 12, "Should return max 12 suggestions"
        print(f"Returned {len(data['suggestions'])} suggestions (max 12)")


class TestAddToBoard:
    """Tests for POST /api/knowledge-base/add-to-board endpoint"""

    def test_add_to_board_endpoint_exists(self):
        """POST /api/knowledge-base/add-to-board should accept requests"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={"university_name": "TEST_SCHOOL_DO_NOT_USE"}
        )
        # Either 200 (success) or 400/404 (not found in knowledge base) is acceptable
        assert response.status_code in [200, 400, 404, 422]
        print(f"POST /api/knowledge-base/add-to-board returned status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
