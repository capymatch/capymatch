"""
Stripe Integration Tests - Comprehensive test suite for Stripe checkout flow
Tests: /api/stripe/checkout, /api/stripe/checkout/status/{session_id}, /api/webhook/stripe
Plus /api/subscription and /api/subscription/tiers endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
STRIPE_TEST_USER = {"email": "stripetest@test.com", "password": "Test1234!"}
DEMO_USER = {"email": "demo@capymatch.com", "password": "demo2026"}


class TestSubscriptionTiers:
    """Tests for GET /api/subscription/tiers - Public endpoint"""
    
    def test_tiers_returns_all_three_tiers(self):
        """GET /api/subscription/tiers returns all 3 tiers (basic, pro, premium)"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tiers" in data, "Response should have 'tiers' key"
        
        tiers = data["tiers"]
        assert len(tiers) == 3, f"Expected 3 tiers, got {len(tiers)}"
        
        tier_ids = [t["id"] for t in tiers]
        assert "basic" in tier_ids, "Missing basic tier"
        assert "pro" in tier_ids, "Missing pro tier"
        assert "premium" in tier_ids, "Missing premium tier"
        
        print("✓ All 3 tiers returned: basic, pro, premium")
    
    def test_tiers_correct_prices(self):
        """GET /api/subscription/tiers returns correct prices ($0, $29, $49)"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200
        
        tiers = {t["id"]: t for t in response.json()["tiers"]}
        
        assert tiers["basic"]["price"] == 0, f"Basic price should be 0, got {tiers['basic']['price']}"
        assert tiers["pro"]["price"] == 29, f"Pro price should be 29, got {tiers['pro']['price']}"
        assert tiers["premium"]["price"] == 49, f"Premium price should be 49, got {tiers['premium']['price']}"
        
        print("✓ Correct prices: Basic=$0, Pro=$29, Premium=$49")
    
    def test_tiers_have_required_fields(self):
        """Each tier has required fields: id, label, price, features, description"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200
        
        required_fields = ["id", "label", "price", "features", "description", "max_schools"]
        
        for tier in response.json()["tiers"]:
            for field in required_fields:
                assert field in tier, f"Tier {tier.get('id', 'unknown')} missing '{field}'"
        
        print("✓ All tiers have required fields")


class TestSubscriptionEndpoint:
    """Tests for GET /api/subscription - Authenticated endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_subscription_returns_user_details(self, auth_session):
        """GET /api/subscription returns current user's subscription details"""
        response = auth_session.get(f"{BASE_URL}/api/subscription")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tier" in data, "Response should have 'tier'"
        assert "label" in data, "Response should have 'label'"
        assert "price" in data, "Response should have 'price'"
        assert "limits" in data, "Response should have 'limits'"
        assert "usage" in data, "Response should have 'usage'"
        
        print(f"✓ Subscription returned: tier={data['tier']}, label={data['label']}")
    
    def test_subscription_requires_auth(self):
        """GET /api/subscription requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription")
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauth, got {response.status_code}"
        print("✓ Subscription endpoint requires authentication")


class TestStripeCheckout:
    """Tests for POST /api/stripe/checkout - Authenticated endpoint"""
    
    @pytest.fixture
    def basic_session(self):
        """Login with a basic tier user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=STRIPE_TEST_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    @pytest.fixture
    def premium_session(self):
        """Login with premium tier user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        return session
    
    def test_checkout_pro_plan_success(self, basic_session):
        """POST /api/stripe/checkout with plan=pro returns Stripe URL and session_id"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should have 'url'"
        assert "session_id" in data, "Response should have 'session_id'"
        assert "checkout.stripe.com" in data["url"] or "stripe" in data["url"].lower()
        assert data["session_id"].startswith("cs_")
        
        print(f"✓ Pro checkout session created: {data['session_id'][:20]}...")
    
    def test_checkout_premium_plan_success(self, basic_session):
        """POST /api/stripe/checkout with plan=premium returns Stripe URL and session_id"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "premium",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["session_id"].startswith("cs_")
        
        print(f"✓ Premium checkout session created: {data['session_id'][:20]}...")
    
    def test_checkout_invalid_plan_rejected(self, basic_session):
        """POST /api/stripe/checkout rejects invalid plan names"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "ultra",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "pro" in data["detail"].lower()
        
        print(f"✓ Invalid plan rejected: {data['detail']}")
    
    def test_checkout_requires_origin_url(self, basic_session):
        """POST /api/stripe/checkout requires origin_url"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro"
            # No origin_url
        })
        
        assert response.status_code == 400, f"Expected 400 for missing origin_url, got {response.status_code}"
        
        data = response.json()
        assert "origin_url" in data.get("detail", "").lower()
        
        print(f"✓ Missing origin_url rejected: {data['detail']}")
    
    def test_checkout_empty_origin_url_rejected(self, basic_session):
        """POST /api/stripe/checkout rejects empty origin_url"""
        response = basic_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro",
            "origin_url": ""
        })
        
        assert response.status_code == 400, f"Expected 400 for empty origin_url, got {response.status_code}"
        print("✓ Empty origin_url correctly rejected")
    
    def test_checkout_downgrade_rejected(self, premium_session):
        """POST /api/stripe/checkout rejects downgrade (premium user to pro)"""
        response = premium_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        
        assert response.status_code == 400, f"Expected 400 for downgrade, got {response.status_code}"
        
        data = response.json()
        assert "already" in data.get("detail", "").lower() or "higher" in data.get("detail", "").lower()
        
        print(f"✓ Downgrade rejected: {data['detail']}")


class TestStripeCheckoutStatus:
    """Tests for GET /api/stripe/checkout/status/{session_id}"""
    
    @pytest.fixture
    def checkout_session(self):
        """Create a checkout session and return session_id"""
        session = requests.Session()
        login = session.post(f"{BASE_URL}/api/auth/login", json=STRIPE_TEST_USER)
        if login.status_code != 200:
            pytest.skip("Auth failed")
        
        response = session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        if response.status_code != 200:
            pytest.skip("Could not create checkout session")
        
        return {"session": session, "session_id": response.json()["session_id"]}
    
    def test_status_returns_payment_info(self, checkout_session):
        """GET /api/stripe/checkout/status/{session_id} returns status info"""
        session = checkout_session["session"]
        session_id = checkout_session["session_id"]
        
        response = session.get(f"{BASE_URL}/api/stripe/checkout/status/{session_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should have 'status'"
        assert "payment_status" in data, "Response should have 'payment_status'"
        assert "plan" in data, "Response should have 'plan'"
        
        assert data["payment_status"] in ["unpaid", "open", "paid", "pending"]
        assert data["plan"] == "pro"
        
        print(f"✓ Status: {data['status']}, Payment: {data['payment_status']}, Plan: {data['plan']}")
    
    def test_status_invalid_session_returns_404(self):
        """GET /api/stripe/checkout/status/invalid returns 404"""
        session = requests.Session()
        login = session.post(f"{BASE_URL}/api/auth/login", json=STRIPE_TEST_USER)
        if login.status_code != 200:
            pytest.skip("Auth failed")
        
        response = session.get(f"{BASE_URL}/api/stripe/checkout/status/cs_invalid_12345")
        
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
        
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        
        print(f"✓ Invalid session returns 404: {data.get('detail')}")


class TestStripeWebhook:
    """Tests for POST /api/webhook/stripe"""
    
    def test_webhook_endpoint_exists(self):
        """POST /api/webhook/stripe endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            headers={"Content-Type": "application/json"},
            data=b'{}'
        )
        
        # Endpoint should exist (not 404) - may return 200 with {"ok": true} for graceful handling
        assert response.status_code != 404, "Webhook endpoint should exist"
        
        print(f"✓ Webhook endpoint exists, returned status: {response.status_code}")


class TestTransactionCreation:
    """Tests that transactions are created in DB"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=STRIPE_TEST_USER)
        if response.status_code != 200:
            pytest.skip("Auth failed")
        return session
    
    def test_checkout_creates_transaction(self, auth_session):
        """Checkout creates a pending transaction that can be retrieved via status"""
        # Create checkout
        checkout_resp = auth_session.post(f"{BASE_URL}/api/stripe/checkout", json={
            "plan": "pro",
            "origin_url": "https://oauth-debug-12.preview.emergentagent.com"
        })
        assert checkout_resp.status_code == 200
        session_id = checkout_resp.json()["session_id"]
        
        # Verify transaction exists via status endpoint
        status_resp = auth_session.get(f"{BASE_URL}/api/stripe/checkout/status/{session_id}")
        assert status_resp.status_code == 200, "Transaction should be retrievable"
        
        data = status_resp.json()
        assert data["plan"] == "pro"
        
        print(f"✓ Transaction created and retrievable for session {session_id[:20]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
