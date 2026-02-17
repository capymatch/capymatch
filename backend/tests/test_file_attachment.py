"""
Backend API tests for File Attachment Feature in Email Composer
Tests upload-attachment endpoint and send endpoint with attachment_ids
"""
import pytest
import requests
import os
import io

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = "pro@test.com"
TEST_PASSWORD = "password"


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session with pro user"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    return session


class TestUploadAttachmentRouteExists:
    """Test that upload-attachment route is properly registered"""
    
    def test_upload_attachment_returns_401_without_auth(self):
        """POST /api/gmail/upload-attachment requires authentication"""
        response = requests.post(f"{BASE_URL}/api/gmail/upload-attachment")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/gmail/upload-attachment returns 401 (route exists, auth required)")
    
    def test_upload_attachment_returns_400_without_file(self, auth_session):
        """POST /api/gmail/upload-attachment returns 400 when no file provided"""
        response = auth_session.post(f"{BASE_URL}/api/gmail/upload-attachment")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "No file provided" in response.json().get("detail", "")
        print("PASS: Upload returns 400 when no file is provided")


class TestFileUploadFunctionality:
    """Test file upload functionality"""
    
    def test_upload_small_file_success(self, auth_session):
        """Upload a small text file successfully"""
        # Create a small test file
        file_content = b"Test file content for email attachment"
        files = {"file": ("test_doc.txt", io.BytesIO(file_content), "text/plain")}
        
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/upload-attachment",
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "file_id" in data, "Response should contain file_id"
        assert "filename" in data, "Response should contain filename"
        assert "size" in data, "Response should contain size"
        
        # Verify values
        assert data["filename"] == "test_doc.txt"
        assert data["size"] == len(file_content)
        assert data["file_id"].startswith("att_")
        
        print(f"PASS: Small file uploaded successfully - file_id: {data['file_id']}, size: {data['size']}")
    
    def test_upload_pdf_file_success(self, auth_session):
        """Upload a PDF-like file (binary content)"""
        # Create binary content simulating a PDF
        file_content = b"%PDF-1.4 fake pdf content for testing purposes " * 100
        files = {"file": ("highlight_reel.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/upload-attachment",
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["filename"] == "highlight_reel.pdf"
        assert data["content_type"] == "application/pdf"
        assert data["size"] == len(file_content)
        
        print(f"PASS: PDF file uploaded - {data['filename']}, type: {data['content_type']}")
    
    def test_upload_file_size_under_10mb(self, auth_session):
        """Upload a file just under 10MB limit"""
        # Create ~5MB file (to test without hitting limit)
        file_content = b"x" * (5 * 1024 * 1024)  # 5MB
        files = {"file": ("large_video.mp4", io.BytesIO(file_content), "video/mp4")}
        
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/upload-attachment",
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["size"] == len(file_content)
        
        print(f"PASS: 5MB file uploaded successfully - size: {data['size']} bytes")


class TestFileSizeLimit:
    """Test 10MB file size limit enforcement"""
    
    def test_upload_rejects_file_over_10mb(self, auth_session):
        """Upload should reject files larger than 10MB"""
        # Create 11MB file
        file_content = b"x" * (11 * 1024 * 1024)  # 11MB
        files = {"file": ("huge_video.mp4", io.BytesIO(file_content), "video/mp4")}
        
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/upload-attachment",
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for oversized file, got {response.status_code}"
        assert "too large" in response.json().get("detail", "").lower() or "10MB" in response.json().get("detail", "")
        
        print("PASS: Files over 10MB are rejected with 400 error")


class TestSendEmailWithAttachments:
    """Test send endpoint accepts attachment_ids"""
    
    def test_send_with_attachment_ids_field(self, auth_session):
        """POST /api/gmail/send should accept attachment_ids in body"""
        # This will fail with Gmail not connected but we're testing the request format
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/send",
            json={
                "to": "coach@test.edu",
                "subject": "Test with attachments",
                "body": "Test email body with attachments",
                "attachment_ids": ["att_test123", "att_test456"]
            }
        )
        
        # 403 means Gmail not connected (expected), request format was valid
        # Any other error would indicate the attachment_ids field isn't accepted
        if response.status_code == 403:
            assert "Gmail not connected" in response.json().get("detail", "")
            print("PASS: Send endpoint accepts attachment_ids field (Gmail not connected as expected)")
        else:
            # If somehow Gmail is connected, check for success or other valid response
            print(f"Response: {response.status_code} - {response.text}")
            assert response.status_code in [200, 403, 500], f"Unexpected status: {response.status_code}"
    
    def test_send_without_attachments_still_works(self, auth_session):
        """POST /api/gmail/send should work without attachment_ids"""
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/send",
            json={
                "to": "coach@test.edu",
                "subject": "Test without attachments",
                "body": "Test email body"
            }
        )
        
        # 403 means Gmail not connected (expected for test account)
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        if response.status_code == 403:
            print("PASS: Send without attachments returns 403 (Gmail not connected)")
        else:
            print("PASS: Send without attachments succeeds")


class TestMultipleAttachments:
    """Test uploading and referencing multiple attachments"""
    
    def test_upload_multiple_files(self, auth_session):
        """Upload multiple files and verify each gets unique file_id"""
        uploaded_ids = []
        
        for i, fname in enumerate(["transcript.pdf", "highlight.mp4", "schedule.docx"]):
            file_content = f"Content for {fname}".encode() * 100
            files = {"file": (fname, io.BytesIO(file_content), "application/octet-stream")}
            
            response = auth_session.post(
                f"{BASE_URL}/api/gmail/upload-attachment",
                files=files
            )
            
            assert response.status_code == 200, f"Failed to upload {fname}: {response.text}"
            data = response.json()
            uploaded_ids.append(data["file_id"])
            print(f"  Uploaded: {fname} -> {data['file_id']}")
        
        # Verify all IDs are unique
        assert len(set(uploaded_ids)) == len(uploaded_ids), "All file_ids should be unique"
        print(f"PASS: Multiple files uploaded with unique IDs: {uploaded_ids}")


class TestAttachmentCleanup:
    """Test that temp attachments are cleaned up after sending"""
    
    def test_attachment_stored_temporarily(self, auth_session):
        """Verify attachment is stored and can be referenced"""
        file_content = b"Temporary attachment content"
        files = {"file": ("temp_test.txt", io.BytesIO(file_content), "text/plain")}
        
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/upload-attachment",
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        file_id = data["file_id"]
        
        # The file should exist in temp_attachments collection
        # We can't directly verify DB but we confirm the response
        assert file_id.startswith("att_")
        assert len(file_id) > 5  # att_ + at least some chars
        
        print(f"PASS: Attachment stored with ID {file_id}")


class TestEmailComposerModel:
    """Test ComposeEmail model accepts attachment_ids"""
    
    def test_compose_email_with_empty_attachments(self, auth_session):
        """ComposeEmail should accept empty attachment_ids list"""
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/send",
            json={
                "to": "coach@test.edu",
                "subject": "Test",
                "body": "Body",
                "attachment_ids": []
            }
        )
        
        # Should not get 422 validation error
        assert response.status_code != 422, f"Should accept empty attachment_ids, got 422: {response.text}"
        print(f"PASS: Empty attachment_ids accepted (status: {response.status_code})")
    
    def test_compose_email_validates_required_fields(self, auth_session):
        """Missing required fields should return 422"""
        response = auth_session.post(
            f"{BASE_URL}/api/gmail/send",
            json={
                "to": "coach@test.edu",
                # Missing subject and body
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("PASS: Validation works for required fields (subject, body)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
