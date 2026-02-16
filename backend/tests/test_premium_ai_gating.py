"""
Test Premium-Only AI Features - Validates that ALL AI features are now Commit Ready (Premium) tier only.

This test validates the updated subscription tiers where:
- Starter (Basic): No AI features
- Pro (Active Recruit): No AI features (ai_drafts_per_month=0, recruiting_insights=False)
- Premium (Commit Ready): All AI features enabled

Test Credentials:
- Starter user: csstest@test.com / test1234
- Pro (Active Recruit) user: prouser@test.com / test1234  
- Premium (Commit Ready) user: premuser@test.com / test1234

Key Tests:
1. Subscription tier verification (Pro now has recruiting_insights=False, ai_drafts_per_month=0)
2. Backend API gating for outreach-analysis (now premium only via auto_reply_detection)
3. Backend API gating for draft-email (now premium only via ai_drafts_per_month=0)
4. Backend API gating for assistant (now premium only via ai_drafts_per_month=0)
5. Subscription tiers API check (Pro tier should NOT list 'AI-written email drafts')
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
STARTER_USER = {"email": "csstest@test.com", "password": "test1234"}
PRO_USER = {"email": "prouser@test.com", "password": "test1234"}
PREMIUM_USER = {"email": "premuser@test.com", "password": "test1234"}


@pytest.fixture(scope="module")
def starter_session():
    """Authenticated session for Starter (basic) user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=STARTER_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as starter user: {response.text}")
    return session


@pytest.fixture(scope="module")
def pro_session():
    """Authenticated session for Pro (Active Recruit) user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PRO_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as pro user: {response.text}")
    return session


@pytest.fixture(scope="module")
def premium_session():
    """Authenticated session for Premium (Commit Ready) user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PREMIUM_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as premium user: {response.text}")
    return session


class TestUpdatedSubscriptionTiers:
    """Verify updated subscription tier configuration - ALL AI is now premium only"""
    
    def test_starter_user_subscription(self, starter_session):
        """Verify starter user has basic tier with no AI features"""
        response = starter_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "basic", f"Expected 'basic' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Starter"
        # Check feature limits - no AI features
        limits = data.get("limits", {})
        assert limits.get("recruiting_insights") == False
        assert limits.get("auto_reply_detection") == False
        # Check usage - ai_drafts_limit should be 0
        usage = data.get("usage", {})
        assert usage.get("ai_drafts_limit") == 0, f"Starter ai_drafts_limit should be 0, got {usage.get('ai_drafts_limit')}"
        print(f"✓ Starter user subscription verified: tier=basic, ai_drafts=0")
        
    def test_pro_user_subscription_no_ai(self, pro_session):
        """Verify pro user has NO AI features now (ai_drafts_per_month=0, recruiting_insights=False)"""
        response = pro_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "pro", f"Expected 'pro' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Active Recruit"
        # Check feature limits - NO AI features for pro anymore
        limits = data.get("limits", {})
        assert limits.get("recruiting_insights") == False, f"Pro should have recruiting_insights=False, got {limits.get('recruiting_insights')}"
        assert limits.get("auto_reply_detection") == False, f"Pro should have auto_reply_detection=False, got {limits.get('auto_reply_detection')}"
        # Check usage - ai_drafts_limit should be 0 for pro
        usage = data.get("usage", {})
        assert usage.get("ai_drafts_limit") == 0, f"Pro ai_drafts_limit should be 0 now, got {usage.get('ai_drafts_limit')}"
        print(f"✓ Pro user subscription verified: tier=pro, ai_drafts=0, recruiting_insights=False")
        
    def test_premium_user_subscription_all_ai(self, premium_session):
        """Verify premium user has ALL AI features enabled"""
        response = premium_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "premium", f"Expected 'premium' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Commit Ready"
        # Check feature limits - ALL AI features
        limits = data.get("limits", {})
        assert limits.get("recruiting_insights") == True, "Premium should have recruiting_insights=True"
        assert limits.get("auto_reply_detection") == True, "Premium should have auto_reply_detection=True"
        # Check usage - ai_drafts_limit should be unlimited (-1)
        usage = data.get("usage", {})
        assert usage.get("ai_drafts_limit") == -1, f"Premium ai_drafts_limit should be unlimited (-1), got {usage.get('ai_drafts_limit')}"
        print(f"✓ Premium user subscription verified: tier=premium, all AI features enabled")


class TestOutreachAnalysisGating:
    """Test Engagement AI (outreach-analysis) API gating - now premium only via auto_reply_detection"""
    
    def test_starter_user_gets_403_for_outreach_analysis(self, starter_session):
        """Starter user should get 403 for outreach-analysis"""
        response = starter_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        print(f"✓ Starter user blocked from outreach-analysis")
    
    def test_pro_user_gets_403_for_outreach_analysis(self, pro_session):
        """Pro user should NOW get 403 for outreach-analysis (premium only via auto_reply_detection)"""
        response = pro_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        detail = data.get("detail", {})
        # Should be gated by auto_reply_detection now
        assert detail.get("feature") == "auto_reply_detection", f"Expected 'auto_reply_detection' gating, got {detail.get('feature')}"
        assert detail.get("upgrade_to") == "premium"
        print(f"✓ Pro user blocked from outreach-analysis (premium only)")
    
    def test_premium_user_can_access_outreach_analysis(self, premium_session):
        """Premium user should be able to access outreach-analysis"""
        response = premium_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code in [200], f"Premium user should access outreach-analysis, got {response.status_code}"
        print(f"✓ Premium user can access outreach-analysis")


class TestDraftEmailGating:
    """Test AI draft-email API gating - now premium only via ai_drafts_per_month=0"""
    
    def test_starter_user_gets_403_for_draft_email(self, starter_session):
        """Starter user should get 403 for draft-email"""
        response = starter_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": "test-program-123",
            "email_type": "intro"
        })
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        print(f"✓ Starter user blocked from draft-email")
    
    def test_pro_user_gets_403_for_draft_email(self, pro_session):
        """Pro user should NOW get 403 for draft-email (ai_drafts_per_month=0)"""
        response = pro_session.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": "test-program-123",
            "email_type": "intro"
        })
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        detail = data.get("detail", {})
        # Should be gated by ai_drafts feature
        assert detail.get("feature") == "ai_drafts", f"Expected 'ai_drafts' gating, got {detail.get('feature')}"
        print(f"✓ Pro user blocked from draft-email (premium only)")


class TestAIAssistantGating:
    """Test AI assistant API gating - now premium only via ai_drafts_per_month=0"""
    
    def test_starter_user_gets_403_for_assistant(self, starter_session):
        """Starter user should get 403 for AI assistant"""
        response = starter_session.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "Hello"
        })
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        print(f"✓ Starter user blocked from AI assistant")
    
    def test_pro_user_gets_403_for_assistant(self, pro_session):
        """Pro user should NOW get 403 for AI assistant (ai_drafts_per_month=0)"""
        response = pro_session.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "Hello"
        })
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "ai_drafts", f"Expected 'ai_drafts' gating, got {detail.get('feature')}"
        print(f"✓ Pro user blocked from AI assistant (premium only)")


class TestSubscriptionTiersAPI:
    """Test /api/subscription/tiers endpoint to verify Pro tier features list"""
    
    def test_subscription_tiers_pro_no_ai_drafts_feature(self, pro_session):
        """Verify Pro tier features list does NOT include 'AI-written email drafts' and ai_drafts_per_month=0"""
        response = pro_session.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        tiers = data.get("tiers", [])  # API returns a list, not dict
        
        # Find Pro tier from the list
        pro_tier = None
        for tier in tiers:
            if tier.get("id") == "pro":
                pro_tier = tier
                break
        
        assert pro_tier is not None, "Pro tier not found in subscription tiers API"
        pro_features = pro_tier.get("features", [])
        
        # Verify Pro tier has ai_drafts_per_month = 0
        assert pro_tier.get("ai_drafts_per_month") == 0, f"Pro ai_drafts_per_month should be 0, got {pro_tier.get('ai_drafts_per_month')}"
        
        # Pro tier should NOT have AI-written email drafts in features list
        ai_feature_present = any("ai" in feat.lower() and ("draft" in feat.lower() or "email" in feat.lower() or "summar" in feat.lower()) for feat in pro_features)
        assert not ai_feature_present, f"Pro tier should not have AI drafts/emails/summaries feature in list: {pro_features}"
        
        print(f"✓ Pro tier features verified: ai_drafts_per_month=0, no AI email features: {pro_features}")


class TestHighlightAdvisorGating:
    """Test Highlight AI (highlight-advice) API gating - premium only via auto_reply_detection"""
    
    def test_starter_user_gets_403_for_highlight_advice(self, starter_session):
        """Starter user should get 403 for highlight-advice"""
        response = starter_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        print(f"✓ Starter user blocked from highlight-advice")
    
    def test_pro_user_gets_403_for_highlight_advice(self, pro_session):
        """Pro user should get 403 for highlight-advice (auto_reply_detection=False)"""
        response = pro_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "auto_reply_detection"
        assert detail.get("upgrade_to") == "premium"
        print(f"✓ Pro user blocked from highlight-advice (premium only)")
    
    def test_premium_user_can_access_highlight_advice(self, premium_session):
        """Premium user should be able to access highlight-advice"""
        response = premium_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        # Premium has auto_reply_detection, so should not get 403
        assert response.status_code != 403, f"Premium user should not get 403, got {response.status_code}"
        print(f"✓ Premium user can access highlight-advice")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
