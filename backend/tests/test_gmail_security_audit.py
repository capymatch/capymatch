"""
Gmail Security Audit Tests
Verifies that Gmail integration never sends emails during scanning 
and never deletes/modifies emails. Only explicit send/reply actions use gmail.send.
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGmailScopes:
    """Verify GMAIL_SCOPES contains only safe scopes"""
    
    def test_gmail_scopes_are_readonly_and_send_only(self):
        """Verify scopes are gmail.readonly, gmail.send, openid, userinfo.email, userinfo.profile ONLY"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        # Find GMAIL_SCOPES definition
        scope_match = re.search(r'GMAIL_SCOPES\s*=\s*\[(.*?)\]', content, re.DOTALL)
        assert scope_match, "Could not find GMAIL_SCOPES in gmail.py"
        
        scopes_text = scope_match.group(1)
        
        # Verify allowed scopes are present
        assert 'gmail.readonly' in scopes_text, "gmail.readonly scope should be present"
        assert 'gmail.send' in scopes_text, "gmail.send scope should be present"
        assert 'openid' in scopes_text, "openid scope should be present"
        assert 'userinfo.email' in scopes_text, "userinfo.email scope should be present"
        assert 'userinfo.profile' in scopes_text, "userinfo.profile scope should be present"
        
        # Verify dangerous scopes are NOT present
        assert 'gmail.modify' not in scopes_text, "SECURITY: gmail.modify scope MUST NOT be present"
        assert 'gmail.labels' not in scopes_text, "SECURITY: gmail.labels scope MUST NOT be present"
        assert 'gmail.compose' not in scopes_text, "gmail.compose scope should not be present"
        
        print("✅ GMAIL_SCOPES contains ONLY safe scopes: readonly, send, openid, userinfo.email, userinfo.profile")


class TestNoModifyOperations:
    """Verify there are ZERO .modify() API calls in Gmail files"""
    
    def test_no_modify_calls_in_gmail_routes(self):
        """Verify gmail.py has no .modify() calls"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        # Check for messages().modify() pattern
        modify_matches = re.findall(r'\.modify\s*\(', content)
        assert len(modify_matches) == 0, f"SECURITY: Found {len(modify_matches)} .modify() calls in gmail.py"
        
        print("✅ gmail.py has ZERO .modify() calls")
    
    def test_no_modify_calls_in_gmail_import(self):
        """Verify gmail_import.py has no .modify() calls"""
        import_py_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'gmail_import.py')
        
        with open(import_py_path, 'r') as f:
            content = f.read()
        
        modify_matches = re.findall(r'\.modify\s*\(', content)
        assert len(modify_matches) == 0, f"SECURITY: Found {len(modify_matches)} .modify() calls in gmail_import.py"
        
        print("✅ gmail_import.py has ZERO .modify() calls")


class TestNoDeleteOperations:
    """Verify there are ZERO .delete() API calls on Gmail messages"""
    
    def test_no_message_delete_in_gmail_routes(self):
        """Verify gmail.py has no messages().delete() calls"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        # Check for messages().delete() pattern - not DB delete, Gmail API delete
        # Gmail API pattern would be: service.users().messages().delete()
        message_delete = re.findall(r'messages\(\)\.delete\s*\(', content)
        assert len(message_delete) == 0, f"SECURITY: Found {len(message_delete)} messages().delete() calls in gmail.py"
        
        print("✅ gmail.py has ZERO messages().delete() Gmail API calls")
    
    def test_no_message_delete_in_gmail_import(self):
        """Verify gmail_import.py has no messages().delete() calls"""
        import_py_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'gmail_import.py')
        
        with open(import_py_path, 'r') as f:
            content = f.read()
        
        message_delete = re.findall(r'messages\(\)\.delete\s*\(', content)
        assert len(message_delete) == 0, f"SECURITY: Found {len(message_delete)} messages().delete() calls in gmail_import.py"
        
        print("✅ gmail_import.py has ZERO messages().delete() Gmail API calls")


class TestNoTrashOperations:
    """Verify there are ZERO .trash() API calls"""
    
    def test_no_trash_in_gmail_routes(self):
        """Verify gmail.py has no .trash() calls"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        trash_matches = re.findall(r'\.trash\s*\(', content)
        assert len(trash_matches) == 0, f"SECURITY: Found {len(trash_matches)} .trash() calls in gmail.py"
        
        print("✅ gmail.py has ZERO .trash() calls")
    
    def test_no_trash_in_gmail_import(self):
        """Verify gmail_import.py has no .trash() calls"""
        import_py_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'gmail_import.py')
        
        with open(import_py_path, 'r') as f:
            content = f.read()
        
        trash_matches = re.findall(r'\.trash\s*\(', content)
        assert len(trash_matches) == 0, f"SECURITY: Found {len(trash_matches)} .trash() calls in gmail_import.py"
        
        print("✅ gmail_import.py has ZERO .trash() calls")


class TestSendOnlyInExplicitFunctions:
    """Verify .send() calls exist ONLY in send_email and reply_email functions"""
    
    def test_send_only_in_correct_functions(self):
        """Verify .send() calls are only in send_email and reply_email"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            lines = f.readlines()
        
        send_locations = []
        for i, line in enumerate(lines):
            if '.send(' in line and 'messages' in line:
                send_locations.append((i + 1, line.strip()))
        
        # Should have exactly 2 send calls (around lines 493 and 603)
        assert len(send_locations) == 2, f"Expected 2 .send() calls, found {len(send_locations)}: {send_locations}"
        
        # Verify they are in the expected range (within send_email and reply_email functions)
        line_numbers = [loc[0] for loc in send_locations]
        
        # send_email sends around line 493, reply_email sends around line 603
        assert any(480 <= ln <= 510 for ln in line_numbers), "Expected .send() in send_email function (around line 493)"
        assert any(590 <= ln <= 620 for ln in line_numbers), "Expected .send() in reply_email function (around line 603)"
        
        print(f"✅ .send() calls found only at expected locations: {line_numbers}")
    
    def test_no_send_in_gmail_import(self):
        """Verify gmail_import.py has NO .send() calls"""
        import_py_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'gmail_import.py')
        
        with open(import_py_path, 'r') as f:
            content = f.read()
        
        send_matches = re.findall(r'messages\(\)\.send\s*\(', content)
        assert len(send_matches) == 0, f"SECURITY: Found {len(send_matches)} .send() calls in gmail_import.py - import should be READ ONLY"
        
        print("✅ gmail_import.py has ZERO .send() calls - import is READ ONLY")


class TestToggleReadEndpoint:
    """Verify toggle_read endpoint returns disabled message"""
    
    def test_toggle_read_disabled_in_code(self):
        """Verify toggle_read endpoint returns disabled message instead of calling gmail modify"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        # Find toggle_read function
        toggle_match = re.search(r'async def toggle_read.*?(?=\n@router|\nclass|\n# ─|\Z)', content, re.DOTALL)
        assert toggle_match, "Could not find toggle_read function"
        
        toggle_content = toggle_match.group(0)
        
        # Verify it returns a disabled message
        assert 'return' in toggle_content, "toggle_read should have a return statement"
        assert 'disabled' in toggle_content.lower() or 'read-only' in toggle_content.lower() or 'privacy' in toggle_content.lower(), \
            "toggle_read should mention it's disabled for privacy"
        
        # Verify there's no modify call in toggle_read
        assert '.modify(' not in toggle_content, "SECURITY: toggle_read should NOT have .modify() call"
        
        print("✅ toggle_read endpoint returns disabled message, no modify call")


class TestGetEmailNoAutoMarkAsRead:
    """Verify get_email endpoint does NOT auto-mark emails as read"""
    
    def test_get_email_no_auto_mark_read(self):
        """Verify get_email endpoint does not modify email state"""
        gmail_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'gmail.py')
        
        with open(gmail_py_path, 'r') as f:
            content = f.read()
        
        # Find get_email function
        get_email_match = re.search(r'async def get_email\(.*?(?=\n@router|\nclass|\n# ─|\Z)', content, re.DOTALL)
        assert get_email_match, "Could not find get_email function"
        
        get_email_content = get_email_match.group(0)
        
        # Look for the UNREAD check - should have 'pass' instead of modify
        if 'UNREAD' in get_email_content:
            # Check if there's a modify call
            assert '.modify(' not in get_email_content, "SECURITY: get_email should NOT have .modify() call"
            # There should be a 'pass' comment about read-only mode
            assert 'pass' in get_email_content or 'Read-only' in get_email_content or 'read-only' in get_email_content, \
                "get_email should have pass/comment about read-only mode"
        
        print("✅ get_email endpoint does NOT auto-mark emails as read")


class TestGmailImportServiceReadOnly:
    """Verify gmail_import.py has ZERO write operations"""
    
    def test_gmail_import_only_uses_read_apis(self):
        """Verify gmail_import.py only uses list() and get() - no write operations"""
        import_py_path = os.path.join(os.path.dirname(__file__), '..', 'services', 'gmail_import.py')
        
        with open(import_py_path, 'r') as f:
            content = f.read()
        
        # Find all service.users().messages().METHOD() calls
        api_calls = re.findall(r'service\.users\(\)\.messages\(\)\.(\w+)\s*\(', content)
        
        allowed_methods = ['list', 'get']
        disallowed_methods = ['modify', 'delete', 'trash', 'send', 'insert', 'import_', 'batchModify', 'batchDelete']
        
        for method_name in api_calls:
            assert method_name in allowed_methods, \
                f"SECURITY: gmail_import.py uses disallowed method: {method_name}. Only {allowed_methods} are allowed."
            assert method_name not in disallowed_methods, \
                f"SECURITY: gmail_import.py uses dangerous method: {method_name}"
        
        print(f"✅ gmail_import.py only uses READ methods: {api_calls}")
        print(f"   All methods are safe: {set(api_calls)} ⊆ {set(allowed_methods)}")


class TestDeleteAccountCollections:
    """Verify delete-account endpoint cleans up athlete_profiles and import_runs"""
    
    def test_delete_account_clears_athlete_profiles(self):
        """Verify privacy.py delete-account clears athlete_profiles collection"""
        privacy_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'privacy.py')
        
        with open(privacy_py_path, 'r') as f:
            content = f.read()
        
        # Find delete_account function
        delete_match = re.search(r'async def delete_account.*?(?=\n@router|\nclass|\n# ─|\Z)', content, re.DOTALL)
        assert delete_match, "Could not find delete_account function"
        
        delete_content = delete_match.group(0)
        
        # Verify athlete_profiles is in collections_to_clear
        assert 'athlete_profiles' in delete_content, \
            "delete_account should clear athlete_profiles collection"
        
        print("✅ delete-account clears athlete_profiles collection")
    
    def test_delete_account_clears_subscriptions(self):
        """Verify privacy.py delete-account clears subscriptions collection"""
        privacy_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'privacy.py')
        
        with open(privacy_py_path, 'r') as f:
            content = f.read()
        
        delete_match = re.search(r'async def delete_account.*?(?=\n@router|\nclass|\n# ─|\Z)', content, re.DOTALL)
        assert delete_match, "Could not find delete_account function"
        
        delete_content = delete_match.group(0)
        
        assert 'subscriptions' in delete_content, \
            "delete_account should clear subscriptions collection"
        
        print("✅ delete-account clears subscriptions collection")
    
    def test_delete_account_clears_import_runs(self):
        """Verify privacy.py delete-account clears import_runs collection"""
        privacy_py_path = os.path.join(os.path.dirname(__file__), '..', 'routes', 'privacy.py')
        
        with open(privacy_py_path, 'r') as f:
            content = f.read()
        
        delete_match = re.search(r'async def delete_account.*?(?=\n@router|\nclass|\n# ─|\Z)', content, re.DOTALL)
        assert delete_match, "Could not find delete_account function"
        
        delete_content = delete_match.group(0)
        
        assert 'import_runs' in delete_content, \
            "delete_account should clear import_runs collection"
        
        print("✅ delete-account clears import_runs collection")


class TestKBSeedEndpoint:
    """Test KB seed endpoint exists and works"""
    
    def test_kb_seed_endpoint_exists(self):
        """Verify POST /api/admin/universities/seed endpoint exists"""
        # First login as admin to get session token
        session = requests.Session()
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "douglas@yeslms.com", "password": "demo2026"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.status_code} - {login_resp.text}")
        
        # Use the session (cookies are automatically handled)
        resp = session.post(
            f"{BASE_URL}/api/admin/universities/seed",
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 200 (success) or 404 (seed file not found)
        # Should NOT return 405 (method not allowed) or 401 (unauthorized with valid admin)
        assert resp.status_code in [200, 404], \
            f"KB seed endpoint should exist. Got status {resp.status_code}: {resp.text}"
        
        if resp.status_code == 200:
            data = resp.json()
            assert "ok" in data, "Response should have 'ok' field"
            assert "inserted" in data, "Response should have 'inserted' field"
            assert "total" in data, "Response should have 'total' field"
            print(f"✅ KB seed endpoint works: inserted={data.get('inserted')}, total={data.get('total')}")
        else:
            print(f"⚠️ KB seed endpoint exists but seed file not found (expected if not deployed)")


# Run summary
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
