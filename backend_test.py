import requests
import sys
from datetime import datetime

class VolleyballCRMTester:
    def __init__(self, base_url="https://volley-crm-fam.preview.emergentagent.com", session_token="test_session_1770863154873"):
        self.base_url = base_url
        self.session_token = session_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.program_id = None
        self.coach_id = None
        self.interaction_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=self.headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=self.headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Exception: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*60)
        print("TESTING AUTH ENDPOINTS")
        print("="*60)
        
        # Test GET /api/auth/me
        success, user_data = self.run_test(
            "GET /api/auth/me",
            "GET", 
            "api/auth/me",
            200
        )
        
        if success and user_data:
            print(f"   User ID: {user_data.get('user_id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Name: {user_data.get('name')}")
            
        return success

    def test_programs_endpoints(self):
        """Test programs CRUD endpoints"""
        print("\n" + "="*60)
        print("TESTING PROGRAMS ENDPOINTS")
        print("="*60)
        
        # Test GET /api/programs (empty list initially)
        success1, programs_data = self.run_test(
            "GET /api/programs",
            "GET",
            "api/programs", 
            200
        )
        
        # Test POST /api/programs (create new program)
        test_program = {
            "university_name": "Test University",
            "division": "D1",
            "conference": "Big Ten",
            "region": "Midwest",
            "website": "https://test.edu",
            "mascot": "Test Tigers",
            "recruiting_status": "Not Contacted",
            "reply_status": "No Reply",
            "priority": "Medium"
        }
        
        success2, program_data = self.run_test(
            "POST /api/programs", 
            "POST",
            "api/programs",
            200,
            test_program
        )
        
        if success2 and program_data:
            self.program_id = program_data.get('program_id')
            print(f"   Created program ID: {self.program_id}")
        
        # Test GET /api/programs/{program_id}
        success3 = False
        if self.program_id:
            success3, program_detail = self.run_test(
                f"GET /api/programs/{self.program_id}",
                "GET",
                f"api/programs/{self.program_id}",
                200
            )
        
        # Test PUT /api/programs/{program_id} (update program with automation rules)
        success4 = False
        if self.program_id:
            update_data = {
                "recruiting_status": "Contacted",  # Should trigger automation rule
                "reply_status": "Reply Received"   # Should set priority to Very High
            }
            success4, updated_program = self.run_test(
                f"PUT /api/programs/{self.program_id}",
                "PUT", 
                f"api/programs/{self.program_id}",
                200,
                update_data
            )
            
            if success4 and updated_program:
                # Check automation rules applied
                initial_contact = updated_program.get('initial_contact_sent')
                priority = updated_program.get('priority')
                print(f"   Automation check - Initial contact sent: {initial_contact}")
                print(f"   Automation check - Priority: {priority}")
        
        return success1 and success2 and success3 and success4

    def test_coaches_endpoints(self):
        """Test coaches CRUD endpoints"""
        print("\n" + "="*60) 
        print("TESTING COACHES ENDPOINTS")
        print("="*60)
        
        if not self.program_id:
            print("❌ Skipping coaches tests - no program_id available")
            return False
        
        # Test GET /api/coaches
        success1, coaches_data = self.run_test(
            "GET /api/coaches",
            "GET",
            "api/coaches",
            200
        )
        
        # Test POST /api/coaches (create new coach)
        test_coach = {
            "program_id": self.program_id,
            "coach_name": "Test Coach",
            "role": "Head Coach", 
            "email": "coach@test.edu",
            "phone": "555-1234",
            "notes": "Test notes"
        }
        
        success2, coach_data = self.run_test(
            "POST /api/coaches",
            "POST",
            "api/coaches", 
            200,
            test_coach
        )
        
        if success2 and coach_data:
            self.coach_id = coach_data.get('coach_id')
            print(f"   Created coach ID: {self.coach_id}")
        
        # Test PUT /api/coaches/{coach_id}
        success3 = False
        if self.coach_id:
            update_data = {"email": "updated@test.edu", "phone": "555-9999"}
            success3, updated_coach = self.run_test(
                f"PUT /api/coaches/{self.coach_id}",
                "PUT",
                f"api/coaches/{self.coach_id}",
                200,
                update_data
            )
        
        return success1 and success2 and success3

    def test_interactions_endpoints(self):
        """Test interactions endpoints"""
        print("\n" + "="*60)
        print("TESTING INTERACTIONS ENDPOINTS") 
        print("="*60)
        
        if not self.program_id:
            print("❌ Skipping interactions tests - no program_id available")
            return False
        
        # Test GET /api/interactions
        success1, interactions_data = self.run_test(
            "GET /api/interactions",
            "GET", 
            "api/interactions",
            200
        )
        
        # Test POST /api/interactions 
        test_interaction = {
            "program_id": self.program_id,
            "coach_email": "coach@test.edu",
            "type": "Email",
            "outcome": "No Response",
            "notes": "Test interaction notes"
        }
        
        success2, interaction_data = self.run_test(
            "POST /api/interactions",
            "POST",
            "api/interactions",
            200,
            test_interaction
        )
        
        if success2 and interaction_data:
            self.interaction_id = interaction_data.get('interaction_id')
        
        return success1 and success2

    def test_knowledge_base_endpoints(self):
        """Test knowledge base endpoints"""
        print("\n" + "="*60)
        print("TESTING KNOWLEDGE BASE ENDPOINTS")
        print("="*60)
        
        # Test GET /api/knowledge-base (should return seeded universities)
        success1, kb_data = self.run_test(
            "GET /api/knowledge-base",
            "GET",
            "api/knowledge-base",
            200
        )
        
        if success1 and kb_data:
            print(f"   Found {len(kb_data)} universities in knowledge base")
            
            # Check for different divisions
            d1_count = len([u for u in kb_data if u.get('division') == 'D1'])
            d2_count = len([u for u in kb_data if u.get('division') == 'D2']) 
            d3_count = len([u for u in kb_data if u.get('division') == 'D3'])
            print(f"   D1: {d1_count}, D2: {d2_count}, D3: {d3_count}")
        
        # Test filtered query by division
        success2, d1_data = self.run_test(
            "GET /api/knowledge-base?division=D1", 
            "GET",
            "api/knowledge-base?division=D1",
            200
        )
        
        # Test POST /api/knowledge-base/add-to-board
        success3 = False
        if success1 and kb_data and len(kb_data) > 0:
            test_university = kb_data[0].get('university_name')
            if test_university and test_university != "Test University":  # Avoid conflict with our test program
                success3, added_program = self.run_test(
                    "POST /api/knowledge-base/add-to-board",
                    "POST",
                    "api/knowledge-base/add-to-board",
                    200,
                    {"university_name": test_university}
                )
        
        return success1 and success2 and success3

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n" + "="*60)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*60)
        
        # Test GET /api/dashboard
        success, dashboard_data = self.run_test(
            "GET /api/dashboard",
            "GET",
            "api/dashboard", 
            200
        )
        
        if success and dashboard_data:
            print(f"   Total schools: {dashboard_data.get('total_schools')}")
            print(f"   Follow-ups due: {dashboard_data.get('follow_ups_due')}")
            print(f"   Status counts: {dashboard_data.get('status_counts')}")
            print(f"   Athlete name: {dashboard_data.get('athlete_name')}")
            
        return success

    def test_follow_ups_endpoints(self):
        """Test follow-ups endpoints"""
        print("\n" + "="*60)
        print("TESTING FOLLOW-UPS ENDPOINTS")
        print("="*60)
        
        # Test GET /api/follow-ups
        success1, followups_data = self.run_test(
            "GET /api/follow-ups",
            "GET",
            "api/follow-ups",
            200
        )
        
        # Test POST /api/follow-ups/{program_id}/mark-sent
        success2 = False
        if self.program_id:
            mark_data = {
                "outcome": "Sent Follow-up",
                "reply_status": "No Reply"
            }
            success2, marked_data = self.run_test(
                f"POST /api/follow-ups/{self.program_id}/mark-sent",
                "POST",
                f"api/follow-ups/{self.program_id}/mark-sent",
                200,
                mark_data
            )
        
        return success1 and success2

    def test_tenant_endpoints(self):
        """Test tenant endpoints"""
        print("\n" + "="*60)
        print("TESTING TENANT ENDPOINTS")
        print("="*60)
        
        # Test GET /api/tenant
        success1, tenant_data = self.run_test(
            "GET /api/tenant",
            "GET", 
            "api/tenant",
            200
        )
        
        # Test PUT /api/tenant
        success2, updated_tenant = self.run_test(
            "PUT /api/tenant",
            "PUT",
            "api/tenant",
            200,
            {"athlete_name": "Test Athlete Updated"}
        )
        
        return success1 and success2

    def cleanup(self):
        """Clean up test data"""
        print("\n" + "="*60)
        print("CLEANING UP TEST DATA")
        print("="*60)
        
        # Delete coach if created
        if self.coach_id:
            self.run_test(
                f"DELETE /api/coaches/{self.coach_id}",
                "DELETE",
                f"api/coaches/{self.coach_id}",
                200
            )
        
        # Delete program if created (this will also delete associated data)
        if self.program_id:
            self.run_test(
                f"DELETE /api/programs/{self.program_id}",
                "DELETE", 
                f"api/programs/{self.program_id}",
                200
            )

def main():
    print("🏐 Volleyball Recruiting CRM Backend API Tests")
    print("="*60)
    
    # Initialize tester
    tester = VolleyballCRMTester()
    
    # Run all test suites
    auth_success = tester.test_auth_endpoints()
    programs_success = tester.test_programs_endpoints()
    coaches_success = tester.test_coaches_endpoints()
    interactions_success = tester.test_interactions_endpoints()
    kb_success = tester.test_knowledge_base_endpoints()
    dashboard_success = tester.test_dashboard_endpoints()
    followups_success = tester.test_follow_ups_endpoints()
    tenant_success = tester.test_tenant_endpoints()
    
    # Clean up
    tester.cleanup()
    
    # Final results
    print(f"\n📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {round((tester.tests_passed / tester.tests_run) * 100, 1)}%")
    
    print(f"\n🔍 TEST SUITE RESULTS:")
    print(f"Auth: {'✅ PASS' if auth_success else '❌ FAIL'}")
    print(f"Programs: {'✅ PASS' if programs_success else '❌ FAIL'}")
    print(f"Coaches: {'✅ PASS' if coaches_success else '❌ FAIL'}")
    print(f"Interactions: {'✅ PASS' if interactions_success else '❌ FAIL'}")
    print(f"Knowledge Base: {'✅ PASS' if kb_success else '❌ FAIL'}")
    print(f"Dashboard: {'✅ PASS' if dashboard_success else '❌ FAIL'}")
    print(f"Follow-ups: {'✅ PASS' if followups_success else '❌ FAIL'}")
    print(f"Tenant: {'✅ PASS' if tenant_success else '❌ FAIL'}")
    
    all_passed = all([auth_success, programs_success, coaches_success, interactions_success, 
                     kb_success, dashboard_success, followups_success, tenant_success])
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())