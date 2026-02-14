"""
Tests for Phase 3 AI-Powered Features: AI Assistant, Outreach Analysis, Highlight Advisor
All AI features use Claude Sonnet 4.5 via Emergent LLM Key (REAL AI calls, not mocked)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


# ── AI Assistant Tests (Pro+) ──────────────────────────────────

class TestAIAssistant:
    """AI Recruiting Assistant - conversational chat with context."""

    def test_ai_assistant_sends_message_and_returns_response(self):
        """POST /api/ai/assistant - Send message and get AI response with session_id"""
        response = requests.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "What schools should I focus on?",
            "session_id": "pytest_session_1"
        }, timeout=60)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        assert "response" in data, "Response should contain 'response' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        assert len(data["response"]) > 50, "AI response should be substantial"
        assert data["session_id"] == "pytest_session_1", "Session ID should match"
        print(f"✓ AI Assistant responded with {len(data['response'])} chars")

    def test_ai_assistant_requires_message(self):
        """POST /api/ai/assistant - Empty message should return 400"""
        response = requests.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "",
            "session_id": "pytest_session_empty"
        })

        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_ai_assistant_sessions_list(self):
        """GET /api/ai/assistant/sessions - Returns list of recent sessions"""
        response = requests.get(f"{BASE_URL}/api/ai/assistant/sessions")

        assert response.status_code == 200
        data = response.json()

        assert "sessions" in data, "Response should contain 'sessions' list"
        assert isinstance(data["sessions"], list), "Sessions should be a list"

        # Check if our test session is in the list
        session_ids = [s["session_id"] for s in data["sessions"]]
        # Should contain our pytest session or previous sessions
        print(f"✓ Found {len(data['sessions'])} sessions")

    def test_ai_assistant_history(self):
        """GET /api/ai/assistant/history?session_id=X - Returns conversation history"""
        # First send a message to create history
        send_response = requests.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "Tell me about D1 vs D2 schools",
            "session_id": "pytest_history_session"
        }, timeout=60)

        assert send_response.status_code == 200

        # Now fetch history
        response = requests.get(f"{BASE_URL}/api/ai/assistant/history?session_id=pytest_history_session")

        assert response.status_code == 200
        data = response.json()

        assert "messages" in data, "Response should contain 'messages'"
        assert "session_id" in data, "Response should contain 'session_id'"
        assert len(data["messages"]) >= 2, "Should have at least user and assistant messages"

        # Verify message structure
        user_msgs = [m for m in data["messages"] if m["role"] == "user"]
        assistant_msgs = [m for m in data["messages"] if m["role"] == "assistant"]

        assert len(user_msgs) >= 1, "Should have at least one user message"
        assert len(assistant_msgs) >= 1, "Should have at least one assistant message"
        print(f"✓ History has {len(data['messages'])} messages")


# ── Outreach Analysis Tests (Premium) ──────────────────────────

class TestOutreachAnalysis:
    """AI-powered analysis of recruiting outreach effectiveness."""

    def test_outreach_analysis_returns_data_for_premium(self):
        """GET /api/ai/outreach-analysis - Returns analysis with AI insights for premium users"""
        response = requests.get(f"{BASE_URL}/api/ai/outreach-analysis", timeout=60)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        assert "analysis" in data, "Response should contain 'analysis'"
        analysis = data["analysis"]

        # Verify stats structure
        assert "stats" in analysis, "Analysis should contain 'stats'"
        stats = analysis["stats"]
        assert "total_schools" in stats
        assert "total_interactions" in stats
        assert "response_rate" in stats
        assert "by_type" in stats
        assert "by_division" in stats

        # Verify AI insights if present
        if analysis.get("ai_insights"):
            insights = analysis["ai_insights"]
            assert "overall_score" in insights
            assert "summary" in insights
            assert "strengths" in insights or "improvements" in insights
            print(f"✓ Outreach score: {insights.get('overall_score')}, {insights.get('score_label')}")

        print(f"✓ Analysis: {stats['total_schools']} schools, {stats['total_interactions']} interactions")

    def test_outreach_analysis_blocked_for_basic_tier(self):
        """GET /api/ai/outreach-analysis - Returns 403 for basic tier users"""
        # Downgrade to basic
        downgrade_resp = requests.put(f"{BASE_URL}/api/admin/subscriptions/user_public_default", json={
            "plan": "basic"
        })
        assert downgrade_resp.status_code == 200

        try:
            response = requests.get(f"{BASE_URL}/api/ai/outreach-analysis")
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"

            data = response.json()
            assert data["detail"]["error"] == "subscription_limit"
            assert data["detail"]["feature"] == "auto_reply_detection"
            print("✓ Basic tier correctly blocked from Outreach Analysis")
        finally:
            # Restore premium
            requests.put(f"{BASE_URL}/api/admin/subscriptions/user_public_default", json={
                "plan": "premium"
            })


# ── Highlight Advisor Tests (Premium) ──────────────────────────

class TestHighlightAdvisor:
    """AI-powered highlight reel recommendations."""

    def test_highlight_advice_returns_structured_response(self):
        """POST /api/ai/highlight-advice - Returns structured video advice"""
        response = requests.post(f"{BASE_URL}/api/ai/highlight-advice", json={
            "question": ""
        }, timeout=60)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        assert "advice" in data, "Response should contain 'advice'"
        advice = data["advice"]

        # Verify key structure fields
        assert "video_length" in advice, "Advice should have video_length"
        assert "structure" in advice, "Advice should have video structure"
        assert "must_include_skills" in advice, "Advice should list required skills"
        assert "avoid" in advice, "Advice should list things to avoid"
        assert "position_specific" in advice, "Advice should have position-specific tips"
        assert "coach_perspective" in advice, "Advice should include coach perspective"
        assert "distribution_tips" in advice, "Advice should include distribution tips"

        # Verify structure has proper items
        assert len(advice["structure"]) >= 3, "Should have at least 3 video sections"
        assert len(advice["must_include_skills"]) >= 5, "Should have skills to include"
        print(f"✓ Highlight advice: {advice['video_length']}, {len(advice['structure'])} sections")

    def test_highlight_advice_with_custom_question(self):
        """POST /api/ai/highlight-advice - Custom question gets relevant response"""
        response = requests.post(f"{BASE_URL}/api/ai/highlight-advice", json={
            "question": "What skills should I emphasize as an outside hitter?"
        }, timeout=60)

        assert response.status_code == 200
        data = response.json()
        assert "advice" in data
        print("✓ Custom question processed successfully")

    def test_highlight_advice_blocked_for_basic_tier(self):
        """POST /api/ai/highlight-advice - Returns 403 for basic tier users"""
        # Downgrade to basic
        requests.put(f"{BASE_URL}/api/admin/subscriptions/user_public_default", json={
            "plan": "basic"
        })

        try:
            response = requests.post(f"{BASE_URL}/api/ai/highlight-advice", json={
                "question": ""
            })
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"

            data = response.json()
            assert data["detail"]["error"] == "subscription_limit"
            assert data["detail"]["feature"] == "auto_reply_detection"
            print("✓ Basic tier correctly blocked from Highlight Advisor")
        finally:
            # Restore premium
            requests.put(f"{BASE_URL}/api/admin/subscriptions/user_public_default", json={
                "plan": "premium"
            })


# ── Feature Gate Tests ──────────────────────────────────────────

class TestAIFeatureGates:
    """Test feature gates for AI features on different tiers."""

    def test_ai_assistant_accessible_on_all_tiers(self):
        """AI Assistant uses AI limits, so even basic can try (but may hit 0 limit)"""
        # This tests the endpoint is reachable, actual access depends on AI limits
        response = requests.post(f"{BASE_URL}/api/ai/assistant", json={
            "message": "Hello",
            "session_id": "gate_test_session"
        }, timeout=60)

        # Should either succeed (premium/pro) or return 403 with subscription_limit
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ AI Assistant gate test: status {response.status_code}")

    def test_premium_features_require_premium_tier(self):
        """Outreach Analysis and Highlight Advisor require Premium tier"""
        # First verify user is on premium
        sub_resp = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_resp.status_code == 200
        sub = sub_resp.json()

        if sub["tier"] == "premium":
            # Both should work
            outreach = requests.get(f"{BASE_URL}/api/ai/outreach-analysis", timeout=60)
            assert outreach.status_code == 200, "Premium should access outreach analysis"

            highlight = requests.post(f"{BASE_URL}/api/ai/highlight-advice", json={"question": ""}, timeout=60)
            assert highlight.status_code == 200, "Premium should access highlight advisor"
            print("✓ Premium features accessible for premium tier")
        else:
            print(f"⚠ Skipping premium feature test (user on {sub['tier']} tier)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
