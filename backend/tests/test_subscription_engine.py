"""
Test Suite for Subscription Engine - Phase 2
Tests subscription middleware, feature gating, and subscription routes.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestSubscriptionAPI:
    """Tests for subscription-related API endpoints"""
    
    def test_get_current_subscription(self):
        """GET /api/subscription returns current user's subscription tier, limits, and usage"""
        response = requests.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "tier" in data, "Missing 'tier' field"
        assert "label" in data, "Missing 'label' field"
        assert "limits" in data, "Missing 'limits' field"
        assert "usage" in data, "Missing 'usage' field"
        
        # Verify tier is one of valid options
        assert data["tier"] in ["basic", "pro", "premium"], f"Invalid tier: {data['tier']}"
        
        # Verify limits structure
        limits = data["limits"]
        assert "max_schools" in limits, "Missing max_schools in limits"
        assert "ai_drafts_per_month" in limits, "Missing ai_drafts_per_month in limits"
        assert "gmail_integration" in limits, "Missing gmail_integration in limits"
        assert "analytics" in limits, "Missing analytics in limits"
        assert "recruiting_insights" in limits, "Missing recruiting_insights in limits"
        
        # Verify usage structure
        usage = data["usage"]
        assert "schools" in usage, "Missing schools in usage"
        assert "schools_limit" in usage, "Missing schools_limit in usage"
        assert "ai_drafts_used" in usage, "Missing ai_drafts_used in usage"
        assert "ai_drafts_limit" in usage, "Missing ai_drafts_limit in usage"
        
        print(f"✓ Subscription tier: {data['tier']}, label: {data['label']}")
        print(f"✓ Schools usage: {usage['schools']}/{usage['schools_limit']}")
        print(f"✓ AI drafts: {usage['ai_drafts_used']}/{usage['ai_drafts_limit']}")
    
    def test_get_subscription_tiers(self):
        """GET /api/subscription/tiers returns all 3 tiers with features/prices"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tiers" in data, "Missing 'tiers' field"
        
        tiers = data["tiers"]
        assert len(tiers) == 3, f"Expected 3 tiers, got {len(tiers)}"
        
        # Check tier IDs
        tier_ids = [t["id"] for t in tiers]
        assert "basic" in tier_ids, "Missing basic tier"
        assert "pro" in tier_ids, "Missing pro tier"
        assert "premium" in tier_ids, "Missing premium tier"
        
        # Verify each tier structure
        for tier in tiers:
            assert "id" in tier, "Missing 'id' in tier"
            assert "label" in tier, "Missing 'label' in tier"
            assert "price" in tier, "Missing 'price' in tier"
            assert "features" in tier, "Missing 'features' in tier"
            assert "max_schools" in tier, "Missing 'max_schools' in tier"
            assert "ai_drafts_per_month" in tier, "Missing 'ai_drafts_per_month' in tier"
            assert "gmail_integration" in tier, "Missing 'gmail_integration' in tier"
            assert "analytics" in tier, "Missing 'analytics' in tier"
            print(f"✓ Tier {tier['id']}: ${tier['price']}/mo, {len(tier['features'])} features")
        
        # Verify pricing order
        basic_tier = next(t for t in tiers if t["id"] == "basic")
        pro_tier = next(t for t in tiers if t["id"] == "pro")
        premium_tier = next(t for t in tiers if t["id"] == "premium")
        
        assert basic_tier["price"] == 0, f"Basic tier should be $0, got ${basic_tier['price']}"
        assert pro_tier["price"] == 19, f"Pro tier should be $19, got ${pro_tier['price']}"
        assert premium_tier["price"] == 39, f"Premium tier should be $39, got ${premium_tier['price']}"


class TestSchoolLimitGating:
    """Tests for school limit feature gating (max_schools)"""
    
    def test_programs_create_returns_403_when_at_limit(self):
        """POST /api/programs returns 403 with subscription_limit error when on basic tier (over 5 schools)"""
        # First check current subscription and school count
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        # Skip if user is not on basic tier
        if sub_data["tier"] != "basic":
            pytest.skip(f"User is on {sub_data['tier']} tier, not basic. Skipping limit test.")
        
        # Check current school count
        current_schools = sub_data["usage"]["schools"]
        school_limit = sub_data["usage"]["schools_limit"]
        
        print(f"Current schools: {current_schools}, Limit: {school_limit}")
        
        # If already at or over limit, test creating a new program
        if current_schools >= school_limit:
            # Try to create a new program - should return 403
            response = requests.post(f"{BASE_URL}/api/programs", json={
                "university_name": "TEST_School_For_Limit_Test_12345",
                "division": "D1",
                "region": "Northeast",
            })
            
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            
            data = response.json()
            detail = data.get("detail", {})
            assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
            assert detail.get("feature") == "max_schools", f"Expected max_schools feature, got: {detail.get('feature')}"
            assert "message" in detail, "Missing message in error detail"
            assert "upgrade_to" in detail, "Missing upgrade_to in error detail"
            
            print(f"✓ Correctly blocked program creation with 403: {detail['message']}")
        else:
            print(f"⚠ User has {current_schools} schools, limit is {school_limit}. Cannot test limit - user not at limit.")
            pytest.skip("User not at school limit - cannot test 403 response")


class TestAIDraftGating:
    """Tests for AI draft feature gating"""
    
    def test_draft_email_returns_403_for_basic_tier(self):
        """POST /api/ai/draft-email returns 403 with subscription_limit error for basic tier"""
        # First check current subscription
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        # Skip if not basic tier
        if sub_data["tier"] != "basic":
            pytest.skip(f"User is on {sub_data['tier']} tier, not basic")
        
        # Get a program ID to use
        programs_response = requests.get(f"{BASE_URL}/api/programs")
        assert programs_response.status_code == 200
        programs = programs_response.json()
        
        if not programs:
            pytest.skip("No programs available to test AI draft")
        
        program_id = programs[0]["program_id"]
        
        # Try to create AI draft - should return 403
        response = requests.post(f"{BASE_URL}/api/ai/draft-email", json={
            "program_id": program_id,
            "email_type": "intro"
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        assert detail.get("feature") == "ai_drafts", f"Expected ai_drafts feature, got: {detail.get('feature')}"
        
        print(f"✓ AI draft correctly blocked with 403: {detail.get('message', 'No message')}")
    
    def test_journey_summary_returns_403_for_basic_tier(self):
        """POST /api/ai/journey-summary returns 403 with subscription_limit error for basic tier"""
        # First check current subscription
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        if sub_data["tier"] != "basic":
            pytest.skip(f"User is on {sub_data['tier']} tier, not basic")
        
        # Get a program ID
        programs_response = requests.get(f"{BASE_URL}/api/programs")
        assert programs_response.status_code == 200
        programs = programs_response.json()
        
        if not programs:
            pytest.skip("No programs available to test journey summary")
        
        program_id = programs[0]["program_id"]
        
        # Try journey summary - should return 403
        response = requests.post(f"{BASE_URL}/api/ai/journey-summary", json={
            "program_id": program_id
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        
        print(f"✓ Journey summary correctly blocked with 403")


class TestRecruitingInsightsGating:
    """Tests for recruiting insights feature gating"""
    
    def test_recruiting_insights_returns_403_for_basic_tier(self):
        """GET /api/recruiting-insights returns 403 with subscription_limit error for basic tier"""
        # Check subscription tier
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        if sub_data["tier"] != "basic":
            pytest.skip(f"User is on {sub_data['tier']} tier, not basic")
        
        response = requests.get(f"{BASE_URL}/api/recruiting-insights")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        assert detail.get("feature") == "recruiting_insights", f"Expected recruiting_insights feature, got: {detail.get('feature')}"
        
        print(f"✓ Recruiting insights correctly blocked with 403")


class TestGmailGating:
    """Tests for Gmail integration feature gating"""
    
    def test_gmail_connect_returns_403_for_basic_tier(self):
        """GET /api/gmail/connect returns 403 with subscription_limit error for basic tier"""
        # Check subscription tier
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        if sub_data["tier"] != "basic":
            pytest.skip(f"User is on {sub_data['tier']} tier, not basic")
        
        response = requests.get(f"{BASE_URL}/api/gmail/connect")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", {})
        assert detail.get("error") == "subscription_limit", f"Expected subscription_limit error, got: {detail}"
        assert detail.get("feature") == "gmail_integration", f"Expected gmail_integration feature, got: {detail.get('feature')}"
        
        print(f"✓ Gmail connect correctly blocked with 403")


class TestSubscriptionDataIntegrity:
    """Tests for subscription data accuracy"""
    
    def test_subscription_usage_matches_actual_programs(self):
        """Verify subscription usage.schools matches actual programs count"""
        # Get subscription data
        sub_response = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        
        reported_schools = sub_data["usage"]["schools"]
        
        # Get actual programs count
        programs_response = requests.get(f"{BASE_URL}/api/programs")
        assert programs_response.status_code == 200
        actual_programs = len(programs_response.json())
        
        assert reported_schools == actual_programs, \
            f"Subscription reports {reported_schools} schools but actual is {actual_programs}"
        
        print(f"✓ Schools usage accurate: {reported_schools} schools")
    
    def test_basic_tier_limits_are_correct(self):
        """Verify basic tier has correct limits (5 schools, 0 AI drafts, no Gmail)"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        basic_tier = next(t for t in tiers if t["id"] == "basic")
        
        assert basic_tier["max_schools"] == 5, f"Basic tier max_schools should be 5, got {basic_tier['max_schools']}"
        assert basic_tier["ai_drafts_per_month"] == 0, f"Basic tier ai_drafts should be 0, got {basic_tier['ai_drafts_per_month']}"
        assert basic_tier["gmail_integration"] == False, "Basic tier should not have gmail_integration"
        assert basic_tier["analytics"] == False, "Basic tier should not have analytics"
        
        print("✓ Basic tier limits verified: 5 schools, 0 AI drafts, no Gmail, no Analytics")
    
    def test_pro_tier_limits_are_correct(self):
        """Verify pro tier has correct limits (25 schools, 10 AI drafts, Gmail enabled)"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        pro_tier = next(t for t in tiers if t["id"] == "pro")
        
        assert pro_tier["max_schools"] == 25, f"Pro tier max_schools should be 25, got {pro_tier['max_schools']}"
        assert pro_tier["ai_drafts_per_month"] == 10, f"Pro tier ai_drafts should be 10, got {pro_tier['ai_drafts_per_month']}"
        assert pro_tier["gmail_integration"] == True, "Pro tier should have gmail_integration"
        assert pro_tier["analytics"] == True, "Pro tier should have analytics"
        assert pro_tier["recruiting_insights"] == True, "Pro tier should have recruiting_insights"
        
        print("✓ Pro tier limits verified: 25 schools, 10 AI drafts, Gmail enabled, Analytics enabled")
    
    def test_premium_tier_has_unlimited(self):
        """Verify premium tier has unlimited schools and AI drafts"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        premium_tier = next(t for t in tiers if t["id"] == "premium")
        
        # -1 means unlimited
        assert premium_tier["max_schools"] == -1, f"Premium tier max_schools should be -1 (unlimited), got {premium_tier['max_schools']}"
        assert premium_tier["ai_drafts_per_month"] == -1, f"Premium tier ai_drafts should be -1 (unlimited), got {premium_tier['ai_drafts_per_month']}"
        assert premium_tier["gmail_integration"] == True, "Premium tier should have gmail_integration"
        assert premium_tier["analytics"] == True, "Premium tier should have analytics"
        
        print("✓ Premium tier verified: unlimited schools, unlimited AI drafts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
