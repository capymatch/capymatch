"""
Comprehensive Pro User AI Gating Test - Verifies ALL AI features are properly gated for Pro users.

This is a RECURRING BUG test - Pro users should NOT have access to any AI features.

Test Credentials:
- Pro user: pro@test.com / password
- Premium user: premium@test.com / password

Test Scenarios:
1. POST /api/ai/next-step - should return 403 subscription_limit for Pro user
2. POST /api/ai/draft-email - should return 403 subscription_limit for Pro user  
3. POST /api/ai/journey-summary - should return 403 subscription_limit for Pro user
4. Premium user should be able to access all above endpoints (200 or valid response)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials from the bug report
PRO_USER = {"email": "pro@test.com", "password": "password"}
PREMIUM_USER = {"email": "premium@test.com", "password": "password"}


@pytest.fixture(scope="module")
def pro_session():
    """Authenticated session for Pro user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PRO_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as pro user (pro@test.com): {response.status_code} - {response.text}")
    print(f"✓ Logged in as Pro user: {PRO_USER['email']}")
    return session


@pytest.fixture(scope="module")
def premium_session():
    """Authenticated session for Premium user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PREMIUM_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as premium user (premium@test.com): {response.status_code} - {response.text}")
    print(f"✓ Logged in as Premium user: {PREMIUM_USER['email']}")
    return session


@pytest.fixture(scope="module")
def pro_program_id(pro_session):
    """Get a valid program_id for the Pro user to use in tests"""
    response = pro_session.get(f"{BASE_URL}/api/programs")
    if response.status_code != 200 or not response.json():
        pytest.skip("Pro user has no programs to test against")
    programs = response.json()
    program_id = programs[0].get("program_id")
    print(f"✓ Pro user program: {programs[0].get('university_name')} ({program_id})")
    return program_id


@pytest.fixture(scope="module")
def premium_program_id(premium_session):
    """Get a valid program_id for the Premium user to use in tests"""
    response = premium_session.get(f"{BASE_URL}/api/programs")
    if response.status_code != 200 or not response.json():
        pytest.skip("Premium user has no programs to test against")
    programs = response.json()
    program_id = programs[0].get("program_id")
    print(f"✓ Premium user program: {programs[0].get('university_name')} ({program_id})")
    return program_id


class TestProUserSubscriptionVerification:
    """Verify Pro user subscription tier and AI limits"""

    def test_pro_user_has_zero_ai_drafts(self, pro_session):
        """Pro user should have ai_drafts_limit = 0"""
        response = pro_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("tier") == "pro", f"Expected 'pro' tier, got '{data.get('tier')}'"
        
        # Check usage limits
        usage = data.get("usage", {})
        assert usage.get("ai_drafts_limit") == 0, f"Pro user should have ai_drafts_limit=0, got {usage.get('ai_drafts_limit')}"
        
        # Check feature limits
        limits = data.get("limits", {})
        assert limits.get("recruiting_insights") == False, f"Pro should not have recruiting_insights"
        assert limits.get("auto_reply_detection") == False, f"Pro should not have auto_reply_detection"
        
        print(f"✓ Pro user subscription verified: tier=pro, ai_drafts_limit=0")


class TestProUserAINextStepGating:
    """Test POST /api/ai/next-step returns 403 for Pro user"""

    def test_pro_user_gets_403_for_next_step(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for /api/ai/next-step"""
        response = pro_session.post(f"{BASE_URL}/api/ai/next-step", json={
            "program_id": pro_program_id
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        
        data = response.json()
        detail = data.get("detail", {})
        
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        assert detail.get("feature") == "ai_drafts", f"Expected ai_drafts feature, got: {detail.get('feature')}"
        
        print(f"✓ Pro user correctly blocked from /api/ai/next-step with 403 subscription_limit")


class TestProUserAIDraftEmailGating:
    """Test POST /api/ai/draft-email returns 403 for Pro user"""

    def test_pro_user_gets_403_for_draft_email_intro(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for intro email draft"""
        response = pro_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": pro_program_id,
            "email_type": "intro"
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        
        data = response.json()
        detail = data.get("detail", {})
        
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        
        print(f"✓ Pro user correctly blocked from draft-email (intro) with 403")

    def test_pro_user_gets_403_for_draft_email_follow_up(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for follow_up email draft"""
        response = pro_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": pro_program_id,
            "email_type": "follow_up"
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        print(f"✓ Pro user correctly blocked from draft-email (follow_up) with 403")

    def test_pro_user_gets_403_for_draft_email_thank_you(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for thank_you email draft"""
        response = pro_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": pro_program_id,
            "email_type": "thank_you"
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        print(f"✓ Pro user correctly blocked from draft-email (thank_you) with 403")

    def test_pro_user_gets_403_for_draft_email_interest_update(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for interest_update email draft"""
        response = pro_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": pro_program_id,
            "email_type": "interest_update"
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        print(f"✓ Pro user correctly blocked from draft-email (interest_update) with 403")


class TestProUserAIJourneySummaryGating:
    """Test POST /api/ai/journey-summary returns 403 for Pro user"""

    def test_pro_user_gets_403_for_journey_summary(self, pro_session, pro_program_id):
        """Pro user should get 403 subscription_limit for /api/ai/journey-summary"""
        response = pro_session.post(f"{BASE_URL}/api/ai/journey-summary", json={
            "program_id": pro_program_id
        })
        
        assert response.status_code == 403, f"Expected 403 for Pro user, got {response.status_code}"
        
        data = response.json()
        detail = data.get("detail", {})
        
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        
        print(f"✓ Pro user correctly blocked from /api/ai/journey-summary with 403 subscription_limit")


class TestPremiumUserSubscriptionVerification:
    """Verify Premium user has all AI features enabled"""

    def test_premium_user_has_unlimited_ai_drafts(self, premium_session):
        """Premium user should have ai_drafts_limit = -1 (unlimited)"""
        response = premium_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("tier") == "premium", f"Expected 'premium' tier, got '{data.get('tier')}'"
        
        # Check usage limits
        usage = data.get("usage", {})
        assert usage.get("ai_drafts_limit") == -1, f"Premium user should have ai_drafts_limit=-1 (unlimited), got {usage.get('ai_drafts_limit')}"
        
        # Check feature limits
        limits = data.get("limits", {})
        assert limits.get("recruiting_insights") == True, f"Premium should have recruiting_insights"
        assert limits.get("auto_reply_detection") == True, f"Premium should have auto_reply_detection"
        
        print(f"✓ Premium user subscription verified: tier=premium, ai_drafts_limit=-1 (unlimited)")


class TestPremiumUserCanAccessAI:
    """Verify Premium user CAN access all AI endpoints"""

    def test_premium_user_can_call_next_step(self, premium_session, premium_program_id):
        """Premium user should be able to call /api/ai/next-step without 403"""
        response = premium_session.post(f"{BASE_URL}/api/ai/next-step", json={
            "program_id": premium_program_id
        })
        
        # Should NOT get 403
        assert response.status_code != 403, f"Premium user should NOT get 403, got {response.status_code}"
        
        # Should get 200 or possibly 400/500 (for other reasons, not subscription)
        if response.status_code == 200:
            data = response.json()
            assert "next_step" in data, f"Response should contain 'next_step' field"
            print(f"✓ Premium user can access /api/ai/next-step (200 OK)")
        else:
            print(f"⚠ Premium user got {response.status_code} (not 403 - not a subscription issue)")

    def test_premium_user_can_call_draft_email(self, premium_session, premium_program_id):
        """Premium user should be able to call /api/ai/draft-email without 403"""
        response = premium_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": premium_program_id,
            "email_type": "intro"
        })
        
        # Should NOT get 403
        assert response.status_code != 403, f"Premium user should NOT get 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "body" in data or "subject" in data, f"Response should contain email draft fields"
            print(f"✓ Premium user can access /api/ai/draft-email (200 OK)")
        else:
            print(f"⚠ Premium user got {response.status_code} (not 403 - not a subscription issue): {response.text[:200]}")

    def test_premium_user_can_call_journey_summary(self, premium_session, premium_program_id):
        """Premium user should be able to call /api/ai/journey-summary without 403"""
        response = premium_session.post(f"{BASE_URL}/api/ai/journey-summary", json={
            "program_id": premium_program_id
        })
        
        # Should NOT get 403
        assert response.status_code != 403, f"Premium user should NOT get 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "relationship_summary" in data or "key_highlights" in data, f"Response should contain summary fields"
            print(f"✓ Premium user can access /api/ai/journey-summary (200 OK)")
        else:
            print(f"⚠ Premium user got {response.status_code} (not 403 - not a subscription issue): {response.text[:200]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
