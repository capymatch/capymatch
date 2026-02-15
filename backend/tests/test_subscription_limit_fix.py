"""
Test P0 Bug Fix: Subscription limit enforcement on /api/knowledge-base/add-to-board endpoint.

Bug: After admin downgrades user from Premium to Basic, user could still add schools 
beyond the Basic tier's limit via /api/knowledge-base/add-to-board.

Fix: Added enforce_school_limit() check to add_to_board endpoint in knowledge.py
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKnowledgeBaseAddToBoardLimits:
    """Test that /api/knowledge-base/add-to-board enforces subscription school limits"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Store initial state for cleanup"""
        self.added_schools = []
        yield
        # Cleanup: Remove any test-added schools
        for school_name in self.added_schools:
            try:
                # Get programs list to find and delete
                res = requests.get(f"{BASE_URL}/api/programs")
                if res.status_code == 200:
                    for prog in res.json():
                        if prog.get('university_name') == school_name:
                            requests.delete(f"{BASE_URL}/api/programs/{prog['program_id']}")
            except:
                pass
    
    def get_subscription(self):
        """Get current subscription info"""
        res = requests.get(f"{BASE_URL}/api/subscription")
        assert res.status_code == 200, f"Failed to get subscription: {res.status_code}"
        return res.json()
    
    def set_subscription(self, plan: str, reason: str = "Test"):
        """Change user subscription via admin endpoint"""
        res = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": plan, "reason": reason}
        )
        assert res.status_code == 200, f"Failed to set subscription to {plan}: {res.status_code} - {res.text}"
        return res.json()
    
    def get_school_count(self):
        """Get current number of schools on board"""
        res = requests.get(f"{BASE_URL}/api/programs")
        assert res.status_code == 200, f"Failed to get programs: {res.status_code}"
        return len(res.json())
    
    def get_knowledge_base_school(self, exclude_names: list = None):
        """Get a school from knowledge base that's not already on board"""
        # Get schools on board
        programs_res = requests.get(f"{BASE_URL}/api/programs")
        assert programs_res.status_code == 200
        on_board = {p.get('university_name') for p in programs_res.json()}
        
        # Get knowledge base schools
        kb_res = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert kb_res.status_code == 200
        
        exclude = set(exclude_names or [])
        for school in kb_res.json():
            name = school.get('university_name')
            if name and name not in on_board and name not in exclude:
                return school
        
        return None
    
    def test_add_to_board_returns_403_when_at_basic_limit(self):
        """
        Test that add-to-board returns 403 with subscription_limit error
        when user is on Basic plan and already at/over school limit.
        """
        # Step 1: Ensure user is on Basic plan
        self.set_subscription("basic", "Test: Ensure basic plan")
        
        # Step 2: Verify subscription is basic
        sub = self.get_subscription()
        assert sub['tier'] == 'basic', f"Expected basic tier, got {sub['tier']}"
        
        # Step 3: Get current school count
        school_count = self.get_school_count()
        max_schools = sub['limits']['max_schools']
        print(f"Current schools: {school_count}, Basic limit: {max_schools}")
        
        # Step 4: If already at/over limit, try to add a school and expect 403
        if school_count >= max_schools:
            school = self.get_knowledge_base_school()
            if school:
                res = requests.post(
                    f"{BASE_URL}/api/knowledge-base/add-to-board",
                    json={"university_name": school['university_name']}
                )
                assert res.status_code == 403, f"Expected 403, got {res.status_code}"
                detail = res.json().get('detail', {})
                assert detail.get('error') == 'subscription_limit', f"Expected subscription_limit error, got {detail}"
                assert detail.get('feature') == 'max_schools', f"Expected max_schools feature, got {detail.get('feature')}"
                print(f"PASS: Got 403 subscription_limit when at Basic limit ({school_count}/{max_schools})")
            else:
                pytest.skip("No available schools in knowledge base to add")
        else:
            pytest.skip(f"User has {school_count} schools, below basic limit of {max_schools}")
    
    def test_add_to_board_succeeds_on_premium(self):
        """
        Test that add-to-board succeeds when user is on Premium plan (unlimited schools).
        """
        # Step 1: Set user to Premium
        self.set_subscription("premium", "Test: Set to premium")
        time.sleep(0.5)  # Allow time for update
        
        # Step 2: Verify subscription is premium
        sub = self.get_subscription()
        assert sub['tier'] == 'premium', f"Expected premium tier, got {sub['tier']}"
        
        # Step 3: Get a school not on board
        school = self.get_knowledge_base_school()
        if not school:
            pytest.skip("No available schools in knowledge base to add")
        
        # Step 4: Add school - should succeed
        res = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={"university_name": school['university_name']}
        )
        
        if res.status_code == 200:
            self.added_schools.append(school['university_name'])
            print(f"PASS: Successfully added {school['university_name']} on Premium plan")
        elif res.status_code == 400 and "already on your board" in res.text:
            print(f"SKIP: School already on board")
        else:
            assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    def test_downgrade_blocks_add_to_board(self):
        """
        THE P0 BUG TEST: After admin downgrades user from Premium to Basic,
        adding schools via add-to-board should be blocked with 403.
        """
        # Step 1: Start with Premium
        self.set_subscription("premium", "Test: Start with premium")
        time.sleep(0.3)
        
        sub = self.get_subscription()
        assert sub['tier'] == 'premium', f"Expected premium, got {sub['tier']}"
        print(f"Step 1: User on Premium plan")
        
        # Step 2: Verify current school count
        school_count_before = self.get_school_count()
        print(f"Step 2: Current school count: {school_count_before}")
        
        # Step 3: Downgrade to Basic
        self.set_subscription("basic", "Test: Downgrade to basic")
        time.sleep(0.3)
        
        sub = self.get_subscription()
        assert sub['tier'] == 'basic', f"Expected basic after downgrade, got {sub['tier']}"
        basic_limit = sub['limits']['max_schools']
        print(f"Step 3: User downgraded to Basic (limit: {basic_limit} schools)")
        
        # Step 4: If at/over limit, try to add another school
        school_count_after = self.get_school_count()
        print(f"Step 4: Schools after downgrade: {school_count_after}, limit: {basic_limit}")
        
        if school_count_after >= basic_limit:
            # Find a school to add
            school = self.get_knowledge_base_school()
            if not school:
                pytest.skip("No available schools in knowledge base")
            
            # Try to add - should be blocked
            res = requests.post(
                f"{BASE_URL}/api/knowledge-base/add-to-board",
                json={"university_name": school['university_name']}
            )
            
            assert res.status_code == 403, f"BUG! Expected 403 after downgrade, got {res.status_code}: {res.text}"
            detail = res.json().get('detail', {})
            assert detail.get('error') == 'subscription_limit', f"Expected subscription_limit error, got {detail}"
            print(f"PASS: P0 Bug Fixed - Add to board correctly blocked after downgrade ({school_count_after}/{basic_limit})")
        else:
            print(f"INFO: User has {school_count_after} schools, below basic limit {basic_limit}")
            pytest.skip("Need more schools on board to test limit enforcement")
    
    def test_programs_endpoint_also_enforces_limit(self):
        """
        Verify POST /api/programs also enforces school limits (existing check).
        """
        # Ensure user is on Basic
        self.set_subscription("basic", "Test: Ensure basic")
        time.sleep(0.3)
        
        sub = self.get_subscription()
        school_count = self.get_school_count()
        basic_limit = sub['limits']['max_schools']
        
        if school_count >= basic_limit:
            # Try to create a program directly
            res = requests.post(
                f"{BASE_URL}/api/programs",
                json={
                    "university_name": "TEST_University_For_Limit_Test",
                    "division": "D1",
                    "region": "Northeast"
                }
            )
            
            assert res.status_code == 403, f"Expected 403 on /programs, got {res.status_code}"
            detail = res.json().get('detail', {})
            assert detail.get('error') == 'subscription_limit', f"Expected subscription_limit, got {detail}"
            print(f"PASS: POST /api/programs also enforces school limit")
        else:
            pytest.skip(f"Below limit ({school_count}/{basic_limit}), cannot test enforcement")
    
    def test_subscription_returns_correct_tier_after_admin_change(self):
        """
        Verify GET /api/subscription returns correct tier after admin change.
        """
        # Change to pro
        self.set_subscription("pro", "Test: Set to pro")
        time.sleep(0.3)
        
        sub = self.get_subscription()
        assert sub['tier'] == 'pro', f"Expected pro, got {sub['tier']}"
        assert sub['limits']['max_schools'] == 25, f"Expected pro limit 25, got {sub['limits']['max_schools']}"
        print(f"PASS: GET /api/subscription returns pro tier with correct limits")
        
        # Change to basic
        self.set_subscription("basic", "Test: Set to basic")
        time.sleep(0.3)
        
        sub = self.get_subscription()
        assert sub['tier'] == 'basic', f"Expected basic, got {sub['tier']}"
        assert sub['limits']['max_schools'] == 5, f"Expected basic limit 5, got {sub['limits']['max_schools']}"
        print(f"PASS: GET /api/subscription returns basic tier with correct limits")


class TestSubscriptionErrorFormat:
    """Test that subscription limit errors return proper format for frontend"""
    
    def test_error_contains_required_fields(self):
        """
        Verify 403 subscription_limit error contains all fields needed by frontend:
        - error: "subscription_limit"
        - feature: "max_schools" 
        - message: Human-readable message
        - current: Current count
        - limit: Plan limit
        - upgrade_to: Suggested tier
        """
        # Ensure Basic with schools at limit
        res = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "basic", "reason": "Test error format"}
        )
        assert res.status_code == 200
        time.sleep(0.3)
        
        # Get current counts
        sub_res = requests.get(f"{BASE_URL}/api/subscription")
        sub = sub_res.json()
        
        programs_res = requests.get(f"{BASE_URL}/api/programs")
        school_count = len(programs_res.json())
        basic_limit = sub['limits']['max_schools']
        
        if school_count >= basic_limit:
            # Get a school from knowledge base
            kb_res = requests.get(f"{BASE_URL}/api/knowledge-base")
            on_board = {p.get('university_name') for p in programs_res.json()}
            school = None
            for s in kb_res.json():
                if s.get('university_name') not in on_board:
                    school = s
                    break
            
            if school:
                res = requests.post(
                    f"{BASE_URL}/api/knowledge-base/add-to-board",
                    json={"university_name": school['university_name']}
                )
                
                assert res.status_code == 403
                detail = res.json().get('detail', {})
                
                # Verify all required fields
                assert 'error' in detail, "Missing 'error' field"
                assert 'feature' in detail, "Missing 'feature' field"
                assert 'message' in detail, "Missing 'message' field"
                assert 'current' in detail, "Missing 'current' field"
                assert 'limit' in detail, "Missing 'limit' field"
                assert 'upgrade_to' in detail, "Missing 'upgrade_to' field"
                
                # Verify values
                assert detail['error'] == 'subscription_limit'
                assert detail['feature'] == 'max_schools'
                assert isinstance(detail['message'], str) and len(detail['message']) > 0
                assert detail['current'] == school_count
                assert detail['limit'] == basic_limit
                assert detail['upgrade_to'] in ['pro', 'premium']
                
                print(f"PASS: Error format correct with all required fields")
                print(f"  - error: {detail['error']}")
                print(f"  - feature: {detail['feature']}")
                print(f"  - message: {detail['message']}")
                print(f"  - current: {detail['current']}")
                print(f"  - limit: {detail['limit']}")
                print(f"  - upgrade_to: {detail['upgrade_to']}")
            else:
                pytest.skip("No schools available")
        else:
            pytest.skip(f"Below limit ({school_count}/{basic_limit})")


class TestAdminSubscriptionChange:
    """Test admin subscription change endpoint"""
    
    def test_admin_can_change_subscription(self):
        """PUT /api/admin/subscriptions/user_public_default changes plan"""
        # Change to premium
        res = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "premium", "reason": "Test admin change"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get('ok') == True
        assert 'log' in data
        print(f"PASS: Admin can change subscription to premium")
        
        # Verify change
        sub_res = requests.get(f"{BASE_URL}/api/subscription")
        assert sub_res.json()['tier'] == 'premium'
        print(f"PASS: Subscription verified as premium")
    
    def test_admin_change_creates_audit_log(self):
        """Subscription change creates audit log entry"""
        # Make a change
        res = requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "pro", "reason": "Test audit log"}
        )
        assert res.status_code == 200
        
        # Check audit logs
        logs_res = requests.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert logs_res.status_code == 200
        logs = logs_res.json().get('logs', [])
        
        # Find our log entry
        found = False
        for log in logs:
            if log.get('reason') == "Test audit log" and log.get('new_plan') == 'pro':
                found = True
                assert 'old_plan' in log
                assert 'created_at' in log
                print(f"PASS: Audit log created: {log.get('old_plan')} -> {log.get('new_plan')}")
                break
        
        assert found, "Audit log entry not found"


@pytest.fixture(scope="session", autouse=True)
def restore_user_subscription():
    """Restore user to premium after all tests complete"""
    yield
    try:
        requests.put(
            f"{BASE_URL}/api/admin/subscriptions/user_public_default",
            json={"plan": "premium", "reason": "Test cleanup: restore premium"}
        )
        print("\nCleanup: Restored user to premium plan")
    except:
        pass
