"""
Admin API Tests - Testing the admin panel backend endpoints
Endpoints covered:
- GET /api/admin/stats - Admin dashboard stats
- GET /api/admin/users - List all users with search/filter
- GET /api/admin/users/{user_id} - User detail
- PUT /api/admin/users/{user_id} - Update user (plan/status)
- POST /api/admin/users - Create new user
- GET /api/admin/subscription-tiers - Get subscription tier details
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAdminStats:
    """Test admin dashboard stats endpoint"""
    
    def test_get_admin_stats(self):
        """GET /api/admin/stats should return dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all required fields exist
        assert "total_users" in data, "Missing total_users"
        assert "plan_counts" in data, "Missing plan_counts"
        assert "total_schools_on_boards" in data, "Missing total_schools_on_boards"
        assert "total_interactions" in data, "Missing total_interactions"
        assert "total_events" in data, "Missing total_events"
        assert "active_users_this_week" in data, "Missing active_users_this_week"
        
        # Verify plan_counts structure
        plan_counts = data["plan_counts"]
        assert "basic" in plan_counts, "Missing basic in plan_counts"
        assert "pro" in plan_counts, "Missing pro in plan_counts"
        assert "premium" in plan_counts, "Missing premium in plan_counts"
        
        # Verify types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["active_users_this_week"], int)
        
        print(f"Admin stats: {data}")


class TestAdminUsersList:
    """Test admin users list endpoint with search/filter"""
    
    def test_list_users_basic(self):
        """GET /api/admin/users should return paginated user list"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data, "Missing users array"
        assert "total" in data, "Missing total count"
        assert "page" in data, "Missing page"
        assert "limit" in data, "Missing limit"
        
        # Verify user structure if users exist
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user, "Missing user_id"
            assert "tenant_id" in user, "Missing tenant_id"
            assert "email" in user, "Missing email"
            assert "plan" in user, "Missing plan"
            
        print(f"Found {data['total']} users, page {data['page']}")
    
    def test_list_users_with_search(self):
        """GET /api/admin/users?search=... should filter by name/email"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"search": "test"})
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        print(f"Search 'test' returned {len(data['users'])} users")
    
    def test_list_users_filter_by_plan(self):
        """GET /api/admin/users?plan=... should filter by subscription plan"""
        for plan in ["all", "basic", "pro", "premium"]:
            response = requests.get(f"{BASE_URL}/api/admin/users", params={"plan": plan})
            assert response.status_code == 200, f"Failed for plan={plan}"
            
            data = response.json()
            if plan != "all" and len(data["users"]) > 0:
                for user in data["users"]:
                    assert user["plan"] == plan, f"Expected plan {plan}, got {user['plan']}"
            
            print(f"Plan filter '{plan}' returned {len(data['users'])} users")
    
    def test_list_users_pagination(self):
        """GET /api/admin/users?page=...&limit=... should paginate"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"page": 1, "limit": 5})
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["users"]) <= 5
        print(f"Pagination: page {data['page']}, limit {data['limit']}, returned {len(data['users'])}")


class TestAdminUserDetail:
    """Test admin user detail endpoint"""
    
    @pytest.fixture
    def existing_user_id(self):
        """Get an existing user_id from the users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        if response.status_code == 200:
            data = response.json()
            if len(data["users"]) > 0:
                return data["users"][0]["user_id"]
        pytest.skip("No existing users found for detail test")
    
    def test_get_user_detail(self, existing_user_id):
        """GET /api/admin/users/{user_id} should return detailed user info"""
        response = requests.get(f"{BASE_URL}/api/admin/users/{existing_user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify structure
        assert "user" in data, "Missing user object"
        assert "tenant" in data, "Missing tenant object"
        assert "subscription" in data, "Missing subscription object"
        assert "stats" in data, "Missing stats object"
        
        # Verify user
        assert data["user"]["user_id"] == existing_user_id
        
        # Verify stats
        stats = data["stats"]
        assert "school_count" in stats
        assert "interaction_count" in stats
        assert "profile_views_week" in stats
        assert "gmail_connected" in stats
        
        # Verify subscription features
        sub = data["subscription"]
        assert "max_schools" in sub
        assert "gmail_integration" in sub
        
        print(f"User detail for {existing_user_id}: plan={data['tenant'].get('plan')}, schools={stats['school_count']}")
    
    def test_get_user_detail_not_found(self):
        """GET /api/admin/users/nonexistent should return 404"""
        response = requests.get(f"{BASE_URL}/api/admin/users/user_nonexistent_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAdminUserUpdate:
    """Test admin user update endpoint"""
    
    @pytest.fixture
    def existing_user_id(self):
        """Get an existing user_id from the users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        if response.status_code == 200:
            data = response.json()
            if len(data["users"]) > 0:
                return data["users"][0]["user_id"]
        pytest.skip("No existing users found for update test")
    
    def test_update_user_plan(self, existing_user_id):
        """PUT /api/admin/users/{user_id} should update subscription plan"""
        # First get current plan
        detail_resp = requests.get(f"{BASE_URL}/api/admin/users/{existing_user_id}")
        original_plan = detail_resp.json()["tenant"]["plan"]
        
        # Change to a different plan
        new_plan = "pro" if original_plan != "pro" else "basic"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{existing_user_id}",
            json={"plan": new_plan}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["ok"] == True
        assert "plan" in data["updated_fields"]
        
        # Verify the change persisted
        verify_resp = requests.get(f"{BASE_URL}/api/admin/users/{existing_user_id}")
        assert verify_resp.json()["tenant"]["plan"] == new_plan
        
        # Restore original plan
        requests.put(f"{BASE_URL}/api/admin/users/{existing_user_id}", json={"plan": original_plan})
        
        print(f"Updated user {existing_user_id} plan: {original_plan} -> {new_plan} -> restored")
    
    def test_update_user_status(self, existing_user_id):
        """PUT /api/admin/users/{user_id} should update account status"""
        # Get current status
        detail_resp = requests.get(f"{BASE_URL}/api/admin/users/{existing_user_id}")
        original_status = detail_resp.json()["tenant"].get("status", "active")
        
        # Change status
        new_status = "suspended" if original_status == "active" else "active"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{existing_user_id}",
            json={"status": new_status}
        )
        assert response.status_code == 200
        
        # Verify change
        verify_resp = requests.get(f"{BASE_URL}/api/admin/users/{existing_user_id}")
        assert verify_resp.json()["tenant"]["status"] == new_status
        
        # Restore
        requests.put(f"{BASE_URL}/api/admin/users/{existing_user_id}", json={"status": original_status})
        
        print(f"Updated user {existing_user_id} status: {original_status} -> {new_status} -> restored")


class TestAdminCreateUser:
    """Test admin create user endpoint"""
    
    def test_create_user_success(self):
        """POST /api/admin/users should create a new user"""
        unique_email = f"TEST_admin_create_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={
                "name": "TEST Admin Created User",
                "email": unique_email,
                "plan": "pro"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert "user" in data, "Missing user in response"
        assert "tenant" in data, "Missing tenant in response"
        
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "TEST Admin Created User"
        assert data["tenant"]["plan"] == "pro"
        assert data["tenant"]["status"] == "active"
        
        created_user_id = data["user"]["user_id"]
        print(f"Created user: {created_user_id}, email: {unique_email}")
        
        # Verify user appears in users list
        list_resp = requests.get(f"{BASE_URL}/api/admin/users", params={"search": unique_email})
        assert list_resp.status_code == 200
        assert len(list_resp.json()["users"]) >= 1
        
        return created_user_id
    
    def test_create_user_missing_fields(self):
        """POST /api/admin/users without required fields should return 400"""
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={"email": "test@test.com"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        # Missing email
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={"name": "Test User"}
        )
        assert response.status_code == 400
        
        print("Validation working correctly for missing fields")
    
    def test_create_user_duplicate_email(self):
        """POST /api/admin/users with duplicate email should return 400"""
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create first user
        response1 = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={"name": "First User", "email": unique_email, "plan": "basic"}
        )
        assert response1.status_code == 200
        
        # Try to create second user with same email
        response2 = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={"name": "Second User", "email": unique_email, "plan": "basic"}
        )
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        assert "exists" in response2.json().get("detail", "").lower()
        
        print("Duplicate email validation working correctly")


class TestSubscriptionTiers:
    """Test subscription tiers endpoint"""
    
    def test_get_subscription_tiers(self):
        """GET /api/admin/subscription-tiers should return tier details"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        
        tiers = data["tiers"]
        assert "basic" in tiers
        assert "pro" in tiers
        assert "premium" in tiers
        
        # Verify tier structure
        for tier_name, tier in tiers.items():
            assert "label" in tier
            assert "max_schools" in tier
            assert "ai_drafts_per_month" in tier
            assert "gmail_integration" in tier
            
        print(f"Subscription tiers: {list(tiers.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
