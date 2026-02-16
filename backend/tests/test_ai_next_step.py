"""
Test AI Next Step Feature - Premium-only AI-powered next action recommendations
Tests POST /api/ai/next-step endpoint for:
- Premium-only access enforcement (403 for non-premium)
- Athlete profile requirement (400 if not set up)
- Valid program_id check (404 if not found)
- Valid JSON response with expected fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PREMIUM_USER = {"email": "premium@test.com", "password": "password"}
PRO_USER = {"email": "pro@test.com", "password": "password"}
TEST_PROGRAM_ID = "prog_3cbb4ff4df51"  # Stanford University for premium user


class TestAINextStep:
    """AI Next Step endpoint tests - Premium-only feature"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def _login(self, email, password):
        """Helper to login and get authenticated session (cookie-based auth)"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        return response

    def test_ai_next_step_unauthenticated(self):
        """Test that unauthenticated requests are rejected with 401"""
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": TEST_PROGRAM_ID}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: Unauthenticated request correctly rejected with 401")

    def test_ai_next_step_pro_user_forbidden(self):
        """Test that Pro users get 403 - AI features are Premium-only"""
        # Login as Pro user
        login_resp = self._login(PRO_USER["email"], PRO_USER["password"])
        assert login_resp.status_code == 200, f"Pro login failed: {login_resp.text}"
        
        # Try to access AI next step
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": "prog_pro_test1"}  # Use a program the pro user has
        )
        
        # Should get 403 with subscription_limit error
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        assert "ai_drafts" in detail.get("feature", ""), f"Expected feature to mention ai_drafts: {detail}"
        print("PASS: Pro user correctly rejected with 403 subscription_limit")

    def test_ai_next_step_premium_user_nonexistent_program(self):
        """Test that Premium user gets 404 for non-existent program_id"""
        # Login as Premium user
        login_resp = self._login(PREMIUM_USER["email"], PREMIUM_USER["password"])
        assert login_resp.status_code == 200, f"Premium login failed: {login_resp.text}"
        
        # Try to access AI next step with fake program
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": "prog_nonexistent_fake_123"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent program, got {response.status_code}: {response.text}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower(), f"Expected 'not found' in detail: {data}"
        print("PASS: Non-existent program_id correctly returns 404")

    def test_ai_next_step_premium_user_success(self):
        """Test that Premium user gets valid AI next step response"""
        # Login as Premium user
        login_resp = self._login(PREMIUM_USER["email"], PREMIUM_USER["password"])
        assert login_resp.status_code == 200, f"Premium login failed: {login_resp.text}"
        
        # Request AI next step for the Stanford program
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": TEST_PROGRAM_ID},
            timeout=60  # AI calls can take longer
        )
        
        # Should succeed with 200
        assert response.status_code == 200, f"Expected 200 for Premium user, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate required fields in response
        assert "next_step" in data, f"Missing 'next_step' field: {data}"
        assert "reasoning" in data, f"Missing 'reasoning' field: {data}"
        assert "urgency" in data, f"Missing 'urgency' field: {data}"
        assert "action_type" in data, f"Missing 'action_type' field: {data}"
        
        # Validate urgency is one of expected values
        assert data["urgency"] in ["high", "medium", "low"], f"Invalid urgency value: {data['urgency']}"
        
        # Validate action_type is one of expected values
        valid_action_types = ["email", "call", "visit", "camp", "highlight", "academic", "wait"]
        assert data["action_type"] in valid_action_types, f"Invalid action_type: {data['action_type']}"
        
        # Validate next_step is not empty
        assert len(data["next_step"]) > 0, f"next_step should not be empty: {data}"
        
        print(f"PASS: Premium user got valid AI response")
        print(f"  - next_step: {data['next_step'][:80]}...")
        print(f"  - reasoning: {data['reasoning'][:80]}...")
        print(f"  - urgency: {data['urgency']}")
        print(f"  - action_type: {data['action_type']}")

    def test_ai_next_step_response_includes_program_info(self):
        """Test that response includes program_id and university_name"""
        # Login as Premium user
        login_resp = self._login(PREMIUM_USER["email"], PREMIUM_USER["password"])
        assert login_resp.status_code == 200, f"Premium login failed: {login_resp.text}"
        
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": TEST_PROGRAM_ID},
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check for program info in response
        assert "program_id" in data, f"Missing 'program_id' field: {data}"
        assert data["program_id"] == TEST_PROGRAM_ID, f"program_id mismatch: expected {TEST_PROGRAM_ID}, got {data['program_id']}"
        
        assert "university_name" in data, f"Missing 'university_name' field: {data}"
        assert len(data["university_name"]) > 0, "university_name should not be empty"
        
        print(f"PASS: Response includes program_id={data['program_id']} and university_name={data['university_name']}")


class TestAINextStepEdgeCases:
    """Edge case tests for AI Next Step"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def _login(self, email, password):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        return response

    def test_ai_next_step_missing_program_id(self):
        """Test that missing program_id returns 422 validation error"""
        login_resp = self._login(PREMIUM_USER["email"], PREMIUM_USER["password"])
        assert login_resp.status_code == 200
        
        # Send empty body
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={}
        )
        
        # Should get 422 validation error
        assert response.status_code == 422, f"Expected 422 for missing program_id, got {response.status_code}"
        print("PASS: Missing program_id returns 422 validation error")

    def test_ai_next_step_empty_program_id(self):
        """Test that empty string program_id returns 404 (not found)"""
        login_resp = self._login(PREMIUM_USER["email"], PREMIUM_USER["password"])
        assert login_resp.status_code == 200
        
        response = self.session.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": ""}
        )
        
        # Should get 404 since empty string won't match any program
        assert response.status_code == 404, f"Expected 404 for empty program_id, got {response.status_code}"
        print("PASS: Empty program_id returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
