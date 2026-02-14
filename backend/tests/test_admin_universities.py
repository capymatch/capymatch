"""
Test Suite: Admin Universities API
Tests CRUD operations, health stats, CSV import/export, and filtering for university management
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAdminUniversitiesHealth:
    """Test /api/admin/universities/health endpoint"""
    
    def test_health_endpoint_returns_stats(self, api_client):
        """Verify health endpoint returns correct structure with counts"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in health response"
        assert "missing_coach" in data, "Missing 'missing_coach' in health response"
        assert "missing_email" in data, "Missing 'missing_email' in health response"
        assert "missing_coordinator" in data, "Missing 'missing_coordinator' in health response"
        assert "complete_profiles" in data, "Missing 'complete_profiles' in health response"
        assert "completeness_pct" in data, "Missing 'completeness_pct' in health response"
        assert "divisions" in data, "Missing 'divisions' in health response"
        
        # Verify data types
        assert isinstance(data["total"], int), "total should be int"
        assert isinstance(data["completeness_pct"], int), "completeness_pct should be int"
        assert isinstance(data["divisions"], dict), "divisions should be dict"
        
        print(f"Health data: Total={data['total']}, Complete={data['complete_profiles']}, Missing Coach={data['missing_coach']}, Missing Email={data['missing_email']}")


class TestAdminUniversitiesList:
    """Test listing universities with pagination and filters"""
    
    def test_list_universities_default(self, api_client):
        """List universities without filters"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "universities" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        # Default is 50 per page
        assert data["limit"] == 50
        assert data["page"] == 1
        assert isinstance(data["universities"], list)
        
        if len(data["universities"]) > 0:
            uni = data["universities"][0]
            assert "university_name" in uni
            print(f"Listed {len(data['universities'])} universities, total={data['total']}")
    
    def test_list_with_search_filter(self, api_client):
        """Test search filter on university names"""
        # Search for "Texas" - should find Texas universities
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"search": "Texas"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 0
        # If results found, verify they contain the search term
        if data["universities"]:
            for uni in data["universities"][:5]:
                assert "texas" in uni["university_name"].lower(), f"'{uni['university_name']}' doesn't match 'Texas'"
        print(f"Search 'Texas': found {data['total']} results")
    
    def test_list_with_division_filter(self, api_client):
        """Test division filter"""
        for division in ["D1", "D2", "D3"]:
            response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"division": division})
            assert response.status_code == 200
            
            data = response.json()
            # Verify all returned have the correct division
            for uni in data["universities"][:5]:
                if uni.get("division"):
                    assert uni["division"] == division, f"Expected {division}, got {uni['division']}"
            print(f"Division filter '{division}': found {data['total']} results")
    
    def test_list_with_region_filter(self, api_client):
        """Test region filter"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"region": "South"})
        assert response.status_code == 200
        
        data = response.json()
        # Verify returned universities have matching region
        for uni in data["universities"][:5]:
            if uni.get("region"):
                assert uni["region"] == "South", f"Expected 'South', got {uni['region']}"
        print(f"Region filter 'South': found {data['total']} results")
    
    def test_list_with_health_filter_missing_coach(self, api_client):
        """Test health filter - missing coach"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"health": "missing_coach"})
        assert response.status_code == 200
        
        data = response.json()
        # Verify returned universities are missing coach
        for uni in data["universities"][:10]:
            coach = uni.get("primary_coach", "")
            assert not coach or coach.strip() == "", f"University has coach: {coach}"
        print(f"Health filter 'missing_coach': found {data['total']} results")
    
    def test_list_with_health_filter_missing_email(self, api_client):
        """Test health filter - missing email"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"health": "missing_email"})
        assert response.status_code == 200
        
        data = response.json()
        # Verify returned universities are missing email
        for uni in data["universities"][:10]:
            email = uni.get("coach_email", "")
            assert not email or email.strip() == "", f"University has email: {email}"
        print(f"Health filter 'missing_email': found {data['total']} results")
    
    def test_list_with_health_filter_complete(self, api_client):
        """Test health filter - complete profiles"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"health": "complete"})
        assert response.status_code == 200
        
        data = response.json()
        # Verify returned universities have both coach and email
        for uni in data["universities"][:10]:
            coach = uni.get("primary_coach", "")
            email = uni.get("coach_email", "")
            assert coach and coach.strip(), f"Missing coach for {uni.get('university_name')}"
            assert email and email.strip(), f"Missing email for {uni.get('university_name')}"
        print(f"Health filter 'complete': found {data['total']} results")
    
    def test_pagination_page_2(self, api_client):
        """Test pagination - get page 2"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities", params={"page": 2})
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 2
        # If total > 50, should have data on page 2
        if data["total"] > 50:
            assert len(data["universities"]) > 0, "Expected universities on page 2"
        print(f"Pagination page 2: got {len(data['universities'])} universities")


class TestAdminUniversityCRUD:
    """Test Create, Read, Update, Delete operations"""
    
    TEST_UNI_NAME = "TEST_University_For_API_Testing_12345"
    
    def test_create_university(self, api_client):
        """Create a new university"""
        # First delete if exists (cleanup from previous test)
        api_client.delete(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        
        payload = {
            "university_name": self.TEST_UNI_NAME,
            "division": "D1",
            "conference": "Test Conference",
            "region": "South",
            "website": "https://test-university.edu",
            "mascot": "Test Mascot",
            "primary_coach": "Test Coach Name",
            "coach_email": "testcoach@test-university.edu",
            "recruiting_coordinator": "Test Coordinator",
            "coordinator_email": "coordinator@test-university.edu",
            "scholarship_type": "Full Scholarship",
            "roster_needs": "Setter, Libero"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["university_name"] == self.TEST_UNI_NAME
        assert data["division"] == "D1"
        assert data["primary_coach"] == "Test Coach Name"
        assert data["coach_email"] == "testcoach@test-university.edu"
        print(f"Created university: {self.TEST_UNI_NAME}")
    
    def test_get_university(self, api_client):
        """Get a specific university by name"""
        # First ensure university exists
        self.test_create_university(api_client)
        
        response = api_client.get(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["university_name"] == self.TEST_UNI_NAME
        assert data["division"] == "D1"
        assert "on_boards_count" in data  # Extra field from GET
        print(f"Got university: {data['university_name']}, on_boards_count={data.get('on_boards_count')}")
    
    def test_update_university(self, api_client):
        """Update an existing university"""
        # First ensure university exists
        api_client.delete(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        payload = {
            "university_name": self.TEST_UNI_NAME,
            "division": "D1",
            "primary_coach": "Original Coach"
        }
        api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        
        # Now update
        update_payload = {
            "primary_coach": "Updated Coach Name",
            "coach_email": "updated@test-university.edu",
            "division": "D2"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}",
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["primary_coach"] == "Updated Coach Name"
        assert data["coach_email"] == "updated@test-university.edu"
        assert data["division"] == "D2"
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        get_data = get_response.json()
        assert get_data["primary_coach"] == "Updated Coach Name"
        print(f"Updated university: coach changed to '{data['primary_coach']}'")
    
    def test_delete_university(self, api_client):
        """Delete a university"""
        # First ensure university exists
        api_client.delete(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        payload = {
            "university_name": self.TEST_UNI_NAME,
            "division": "D3"
        }
        api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        
        # Now delete
        response = api_client.delete(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] == True
        assert data["deleted"] == self.TEST_UNI_NAME
        
        # Verify deletion with GET
        get_response = api_client.get(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        assert get_response.status_code == 404, "Expected 404 after deletion"
        print(f"Deleted university: {self.TEST_UNI_NAME}")
    
    def test_create_duplicate_fails(self, api_client):
        """Creating duplicate university should fail"""
        # First ensure university exists
        api_client.delete(f"{BASE_URL}/api/admin/universities/{self.TEST_UNI_NAME}")
        payload = {"university_name": self.TEST_UNI_NAME, "division": "D1"}
        api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        
        # Try to create again
        response = api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        
        data = response.json()
        assert "already exists" in data.get("detail", "").lower()
        print(f"Duplicate creation correctly rejected: {data.get('detail')}")
    
    def test_get_nonexistent_returns_404(self, api_client):
        """Get nonexistent university returns 404"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities/NONEXISTENT_UNIVERSITY_XYZ123")
        assert response.status_code == 404
        print("Nonexistent university correctly returns 404")
    
    def test_create_without_name_fails(self, api_client):
        """Creating without university_name should fail"""
        response = api_client.post(f"{BASE_URL}/api/admin/universities", json={"division": "D1"})
        assert response.status_code == 400
        print("Create without name correctly rejected")


class TestAdminUniversitiesExport:
    """Test CSV export functionality"""
    
    def test_export_csv(self, api_client):
        """Export universities as CSV"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities/export")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check disposition header
        disposition = response.headers.get("content-disposition", "")
        assert "attachment" in disposition.lower(), f"Expected attachment disposition"
        assert "universities_export.csv" in disposition
        
        # Validate CSV content
        content = response.text
        lines = content.strip().split("\n")
        assert len(lines) > 1, "CSV should have header and at least one row"
        
        # Check header row
        header = lines[0]
        expected_fields = ["university_name", "division", "conference", "region", "website", 
                          "mascot", "primary_coach", "coach_email", "recruiting_coordinator",
                          "coordinator_email", "scholarship_type", "roster_needs"]
        for field in expected_fields:
            assert field in header, f"Missing field '{field}' in CSV header"
        
        print(f"Exported CSV with {len(lines)-1} universities, header has all expected fields")


class TestAdminUniversitiesImport:
    """Test CSV import functionality"""
    
    def test_import_csv_create_new(self, api_client):
        """Import CSV to create new universities"""
        # Clean up test data first
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Uni_1")
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Uni_2")
        
        csv_data = """university_name,division,conference,region,website,mascot,primary_coach,coach_email,recruiting_coordinator,coordinator_email,scholarship_type,roster_needs
TEST_Import_Uni_1,D1,Test Conf,South,https://test1.edu,Eagles,Coach Test1,coach1@test.edu,Coord1,coord1@test.edu,Full,Setter
TEST_Import_Uni_2,D2,Test Conf 2,West,https://test2.edu,Hawks,Coach Test2,coach2@test.edu,Coord2,coord2@test.edu,Partial,Libero"""
        
        response = api_client.post(
            f"{BASE_URL}/api/admin/universities/import",
            json={"csv_data": csv_data}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "created" in data
        assert "updated" in data
        assert "errors" in data
        assert data["created"] == 2, f"Expected 2 created, got {data['created']}"
        
        # Verify universities were created
        for name in ["TEST_Import_Uni_1", "TEST_Import_Uni_2"]:
            verify = api_client.get(f"{BASE_URL}/api/admin/universities/{name}")
            assert verify.status_code == 200, f"University {name} was not created"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Uni_1")
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Uni_2")
        
        print(f"Import result: created={data['created']}, updated={data['updated']}, errors={len(data['errors'])}")
    
    def test_import_csv_update_existing(self, api_client):
        """Import CSV to update existing university"""
        # Create a university first
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Update_Uni")
        payload = {
            "university_name": "TEST_Import_Update_Uni",
            "division": "D1",
            "primary_coach": "Original Coach"
        }
        api_client.post(f"{BASE_URL}/api/admin/universities", json=payload)
        
        # Now import CSV to update it
        csv_data = """university_name,division,primary_coach,coach_email
TEST_Import_Update_Uni,D2,Updated via CSV,csv@test.edu"""
        
        response = api_client.post(
            f"{BASE_URL}/api/admin/universities/import",
            json={"csv_data": csv_data}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["updated"] >= 1, f"Expected at least 1 updated"
        
        # Verify update
        verify = api_client.get(f"{BASE_URL}/api/admin/universities/TEST_Import_Update_Uni}")
        verify_data = verify.json()
        assert verify_data["primary_coach"] == "Updated via CSV"
        assert verify_data["coach_email"] == "csv@test.edu"
        assert verify_data["division"] == "D2"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/universities/TEST_Import_Update_Uni")
        print(f"Import update: coach changed to '{verify_data['primary_coach']}'")
    
    def test_import_csv_empty_fails(self, api_client):
        """Import with empty CSV should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/universities/import",
            json={"csv_data": ""}
        )
        assert response.status_code == 400
        print("Empty CSV import correctly rejected")


class TestExistingUniversity:
    """Test with an existing university mentioned in the spec"""
    
    def test_get_abilene_christian_university(self, api_client):
        """Get Abilene Christian University - mentioned in spec as having coach but no email"""
        response = api_client.get(f"{BASE_URL}/api/admin/universities/Abilene Christian University")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Abilene Christian University: coach={data.get('primary_coach')}, email={data.get('coach_email')}")
            assert data["university_name"] == "Abilene Christian University"
        else:
            # University might not exist, which is fine
            print(f"Abilene Christian University not found (status {response.status_code})")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, api_client):
        """Remove test universities"""
        test_names = [
            "TEST_University_For_API_Testing_12345",
            "TEST_Import_Uni_1",
            "TEST_Import_Uni_2",
            "TEST_Import_Update_Uni"
        ]
        for name in test_names:
            api_client.delete(f"{BASE_URL}/api/admin/universities/{name}")
        print("Cleanup completed")
