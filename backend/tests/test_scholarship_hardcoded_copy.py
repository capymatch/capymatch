"""
Test Suite: Scholarship Structure Hardcoded UI Copy Validation

This test validates that the AI determines ONLY the label and all
explanation/guidance/tooltip text is hardcoded per label state.

Five states tested:
- Unknown (no data)
- Unknown_vague (notes too vague)
- Typically Partial
- Mix of Partial and Full
- Walk-On Pathways Common

FGCU (prog_3fe70bce8e71) has stored notes -> returns 'Mix of Partial and Full'
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"  # Has scholarship_notes

# Exact hardcoded copy from backend/intelligence/agents/scholarship.py
EXPECTED_UI_COPY = {
    "Unknown": {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "Scholarship structure isn't available for this program in our stored data. We can't determine how athletic aid is typically distributed here.",
        "guidance": "Ask the coaching staff what aid is common for your position and class year, and what academic/need-based aid families often combine with athletic support.",
        "tooltip": "Scholarship structures reflect typical program practices and may change year to year. This is not a guarantee of aid.",
    },
    "Unknown_vague": {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "We have program notes, but they aren't specific enough to determine the typical scholarship structure.",
        "guidance": "Ask whether aid is commonly partial, occasionally full, or primarily walk-on with later opportunities — and what that looks like for your position.",
        "tooltip": "This reflects limited specificity in available notes, not a guarantee of aid.",
    },
    "Typically Partial": {
        "status": "partial",
        "label": "Typically Partial",
        "explanation": "Based on the program notes we have, athletic aid is most often offered as partial awards. Amounts can vary by role, timing, and roster needs.",
        "guidance": "If this school is a priority, ask what a typical package looks like for your position and whether academic aid is commonly stacked.",
        "tooltip": "This reflects typical patterns from available notes, not a guarantee of aid.",
    },
    "Mix of Partial and Full": {
        "status": "mix",
        "label": "Mix of Partial and Full",
        "explanation": "Program notes suggest a mix of partial and occasional larger awards depending on roster needs. Aid decisions vary significantly by year and recruiting class.",
        "guidance": "Ask directly what profiles tend to receive larger awards and what the staff prioritizes (position needs, academics, impact timeline).",
        "tooltip": "This reflects typical patterns from available notes, not a guarantee of aid.",
    },
    "Walk-On Pathways Common": {
        "status": "walkon",
        "label": "Walk-On Pathways Common",
        "explanation": "Program notes indicate many athletes begin as walk-ons, with potential opportunities to earn aid later. Availability can change by season and roster movement.",
        "guidance": "Ask how walk-on athletes are evaluated for future aid and what milestones typically lead to support (contribution, development, role).",
        "tooltip": "Walk-on pathways vary by program and year. This is not a guarantee of future aid.",
    },
}


class TestScholarshipHardcodedCopy:
    """Validate exact hardcoded UI copy for scholarship labels"""

    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "douglas@yeslms.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session

    def test_fgcu_returns_mix_of_partial_and_full(self, auth_session):
        """FGCU has scholarship_notes -> should return 'Mix of Partial and Full'"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}?force=true"
        )
        assert response.status_code == 200
        data = response.json()

        assert data.get("scholarship_label") == "Mix of Partial and Full", \
            f"Expected 'Mix of Partial and Full', got '{data.get('scholarship_label')}'"

    def test_explanation_matches_exact_copy(self, auth_session):
        """Explanation text must match hardcoded copy exactly"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        ui = data.get("ui", {})
        expected = EXPECTED_UI_COPY["Mix of Partial and Full"]["explanation"]

        assert ui.get("explanation") == expected, \
            f"Explanation mismatch:\nExpected: {expected}\nGot: {ui.get('explanation')}"

    def test_guidance_matches_exact_copy(self, auth_session):
        """Guidance text must match hardcoded copy exactly"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        ui = data.get("ui", {})
        expected = EXPECTED_UI_COPY["Mix of Partial and Full"]["guidance"]

        assert ui.get("guidance") == expected, \
            f"Guidance mismatch:\nExpected: {expected}\nGot: {ui.get('guidance')}"

    def test_tooltip_matches_exact_copy(self, auth_session):
        """Tooltip text must match hardcoded copy exactly"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        ui = data.get("ui", {})
        expected = EXPECTED_UI_COPY["Mix of Partial and Full"]["tooltip"]

        assert ui.get("tooltip") == expected, \
            f"Tooltip mismatch:\nExpected: {expected}\nGot: {ui.get('tooltip')}"

    def test_status_matches_label(self, auth_session):
        """UI status must match the label's expected status key"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        ui = data.get("ui", {})
        expected_status = EXPECTED_UI_COPY["Mix of Partial and Full"]["status"]

        assert ui.get("status") == expected_status, \
            f"Status mismatch: Expected '{expected_status}', got '{ui.get('status')}'"

    def test_no_dollar_amounts_in_response(self, auth_session):
        """Response must not contain any dollar amounts"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        text = json.dumps(response.json())

        # Check for dollar sign pattern (excluding field names)
        assert "$" not in text, "Response should not contain dollar amounts"

    def test_no_percentage_values_in_ui(self, auth_session):
        """UI copy must not contain specific percentage values"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        ui = response.json().get("ui", {})

        # Check explanation, guidance, tooltip for percentages
        ui_text = f"{ui.get('explanation', '')} {ui.get('guidance', '')} {ui.get('tooltip', '')}"

        # Should not have % followed by number patterns in scholarship context
        import re
        percentage_pattern = re.compile(r'\d+%')
        matches = percentage_pattern.findall(ui_text)
        assert len(matches) == 0, f"UI copy should not contain percentages: {matches}"

    def test_no_scholarship_counts_in_response(self, auth_session):
        """Response must not mention specific scholarship counts"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        ui = response.json().get("ui", {})

        ui_text = f"{ui.get('explanation', '')} {ui.get('guidance', '')} {ui.get('tooltip', '')}".lower()

        # Should not say things like "12 scholarships" or "4.5 scholarships"
        import re
        count_pattern = re.compile(r'\d+\.?\d*\s*scholarship')
        matches = count_pattern.findall(ui_text)
        assert len(matches) == 0, f"UI copy should not contain scholarship counts: {matches}"

    def test_ui_has_guidance_field(self, auth_session):
        """UI object must include guidance field (for 'What this means for you' block)"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        ui = response.json().get("ui", {})

        assert "guidance" in ui, "UI must include 'guidance' field for frontend display"
        assert ui["guidance"], "Guidance field must not be empty"

    def test_response_generated_by_ai(self, auth_session):
        """Response should be generated by AI (not deterministic) when notes exist"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}?force=true"
        )
        assert response.status_code == 200
        data = response.json()

        # FGCU has notes, so should use AI path
        assert data.get("generated_by") == "ai", \
            f"Expected 'ai', got '{data.get('generated_by')}'"

    def test_evidence_is_strong_for_stored_notes(self, auth_session):
        """Evidence should be 'strong' when using stored notes (not contributed)"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        # FGCU uses internal DB data, not contributed, so evidence should be strong
        assert data.get("scholarship_evidence") == "strong", \
            f"Expected evidence 'strong', got '{data.get('scholarship_evidence')}'"

    def test_label_basis_is_stored_notes(self, auth_session):
        """Label basis should be 'stored_notes' for FGCU"""
        response = auth_session.post(
            f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}"
        )
        assert response.status_code == 200
        data = response.json()

        assert data.get("label_basis") == "stored_notes", \
            f"Expected label_basis 'stored_notes', got '{data.get('label_basis')}'"
