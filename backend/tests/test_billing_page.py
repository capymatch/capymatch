"""
Billing Page Tests - Tests for billing-history, cancel subscription, and reactivate subscription endpoints
Tests: GET /api/stripe/billing-history, POST /api/stripe/cancel, POST /api/stripe/reactivate
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
BASIC_USER = {"email": "stripetest@test.com", "password": "Test1234!"}  # Basic tier - cancel should be rejected
DEMO_USER = {"email": "demo@capymatch.com", "password": "demo2026"}  # Premium tier - can test cancel/reactivate


class TestBillingHistory:
    """Tests for GET /api/stripe/billing-history - Authenticated endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_billing_history_returns_subscription_info(self, auth_session):
        """GET /api/stripe/billing-history returns subscription details"""
        response = auth_session.get(f"{BASE_URL}/api/stripe/billing-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscription" in data, "Response should have 'subscription'"
        assert "transactions" in data, "Response should have 'transactions'"
        assert "cancel_at_period_end" in data, "Response should have 'cancel_at_period_end'"
        assert "plan_expires_at" in data, "Response should have 'plan_expires_at'"
        
        # Verify subscription has required fields
        sub = data["subscription"]
        assert "tier" in sub, "Subscription should have 'tier'"
        assert "label" in sub, "Subscription should have 'label'"
        assert "price" in sub, "Subscription should have 'price'"
        
        print(f"✓ Billing history returned: tier={sub['tier']}, label={sub['label']}")
    
    def test_billing_history_transactions_is_list(self, auth_session):
        """GET /api/stripe/billing-history returns transactions as a list"""
        response = auth_session.get(f"{BASE_URL}/api/stripe/billing-history")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["transactions"], list), "Transactions should be a list"
        print(f"✓ Transactions returned as list with {len(data['transactions'])} items")
    
    def test_billing_history_requires_auth(self):
        """GET /api/stripe/billing-history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauth, got {response.status_code}"
        print("✓ Billing history endpoint requires authentication")


class TestCancelSubscription:
    """Tests for POST /api/stripe/cancel - Authenticated endpoint"""
    
    @pytest.fixture
    def premium_session(self):
        """Login with premium tier user (demo@capymatch.com)"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    @pytest.fixture
    def basic_session(self):
        """Login with basic tier user (stripetest@test.com)"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=BASIC_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_cancel_rejects_basic_user(self, basic_session):
        """POST /api/stripe/cancel rejects basic (free) tier users"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/cancel")
        
        assert response.status_code == 400, f"Expected 400 for basic user, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "free" in data["detail"].lower() or "basic" in data["detail"].lower(), \
            f"Should mention free plan: {data['detail']}"
        
        print(f"✓ Basic user cancellation rejected: {data['detail']}")
    
    def test_cancel_requires_auth(self):
        """POST /api/stripe/cancel requires authentication"""
        response = requests.post(f"{BASE_URL}/api/stripe/cancel")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauth, got {response.status_code}"
        print("✓ Cancel endpoint requires authentication")


class TestReactivateSubscription:
    """Tests for POST /api/stripe/reactivate - Authenticated endpoint"""
    
    @pytest.fixture
    def premium_session(self):
        """Login with premium tier user (demo@capymatch.com)"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_reactivate_requires_pending_cancellation(self, premium_session):
        """POST /api/stripe/reactivate rejects when no pending cancellation"""
        # First check current state
        billing = premium_session.get(f"{BASE_URL}/api/stripe/billing-history").json()
        
        if billing.get("cancel_at_period_end"):
            # If already cancelled, reactivate it first
            reactivate = premium_session.post(f"{BASE_URL}/api/stripe/reactivate")
            assert reactivate.status_code == 200, "Should be able to reactivate"
        
        # Now try to reactivate when not cancelled
        response = premium_session.post(f"{BASE_URL}/api/stripe/reactivate")
        
        assert response.status_code == 400, f"Expected 400 for no pending cancellation, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "no pending" in data["detail"].lower() or "not" in data["detail"].lower(), \
            f"Should mention no pending cancellation: {data['detail']}"
        
        print(f"✓ Reactivate without pending cancellation rejected: {data['detail']}")
    
    def test_reactivate_requires_auth(self):
        """POST /api/stripe/reactivate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/stripe/reactivate")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauth, got {response.status_code}"
        print("✓ Reactivate endpoint requires authentication")


class TestCancelAndReactivateFlow:
    """End-to-end test of cancel -> verify -> reactivate flow for premium user"""
    
    @pytest.fixture
    def premium_session(self):
        """Login with premium tier user (demo@capymatch.com)"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_full_cancel_reactivate_flow(self, premium_session):
        """Test: Cancel -> Verify billing shows cancelled -> Reactivate -> Verify normal"""
        # Step 1: Check initial billing state and ensure not already cancelled
        billing_before = premium_session.get(f"{BASE_URL}/api/stripe/billing-history").json()
        
        if billing_before.get("cancel_at_period_end"):
            # Already cancelled, reactivate first
            reactivate = premium_session.post(f"{BASE_URL}/api/stripe/reactivate")
            assert reactivate.status_code == 200, f"Pre-cleanup reactivation failed: {reactivate.text}"
            billing_before = premium_session.get(f"{BASE_URL}/api/stripe/billing-history").json()
        
        assert not billing_before.get("cancel_at_period_end"), "Should start without pending cancellation"
        print(f"✓ Initial state: tier={billing_before['subscription']['tier']}, cancel_at_period_end=False")
        
        # Step 2: Cancel subscription
        cancel_response = premium_session.post(f"{BASE_URL}/api/stripe/cancel")
        assert cancel_response.status_code == 200, f"Cancel failed: {cancel_response.text}"
        
        cancel_data = cancel_response.json()
        assert "message" in cancel_data
        assert "plan_expires_at" in cancel_data
        print(f"✓ Cancel successful: {cancel_data['message']}")
        print(f"  Plan expires at: {cancel_data['plan_expires_at']}")
        
        # Step 3: Verify billing-history shows cancellation
        billing_cancelled = premium_session.get(f"{BASE_URL}/api/stripe/billing-history").json()
        assert billing_cancelled.get("cancel_at_period_end") == True, "Billing should show cancel_at_period_end=True"
        assert billing_cancelled.get("plan_expires_at") is not None, "Billing should have plan_expires_at"
        print("✓ Billing history shows pending cancellation")
        
        # Step 4: Test double cancellation rejection
        double_cancel = premium_session.post(f"{BASE_URL}/api/stripe/cancel")
        assert double_cancel.status_code == 400, f"Double cancel should be rejected, got {double_cancel.status_code}"
        
        double_data = double_cancel.json()
        assert "already" in double_data.get("detail", "").lower()
        print(f"✓ Double cancellation rejected: {double_data['detail']}")
        
        # Step 5: Reactivate subscription
        reactivate_response = premium_session.post(f"{BASE_URL}/api/stripe/reactivate")
        assert reactivate_response.status_code == 200, f"Reactivate failed: {reactivate_response.text}"
        
        reactivate_data = reactivate_response.json()
        assert "message" in reactivate_data
        print(f"✓ Reactivate successful: {reactivate_data['message']}")
        
        # Step 6: Verify billing-history shows reactivated (no pending cancellation)
        billing_after = premium_session.get(f"{BASE_URL}/api/stripe/billing-history").json()
        assert billing_after.get("cancel_at_period_end") == False, "Should no longer have pending cancellation"
        assert billing_after.get("plan_expires_at") is None, "plan_expires_at should be null after reactivation"
        print("✓ Billing history shows subscription reactivated")
        
        # Step 7: Verify tier is still premium
        assert billing_after["subscription"]["tier"] == billing_before["subscription"]["tier"], \
            "Tier should remain unchanged"
        print(f"✓ Final state: tier={billing_after['subscription']['tier']}, cancel_at_period_end=False")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
