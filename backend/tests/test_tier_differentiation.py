"""
Test Tier Differentiation - Validates that Pro (Pro) and Premium (Premium) 
tiers have proper feature gating.

Test Credentials:
- Starter user: csstest@test.com / test1234
- Pro (Pro) user: prouser@test.com / test1234  
- Premium (Premium) user: premuser@test.com / test1234

Key Tests:
1. Backend API gating for outreach-analysis (gated by recruiting_insights, available for pro+)
2. Backend API gating for highlight-advice (gated by auto_reply_detection, premium only)
3. Subscription tier limits verification
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
    """Authenticated session for Pro (Pro) user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PRO_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as pro user: {response.text}")
    return session


@pytest.fixture(scope="module")
def premium_session():
    """Authenticated session for Premium (Premium) user"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=PREMIUM_USER)
    if response.status_code != 200:
        pytest.skip(f"Could not login as premium user: {response.text}")
    return session


class TestSubscriptionTiers:
    """Verify subscription tier configuration"""
    
    def test_starter_user_has_basic_tier(self, starter_session):
        """Verify starter user has basic tier"""
        response = starter_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "basic", f"Expected 'basic' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Starter"
        # Check feature limits
        assert data.get("limits", {}).get("recruiting_insights") == False
        assert data.get("limits", {}).get("auto_reply_detection") == False
        print(f"Starter user subscription: {data}")
        
    def test_pro_user_has_pro_tier(self, pro_session):
        """Verify pro user has pro tier with recruiting_insights enabled"""
        response = pro_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "pro", f"Expected 'pro' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Pro"
        # Check feature limits
        assert data.get("limits", {}).get("recruiting_insights") == True, "Pro should have recruiting_insights"
        assert data.get("limits", {}).get("auto_reply_detection") == False, "Pro should NOT have auto_reply_detection"
        print(f"Pro user subscription: {data}")
        
    def test_premium_user_has_premium_tier(self, premium_session):
        """Verify premium user has premium tier with all features"""
        response = premium_session.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200
        data = response.json()
        assert data.get("tier") == "premium", f"Expected 'premium' tier, got '{data.get('tier')}'"
        assert data.get("label") == "Premium"
        # Check feature limits
        assert data.get("limits", {}).get("recruiting_insights") == True
        assert data.get("limits", {}).get("auto_reply_detection") == True
        print(f"Premium user subscription: {data}")


class TestOutreachAnalysisGating:
    """Test Engagement AI (outreach-analysis) API gating - gated by recruiting_insights"""
    
    def test_starter_user_gets_403_for_outreach_analysis(self, starter_session):
        """Starter user should get 403 for outreach-analysis (recruiting_insights=False)"""
        response = starter_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "recruiting_insights"
        print(f"Starter user outreach-analysis blocked: {detail}")
    
    def test_pro_user_can_access_outreach_analysis(self, pro_session):
        """Pro user should be able to access outreach-analysis (recruiting_insights=True)"""
        response = pro_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        # Pro users have recruiting_insights, so should not get 403
        # May get 200 with data or 200 with empty analysis if no data
        assert response.status_code in [200], f"Pro user should access outreach-analysis, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        # Should have analysis key in response (may be null if no data)
        assert "analysis" in data or "message" in data
        print(f"Pro user outreach-analysis response status: {response.status_code}")
    
    def test_premium_user_can_access_outreach_analysis(self, premium_session):
        """Premium user should be able to access outreach-analysis"""
        response = premium_session.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code in [200], f"Premium user should access outreach-analysis, got {response.status_code}"
        print(f"Premium user outreach-analysis response status: {response.status_code}")


class TestHighlightAdvisorGating:
    """Test Highlight AI (highlight-advice) API gating - gated by auto_reply_detection (premium only)"""
    
    def test_starter_user_gets_403_for_highlight_advice(self, starter_session):
        """Starter user should get 403 for highlight-advice"""
        response = starter_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        assert response.status_code == 403, f"Expected 403 for starter user, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "auto_reply_detection"
        print(f"Starter user highlight-advice blocked: {detail}")
    
    def test_pro_user_gets_403_for_highlight_advice(self, pro_session):
        """Pro user should get 403 for highlight-advice (auto_reply_detection=False for pro)"""
        response = pro_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "auto_reply_detection"
        assert detail.get("upgrade_to") == "premium"
        print(f"Pro user highlight-advice blocked: {detail}")
    
    def test_premium_user_can_access_highlight_advice(self, premium_session):
        """Premium user should be able to access highlight-advice"""
        response = premium_session.post(f"{BASE_URL}/api/ai/highlight-advice", json={})
        # Premium has auto_reply_detection, so should not get 403
        # May get 200 or 500 (if AI call fails) but not 403
        assert response.status_code != 403, f"Premium user should not get 403, got {response.status_code}"
        print(f"Premium user highlight-advice response status: {response.status_code}")


class TestCoachWatchGating:
    """Test Coach Watch API gating - gated by auto_reply_detection (premium only)"""
    
    def test_starter_user_gets_403_for_coach_watch_alerts(self, starter_session):
        """Starter user should get 403 for coach-watch alerts"""
        response = starter_session.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        assert response.status_code == 403
        print(f"Starter user coach-watch blocked")
    
    def test_pro_user_gets_403_for_coach_watch_alerts(self, pro_session):
        """Pro user should get 403 for coach-watch alerts"""
        response = pro_session.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        assert response.status_code == 403, f"Expected 403 for pro user, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("feature") == "auto_reply_detection"
        print(f"Pro user coach-watch blocked: {detail}")
    
    def test_premium_user_can_access_coach_watch_alerts(self, premium_session):
        """Premium user should be able to access coach-watch alerts"""
        response = premium_session.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        assert response.status_code != 403, f"Premium user should not get 403, got {response.status_code}"
        print(f"Premium user coach-watch response status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
