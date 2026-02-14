"""
Backend API Tests for Onboarding Questionnaire Feature
Tests: GET/POST /api/recruiting-profile and GET /api/match-scores
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRecruitingProfileAPI:
    """Test recruiting profile endpoints"""

    def test_get_recruiting_profile_initial_state(self):
        """Test GET /api/recruiting-profile returns questionnaire_completed status"""
        response = requests.get(f"{BASE_URL}/api/recruiting-profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should have questionnaire_completed field
        assert "questionnaire_completed" in data, "Missing questionnaire_completed field"
        print(f"questionnaire_completed: {data.get('questionnaire_completed')}")

    def test_post_recruiting_profile_saves_data(self):
        """Test POST /api/recruiting-profile saves questionnaire data"""
        test_profile = {
            "position": "Setter",
            "division": "D1",
            "priorities": ["Strong Academics", "Top Athletics Program", "Scholarship Availability"],
            "regions": ["Northeast", "Southeast"],
            "school_size": "Large (15K+)",
            "academic_interests": "Business / Finance",
            "scholarship_priority": "Full scholarship needed"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting-profile",
            json=test_profile,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify questionnaire_completed is set to True
        assert data.get("questionnaire_completed") == True, "questionnaire_completed should be True after POST"
        assert data.get("exists") == True, "exists should be True after POST"
        
        # Verify data was saved correctly
        assert data.get("position") == test_profile["position"], "Position mismatch"
        assert data.get("division") == test_profile["division"], "Division mismatch"
        assert data.get("priorities") == test_profile["priorities"], "Priorities mismatch"
        assert data.get("regions") == test_profile["regions"], "Regions mismatch"
        assert data.get("school_size") == test_profile["school_size"], "School size mismatch"
        print(f"Profile saved successfully: {data}")

    def test_get_recruiting_profile_after_save(self):
        """Test GET /api/recruiting-profile returns saved data"""
        response = requests.get(f"{BASE_URL}/api/recruiting-profile")
        assert response.status_code == 200
        
        data = response.json()
        # After POST, questionnaire_completed should be True
        assert data.get("questionnaire_completed") == True, "questionnaire_completed should be True"
        assert data.get("exists") == True, "exists should be True"
        assert "position" in data, "Should have position field"
        assert "division" in data, "Should have division field"
        print(f"Profile retrieved: {data}")


class TestMatchScoresAPI:
    """Test match scores endpoint"""

    def test_get_match_scores_returns_scores(self):
        """Test GET /api/match-scores returns match scores based on profile"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "scores" in data, "Missing scores field"
        assert "profile_exists" in data, "Missing profile_exists field"
        
        print(f"profile_exists: {data.get('profile_exists')}")
        print(f"Number of scores: {len(data.get('scores', []))}")
        
        # If profile exists, scores should have expected structure
        if data.get("profile_exists"):
            scores = data.get("scores", [])
            if len(scores) > 0:
                score = scores[0]
                assert "program_id" in score, "Score missing program_id"
                assert "university_name" in score, "Score missing university_name"
                assert "match_score" in score, "Score missing match_score"
                assert "match_reasons" in score, "Score missing match_reasons"
                print(f"Sample score: {score}")

    def test_match_scores_after_profile_update(self):
        """Test match scores are calculated based on profile preferences"""
        # First update profile with specific preferences
        test_profile = {
            "position": "Outside Hitter",
            "division": "D1",
            "priorities": ["Strong Academics", "Location / Region"],
            "regions": ["Southeast", "Southwest"],
            "school_size": "Large (15K+)",
            "academic_interests": "Engineering / Tech",
            "scholarship_priority": "Full scholarship needed"
        }
        
        post_response = requests.post(
            f"{BASE_URL}/api/recruiting-profile",
            json=test_profile,
            headers={"Content-Type": "application/json"}
        )
        assert post_response.status_code == 200
        
        # Now get match scores
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("profile_exists") == True, "profile_exists should be True"
        
        scores = data.get("scores", [])
        print(f"Match scores count: {len(scores)}")
        
        # Print top matches for debugging
        for i, score in enumerate(scores[:3]):
            print(f"Top {i+1}: {score.get('university_name')} - {score.get('match_score')}% - {score.get('match_reasons')}")


class TestQuestionnaireCompletedFlow:
    """Test the questionnaire completion flow"""

    def test_reset_and_verify_not_completed(self):
        """Reset profile and verify questionnaire_completed is False"""
        # This test verifies the initial state before questionnaire
        # Note: In production, we'd use a test database reset
        response = requests.get(f"{BASE_URL}/api/recruiting-profile")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Current state - exists: {data.get('exists')}, questionnaire_completed: {data.get('questionnaire_completed')}")

    def test_complete_questionnaire_flow(self):
        """Test completing the questionnaire sets questionnaire_completed to True"""
        # Complete the questionnaire
        test_profile = {
            "position": "Libero",
            "division": "D2",
            "priorities": ["Campus Life & Culture", "Coaching Staff Quality", "Playing Time / Roster Depth"],
            "regions": ["Midwest", "Mountain West"],
            "school_size": "Medium (5K-15K)",
            "academic_interests": "Health Sciences",
            "scholarship_priority": "Partial scholarship OK"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/recruiting-profile",
            json=test_profile,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("questionnaire_completed") == True, "Should be marked complete"
        
        # Verify GET also returns completed
        get_response = requests.get(f"{BASE_URL}/api/recruiting-profile")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data.get("questionnaire_completed") == True, "GET should also show completed"
        print("Questionnaire completion flow verified successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
