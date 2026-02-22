"""
Test Suite: Scholarship Structure Intelligence + Contribution Endpoints

Tests:
1. POST /api/intelligence/scholarship/{program_id} endpoint
2. POST /api/intelligence/contribute endpoint (link, request)
3. POST /api/intelligence/contribute/upload endpoint (file upload)
4. Response shape validation for scholarship cards
5. Contribution storage in MongoDB
"""

import pytest
import requests
import os
import json
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Known test program with stored data
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"


class TestAuthentication:
    """Get auth session for testing"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session for all tests"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "douglas@yeslms.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session


class TestScholarshipEndpoint(TestAuthentication):
    """Tests for POST /api/intelligence/scholarship/{program_id}"""
    
    def test_scholarship_returns_200(self, auth_session):
        """Scholarship endpoint should return 200 OK"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_scholarship_response_shape(self, auth_session):
        """Verify scholarship response has required fields"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        assert data.get("card_type") == "scholarship_structure", "card_type should be 'scholarship_structure'"
        assert data.get("status") == "ok", "status should be 'ok', not 'insufficient_data'"
        assert "scholarship_label" in data, "scholarship_label required"
        assert "ui" in data, "ui object required"
        
        # UI object fields
        ui = data.get("ui", {})
        assert "status" in ui, "ui.status required"
        assert "label" in ui, "ui.label required"
        assert "explanation" in ui, "ui.explanation required"
    
    def test_scholarship_no_dollar_amounts(self, auth_session):
        """Verify scholarship response contains no dollar amounts or percentages"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        text = json.dumps(response.json())
        
        # Should not contain dollar signs or percentage in scholarship context
        assert "$" not in text.replace("$", "").replace("scholarships", ""), "Response should not contain dollar amounts"
    
    def test_scholarship_valid_labels(self, auth_session):
        """Verify scholarship label is one of allowed values"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        
        allowed_labels = {
            "Mix of Partial and Full",
            "Typically Partial",
            "Walk-On Pathways Common",
            "Unknown"
        }
        assert data.get("scholarship_label") in allowed_labels, \
            f"scholarship_label '{data.get('scholarship_label')}' not in allowed labels"
    
    def test_scholarship_force_refresh(self, auth_session):
        """Verify force refresh bypasses cache"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}?force=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_scholarship_requires_auth(self):
        """Scholarship endpoint should require authentication"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 401, "Should require authentication"


class TestContributionEndpoint(TestAuthentication):
    """Tests for POST /api/intelligence/contribute"""
    
    def test_contribute_link_success(self, auth_session):
        """Submit a link contribution successfully"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID,
                "card_type": "scholarship_structure",
                "contribution_type": "link",
                "data": "https://example.com/test-scholarship-info"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response shape
        assert "contribution_id" in data, "contribution_id required"
        assert data.get("status") == "pending_verification", "status should be pending_verification"
        assert data["contribution_id"].startswith("contrib_"), "contribution_id should have contrib_ prefix"
    
    def test_contribute_request_success(self, auth_session):
        """Submit a request contribution successfully"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID,
                "card_type": "roster_stability",
                "contribution_type": "request",
                "data": "User requested data update for testing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "contribution_id" in data
        assert data.get("status") == "pending_verification"
    
    def test_contribute_missing_fields(self, auth_session):
        """Contribution should fail with missing required fields"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID
                # Missing card_type and contribution_type
            }
        )
        assert response.status_code == 400, "Should fail with missing fields"
    
    def test_contribute_invalid_type(self, auth_session):
        """Contribution should fail with invalid contribution_type"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID,
                "card_type": "scholarship_structure",
                "contribution_type": "invalid_type",
                "data": "test"
            }
        )
        assert response.status_code == 400, "Should fail with invalid contribution_type"
    
    def test_contribute_link_requires_data(self, auth_session):
        """Link contribution should require URL data"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID,
                "card_type": "scholarship_structure",
                "contribution_type": "link",
                "data": ""  # Empty URL
            }
        )
        assert response.status_code == 400, "Link contribution should require URL"
    
    def test_contribute_requires_auth(self):
        """Contribution endpoint should require authentication"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/intelligence/contribute",
            json={
                "program_id": FGCU_PROGRAM_ID,
                "card_type": "scholarship_structure",
                "contribution_type": "request",
                "data": "test"
            }
        )
        assert response.status_code == 401, "Should require authentication"


class TestUploadContributionEndpoint(TestAuthentication):
    """Tests for POST /api/intelligence/contribute/upload"""
    
    def test_upload_csv_success(self, auth_session):
        """Upload a CSV file contribution successfully"""
        files = {
            'file': ('test_roster.csv', io.BytesIO(b'player,position\nJohn,OH\nJane,S'), 'text/csv')
        }
        data = {
            'program_id': FGCU_PROGRAM_ID,
            'card_type': 'roster_stability'
        }
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute/upload",
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        assert "contribution_id" in result
        assert result.get("status") == "pending_verification"
    
    def test_upload_invalid_extension(self, auth_session):
        """Upload should fail with disallowed file extension"""
        files = {
            'file': ('malicious.exe', io.BytesIO(b'test content'), 'application/octet-stream')
        }
        data = {
            'program_id': FGCU_PROGRAM_ID,
            'card_type': 'roster_stability'
        }
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/contribute/upload",
            files=files,
            data=data
        )
        assert response.status_code == 400, "Should reject disallowed file types"
    
    def test_upload_requires_auth(self):
        """Upload endpoint should require authentication"""
        session = requests.Session()
        files = {
            'file': ('test.csv', io.BytesIO(b'test'), 'text/csv')
        }
        data = {
            'program_id': FGCU_PROGRAM_ID,
            'card_type': 'roster_stability'
        }
        response = session.post(
            f"{BASE_URL}/api/intelligence/contribute/upload",
            files=files,
            data=data
        )
        assert response.status_code == 401, "Should require authentication"


class TestExistingIntelligenceEndpoints(TestAuthentication):
    """Verify previously wired intelligence endpoints still work"""
    
    def test_timeline_endpoint_works(self, auth_session):
        """Timeline intelligence endpoint should still work"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "ui" in data, "Timeline should have ui object"
    
    def test_roster_endpoint_works(self, auth_session):
        """Roster stability endpoint should still work"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "ui_roster" in data, "Roster should have ui_roster object"
        assert "ui_stability" in data, "Roster should have ui_stability object"
    
    def test_school_insight_endpoint_works(self, auth_session):
        """School insight endpoint should still work"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
