"""
Notes Feature Backend Tests
- CRUD operations for personal notes per-program
- Tests: create, list, pin/unpin, edit content, delete
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "pro@test.com"
TEST_PASSWORD = "password"
TEST_PROGRAM_ID = "prog_pro_test1"  # UCLA


class TestNotesAPI:
    """Notes CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        # Store cookies for auth
        self.created_note_ids = []
        yield
        
        # Cleanup: delete test notes created during tests
        for note_id in self.created_note_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/notes/{note_id}")
            except:
                pass
    
    # ===================== LIST NOTES =====================
    def test_list_notes_returns_correct_structure(self):
        """GET /api/programs/{program_id}/notes returns {pinned: [], recent: []} structure"""
        response = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pinned" in data, "Response should have 'pinned' key"
        assert "recent" in data, "Response should have 'recent' key"
        assert isinstance(data["pinned"], list), "'pinned' should be a list"
        assert isinstance(data["recent"], list), "'recent' should be a list"
        print(f"✓ List notes returns correct structure: pinned={len(data['pinned'])}, recent={len(data['recent'])}")
    
    # ===================== CREATE NOTE =====================
    def test_create_note_success(self):
        """POST /api/programs/{program_id}/notes creates a note and returns it"""
        content = f"TEST_note_created_at_{int(time.time())}"
        
        response = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": content}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "note_id" in data, "Response should have 'note_id'"
        assert data["content"] == content, f"Content mismatch: {data['content']}"
        assert data["program_id"] == TEST_PROGRAM_ID, "Program ID mismatch"
        assert data["is_pinned"] == False, "New note should not be pinned"
        assert "created_at" in data, "Should have created_at timestamp"
        
        self.created_note_ids.append(data["note_id"])
        print(f"✓ Created note: {data['note_id']}")
        
        return data["note_id"]
    
    def test_create_note_empty_content_fails(self):
        """POST with empty content should return 400"""
        response = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": "   "}  # whitespace only
        )
        
        assert response.status_code == 400, f"Expected 400 for empty content, got {response.status_code}"
        print("✓ Empty content correctly rejected with 400")
    
    def test_create_note_invalid_program_fails(self):
        """POST to non-existent program should return 404"""
        response = self.session.post(
            f"{BASE_URL}/api/programs/nonexistent_program_xyz/notes",
            json={"content": "Test note"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid program, got {response.status_code}"
        print("✓ Invalid program correctly returns 404")
    
    # ===================== PIN/UNPIN NOTE =====================
    def test_pin_note(self):
        """PUT /api/notes/{note_id} with {is_pinned: true} pins the note"""
        # First create a note
        content = f"TEST_pin_note_{int(time.time())}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": content}
        )
        assert create_resp.status_code == 200
        note_id = create_resp.json()["note_id"]
        self.created_note_ids.append(note_id)
        
        # Pin the note
        pin_resp = self.session.put(
            f"{BASE_URL}/api/notes/{note_id}",
            json={"is_pinned": True}
        )
        
        assert pin_resp.status_code == 200, f"Expected 200, got {pin_resp.status_code}: {pin_resp.text}"
        
        data = pin_resp.json()
        assert data["is_pinned"] == True, "Note should be pinned after update"
        print(f"✓ Note {note_id} pinned successfully")
        
        # Verify it appears in pinned list
        list_resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        list_data = list_resp.json()
        pinned_ids = [n["note_id"] for n in list_data["pinned"]]
        assert note_id in pinned_ids, "Pinned note should appear in pinned section"
        print("✓ Pinned note appears in pinned section of list")
    
    def test_unpin_note(self):
        """PUT /api/notes/{note_id} with {is_pinned: false} unpins the note"""
        # Create and pin a note
        content = f"TEST_unpin_note_{int(time.time())}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": content}
        )
        note_id = create_resp.json()["note_id"]
        self.created_note_ids.append(note_id)
        
        # Pin it first
        self.session.put(f"{BASE_URL}/api/notes/{note_id}", json={"is_pinned": True})
        
        # Unpin it
        unpin_resp = self.session.put(
            f"{BASE_URL}/api/notes/{note_id}",
            json={"is_pinned": False}
        )
        
        assert unpin_resp.status_code == 200
        assert unpin_resp.json()["is_pinned"] == False, "Note should be unpinned"
        print(f"✓ Note {note_id} unpinned successfully")
        
        # Verify it appears in recent list
        list_resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        list_data = list_resp.json()
        recent_ids = [n["note_id"] for n in list_data["recent"]]
        assert note_id in recent_ids, "Unpinned note should appear in recent section"
        print("✓ Unpinned note appears in recent section of list")
    
    # ===================== EDIT NOTE =====================
    def test_edit_note_content(self):
        """PUT /api/notes/{note_id} with {content: 'updated'} edits the note"""
        # Create a note
        original_content = f"TEST_original_{int(time.time())}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": original_content}
        )
        note_id = create_resp.json()["note_id"]
        self.created_note_ids.append(note_id)
        
        # Edit the note
        updated_content = f"TEST_updated_{int(time.time())}"
        edit_resp = self.session.put(
            f"{BASE_URL}/api/notes/{note_id}",
            json={"content": updated_content}
        )
        
        assert edit_resp.status_code == 200, f"Expected 200, got {edit_resp.status_code}: {edit_resp.text}"
        
        data = edit_resp.json()
        assert data["content"] == updated_content, f"Content not updated: {data['content']}"
        assert "updated_at" in data, "Should have updated_at timestamp"
        print(f"✓ Note {note_id} content updated successfully")
        
        # Verify by GET
        list_resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        list_data = list_resp.json()
        all_notes = list_data["pinned"] + list_data["recent"]
        found_note = next((n for n in all_notes if n["note_id"] == note_id), None)
        assert found_note is not None, "Note should be in list"
        assert found_note["content"] == updated_content, "Content should be persisted"
        print("✓ Updated content verified via GET")
    
    def test_edit_note_not_found(self):
        """PUT to non-existent note returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/notes/nonexistent_note_xyz",
            json={"content": "test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent note correctly returns 404")
    
    # ===================== DELETE NOTE =====================
    def test_delete_note(self):
        """DELETE /api/notes/{note_id} deletes the note"""
        # Create a note
        content = f"TEST_delete_{int(time.time())}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": content}
        )
        note_id = create_resp.json()["note_id"]
        # Don't add to cleanup list since we're deleting it
        
        # Delete the note
        delete_resp = self.session.delete(f"{BASE_URL}/api/notes/{note_id}")
        
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        
        data = delete_resp.json()
        assert data.get("ok") == True, "Delete should return {ok: true}"
        print(f"✓ Note {note_id} deleted successfully")
        
        # Verify it's gone
        list_resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        list_data = list_resp.json()
        all_note_ids = [n["note_id"] for n in list_data["pinned"] + list_data["recent"]]
        assert note_id not in all_note_ids, "Deleted note should not appear in list"
        print("✓ Deleted note no longer appears in list")
    
    def test_delete_note_not_found(self):
        """DELETE non-existent note returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/notes/nonexistent_note_xyz")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent note delete correctly returns 404")
    
    # ===================== PINNED VS RECENT ORDERING =====================
    def test_pinned_notes_appear_first(self):
        """Verify pinned notes appear in 'pinned' section, unpinned in 'recent'"""
        # Create two notes
        note1_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": f"TEST_pinned_{int(time.time())}"}
        )
        note1_id = note1_resp.json()["note_id"]
        self.created_note_ids.append(note1_id)
        
        note2_resp = self.session.post(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes",
            json={"content": f"TEST_recent_{int(time.time())}"}
        )
        note2_id = note2_resp.json()["note_id"]
        self.created_note_ids.append(note2_id)
        
        # Pin note1
        self.session.put(f"{BASE_URL}/api/notes/{note1_id}", json={"is_pinned": True})
        
        # Get list
        list_resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/notes")
        list_data = list_resp.json()
        
        pinned_ids = [n["note_id"] for n in list_data["pinned"]]
        recent_ids = [n["note_id"] for n in list_data["recent"]]
        
        assert note1_id in pinned_ids, "Pinned note1 should be in pinned section"
        assert note2_id in recent_ids, "Unpinned note2 should be in recent section"
        print("✓ Pinned/recent segregation working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
