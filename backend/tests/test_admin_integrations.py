"""
Test Admin Integrations API - iteration 30
Tests for: GET /api/admin/integrations, PUT /api/admin/integrations/stripe, DELETE /api/admin/integrations/gmail/{user_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGetIntegrationsStatus:
    """Test GET /api/admin/integrations - returns status for gmail, stripe, and ai integrations"""

    def test_get_integrations_returns_all_three_services(self):
        """Verify the endpoint returns gmail, stripe, and ai integration data"""
        response = requests.get(f"{BASE_URL}/api/admin/integrations")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all 3 integrations are present
        assert "gmail" in data, "Missing 'gmail' in response"
        assert "stripe" in data, "Missing 'stripe' in response"
        assert "ai" in data, "Missing 'ai' in response"
        print(f"✓ GET /api/admin/integrations returns all 3 integration statuses")

    def test_gmail_integration_structure(self):
        """Verify Gmail integration returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        gmail = response.json()["gmail"]
        assert "connected" in gmail, "Missing 'connected' in gmail"
        assert "configured" in gmail, "Missing 'configured' in gmail"
        assert "client_id_set" in gmail, "Missing 'client_id_set' in gmail"
        assert "connected_users" in gmail, "Missing 'connected_users' in gmail"
        assert "total_connected" in gmail, "Missing 'total_connected' in gmail"
        assert isinstance(gmail["connected_users"], list), "connected_users should be a list"
        print(f"✓ Gmail integration structure is correct: configured={gmail['configured']}, connected={gmail['connected']}")

    def test_stripe_integration_structure(self):
        """Verify Stripe integration returns correct structure with stats"""
        response = requests.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        stripe = response.json()["stripe"]
        assert "connected" in stripe, "Missing 'connected' in stripe"
        assert "key_masked" in stripe, "Missing 'key_masked' in stripe"
        assert "is_live" in stripe, "Missing 'is_live' in stripe"
        assert "mode" in stripe, "Missing 'mode' in stripe"
        assert "stats" in stripe, "Missing 'stats' in stripe"
        
        # Stats structure
        stats = stripe["stats"]
        assert "total_transactions" in stats, "Missing 'total_transactions' in stats"
        assert "paid_transactions" in stats, "Missing 'paid_transactions' in stats"
        assert "pending_transactions" in stats, "Missing 'pending_transactions' in stats"
        assert "total_revenue" in stats, "Missing 'total_revenue' in stats"
        print(f"✓ Stripe integration structure is correct: mode={stripe['mode']}, key_masked={stripe['key_masked']}")

    def test_ai_integration_structure(self):
        """Verify AI integration returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        ai = response.json()["ai"]
        assert "connected" in ai, "Missing 'connected' in ai"
        assert "key_masked" in ai, "Missing 'key_masked' in ai"
        assert "provider" in ai, "Missing 'provider' in ai"
        assert "stats" in ai, "Missing 'stats' in ai"
        
        # Stats structure
        stats = ai["stats"]
        assert "usage_this_month" in stats, "Missing 'usage_this_month' in stats"
        assert "usage_total" in stats, "Missing 'usage_total' in stats"
        print(f"✓ AI integration structure is correct: provider={ai['provider']}, connected={ai['connected']}")


class TestUpdateStripeKey:
    """Test PUT /api/admin/integrations/stripe - updates the Stripe API key"""

    def test_update_stripe_key_valid_test_key(self):
        """Verify valid test key is accepted (sk_test_...)"""
        new_key = "sk_test_new12345678901234"
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": new_key}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] is True, "Expected ok=True"
        assert "key_masked" in data, "Missing 'key_masked' in response"
        assert "is_live" in data, "Missing 'is_live' in response"
        assert data["is_live"] is False, "Test key should have is_live=False"
        assert data["mode"] == "Test", f"Expected mode='Test', got {data['mode']}"
        print(f"✓ PUT /api/admin/integrations/stripe accepts valid test key, mode={data['mode']}")

        # Restore original key
        requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": "sk_test_emergent"}
        )

    def test_update_stripe_key_valid_live_key(self):
        """Verify valid live key is accepted (sk_live_...)"""
        new_key = "sk_live_new12345678901234"
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": new_key}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] is True, "Expected ok=True"
        assert data["is_live"] is True, "Live key should have is_live=True"
        assert data["mode"] == "Live", f"Expected mode='Live', got {data['mode']}"
        print(f"✓ PUT /api/admin/integrations/stripe accepts valid live key, mode={data['mode']}")

        # Restore original key
        requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": "sk_test_emergent"}
        )

    def test_update_stripe_key_rejects_empty_key(self):
        """Verify empty key is rejected with 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": ""}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "required" in response.json().get("detail", "").lower(), "Expected 'required' in error message"
        print(f"✓ PUT /api/admin/integrations/stripe rejects empty key with 400")

    def test_update_stripe_key_rejects_whitespace_only(self):
        """Verify whitespace-only key is rejected with 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": "   "}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ PUT /api/admin/integrations/stripe rejects whitespace-only key with 400")

    def test_update_stripe_key_rejects_invalid_format(self):
        """Verify keys not starting with sk_ are rejected"""
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": "pk_test_12345678"}  # Public key format
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "sk_" in response.json().get("detail", "").lower(), "Expected 'sk_' in error message"
        print(f"✓ PUT /api/admin/integrations/stripe rejects invalid key format with 400")

    def test_update_stripe_key_rejects_random_string(self):
        """Verify random strings are rejected"""
        response = requests.put(
            f"{BASE_URL}/api/admin/integrations/stripe",
            json={"api_key": "random_invalid_key_123"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ PUT /api/admin/integrations/stripe rejects random strings with 400")


class TestDisconnectGmail:
    """Test DELETE /api/admin/integrations/gmail/{user_id} - disconnects Gmail for a user"""

    def test_disconnect_gmail_nonexistent_user(self):
        """Verify 404 is returned for non-existent user"""
        fake_user_id = "nonexistent_user_12345"
        response = requests.delete(f"{BASE_URL}/api/admin/integrations/gmail/{fake_user_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert "not found" in response.json().get("detail", "").lower(), "Expected 'not found' in error message"
        print(f"✓ DELETE /api/admin/integrations/gmail/{{user_id}} returns 404 for non-existent user")


class TestStripeCheckoutRegression:
    """Regression check - POST /api/stripe/checkout should still work"""

    def test_stripe_checkout_still_works(self):
        """Verify Stripe checkout endpoint still works after adding new integrations endpoints"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/checkout",
            json={
                "plan": "pro",
                "origin_url": "https://match-prep-1.preview.emergentagent.com/settings"
            }
        )
        
        # Should return 200 with checkout URL (or 400 if user already on pro - both are valid)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Missing 'url' in response"
            assert "checkout.stripe.com" in data["url"], "URL should be Stripe checkout URL"
            print(f"✓ POST /api/stripe/checkout still works (returned checkout URL)")
        else:
            print(f"✓ POST /api/stripe/checkout still works (returned 400 - user may already be on pro)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
