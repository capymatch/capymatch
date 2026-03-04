"""
Test Campus Diversity feature - iteration 117
Tests the campus_diversity field in the knowledge base API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCampusDiversityAPI:
    """Tests for campus diversity data in knowledge base"""
    
    def test_ucla_has_diversity_data(self):
        """UCLA should return campus_diversity with 9 demographic categories"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/ucla.edu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campus_diversity" in data, "campus_diversity field missing"
        
        diversity = data["campus_diversity"]
        assert isinstance(diversity, dict), "campus_diversity should be a dict"
        
        # Check for 9 demographic categories
        expected_categories = [
            "American Indian/Alaska Native",
            "Asian",
            "Black",
            "Hispanic/Latino",
            "Native Hawaiian/Pacific Islander",
            "Non Resident",
            "Two or more",
            "Unknown",
            "White"
        ]
        for cat in expected_categories:
            assert cat in diversity, f"Missing category: {cat}"
        
        assert len(diversity) == 9, f"Expected 9 categories, got {len(diversity)}"
    
    def test_ucla_diversity_data_structure(self):
        """Each category should have students and faculty percentages"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/ucla.edu")
        assert response.status_code == 200
        
        diversity = response.json()["campus_diversity"]
        
        for category, values in diversity.items():
            assert "students" in values, f"{category} missing 'students' key"
            assert "faculty" in values, f"{category} missing 'faculty' key"
            
            # Values should be numeric
            assert isinstance(values["students"], (int, float)), f"{category} students should be numeric"
            assert isinstance(values["faculty"], (int, float)), f"{category} faculty should be numeric"
            
            # Values should be reasonable percentages (0-100)
            assert 0 <= values["students"] <= 100, f"{category} students out of range"
            assert 0 <= values["faculty"] <= 100, f"{category} faculty out of range"
    
    def test_ucla_top_student_demographics(self):
        """UCLA top 3: Asian ~29.89%, White ~25.11%, Hispanic/Latino ~23.21%"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/ucla.edu")
        assert response.status_code == 200
        
        diversity = response.json()["campus_diversity"]
        
        # Sort by student percentage descending
        sorted_categories = sorted(
            diversity.items(), 
            key=lambda x: x[1]["students"], 
            reverse=True
        )
        
        # Top 3 should be Asian, White, Hispanic/Latino (order may vary slightly)
        top_3_names = [cat[0] for cat in sorted_categories[:3]]
        expected_top_3 = {"Asian", "White", "Hispanic/Latino"}
        assert set(top_3_names) == expected_top_3, f"Top 3 mismatch: got {top_3_names}"
        
        # Verify approximate values for UCLA
        asian_pct = diversity["Asian"]["students"]
        white_pct = diversity["White"]["students"]
        hispanic_pct = diversity["Hispanic/Latino"]["students"]
        
        assert 28 <= asian_pct <= 32, f"Asian students % unexpected: {asian_pct}"
        assert 23 <= white_pct <= 27, f"White students % unexpected: {white_pct}"
        assert 21 <= hispanic_pct <= 25, f"Hispanic/Latino students % unexpected: {hispanic_pct}"
    
    def test_psu_has_diversity_data(self):
        """PSU should also return campus_diversity"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/psu.edu")
        assert response.status_code == 200
        
        data = response.json()
        assert "campus_diversity" in data, "PSU missing campus_diversity"
        
        diversity = data["campus_diversity"]
        assert len(diversity) == 9, f"PSU expected 9 categories, got {len(diversity)}"
    
    def test_psu_has_source_attribution(self):
        """PSU should have campus_diversity_source = productiverecruit.com"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/psu.edu")
        assert response.status_code == 200
        
        data = response.json()
        source = data.get("campus_diversity_source")
        assert source == "productiverecruit.com", f"Expected productiverecruit.com, got {source}"
    
    def test_stanford_has_diversity_data(self):
        """Stanford should have campus_diversity data"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        assert response.status_code == 200
        
        data = response.json()
        assert "campus_diversity" in data, "Stanford missing campus_diversity"
        assert len(data["campus_diversity"]) == 9
    
    def test_utexas_has_diversity_data(self):
        """UT Austin should have campus_diversity data"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/utexas.edu")
        assert response.status_code == 200
        
        data = response.json()
        assert "campus_diversity" in data, "UT Austin missing campus_diversity"
        assert len(data["campus_diversity"]) == 9
    
    def test_ufl_has_diversity_data(self):
        """University of Florida should have campus_diversity data"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/school/ufl.edu")
        assert response.status_code == 200
        
        data = response.json()
        assert "campus_diversity" in data, "UFL missing campus_diversity"
        assert len(data["campus_diversity"]) == 9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
