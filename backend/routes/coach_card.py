from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from database import db
from auth import get_current_user, get_tenant_id
from datetime import datetime, timezone
import uuid
import logging
import io
import re

logger = logging.getLogger("coach_card")
router = APIRouter(prefix="/api")


@router.get("/coach-card/{program_id}")
async def get_coach_card_config(program_id: str, request: Request):
    """Get Coach Card config for a specific program."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    config = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not config:
        config = {
            "tenant_id": tenant_id,
            "program_id": program_id,
            "coach_note": "",
            "featured_video": "",
            "show_schedule": True,
            "show_academics": True,
            "show_measurables": True,
            "show_videos": True,
            "slug": "",
        }
    else:
        # Ensure defaults for visibility toggles
        for field in ["show_schedule", "show_academics", "show_measurables", "show_videos"]:
            config.setdefault(field, True)
        config.setdefault("coach_note", "")
        config.setdefault("featured_video", "")
    return config


@router.put("/coach-card/{program_id}")
async def update_coach_card_config(program_id: str, request: Request):
    """Update Coach Card config (coach note, featured video, visibility toggles)."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    updates = {}
    for field in ["coach_note", "featured_video", "show_schedule", "show_academics",
                   "show_measurables", "show_videos"]:
        if field in body:
            updates[field] = body[field]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Generate slug if it doesn't exist
    existing = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0, "slug": 1}
    )
    if not existing or not existing.get("slug"):
        # Build slug from athlete name + school name
        profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0, "athlete_name": 1, "first_name": 1, "last_name": 1})
        program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0, "university_name": 1})
        # Support both athlete_name (single field) and first/last name
        if profile and profile.get("athlete_name"):
            name_part = profile["athlete_name"].lower().strip()
        else:
            fname = (profile.get("first_name", "") if profile else "").lower().strip()
            lname = (profile.get("last_name", "") if profile else "").lower().strip()
            name_part = f"{fname} {lname}".strip()
        school = (program.get("university_name", "") if program else "").lower().strip()
        slug_parts = f"{name_part}-{school}".replace(" ", "-")
        slug_parts = re.sub(r"[^a-z0-9\-]", "", slug_parts)
        slug_parts = re.sub(r"-+", "-", slug_parts).strip("-")
        short_id = uuid.uuid4().hex[:6]
        updates["slug"] = f"{slug_parts}-{short_id}"

    updates["tenant_id"] = tenant_id
    updates["program_id"] = program_id

    await db.coach_cards.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": updates},
        upsert=True,
    )
    doc = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    return doc


@router.get("/card/{slug}")
async def get_public_coach_card(slug: str):
    """Public endpoint — no auth required. Returns Coach Card data for the given slug."""
    config = await db.coach_cards.find_one({"slug": slug}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Coach Card not found")

    tenant_id = config["tenant_id"]
    program_id = config["program_id"]

    # Get athlete profile
    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id},
        {"_id": 0, "athlete_name": 1, "first_name": 1, "last_name": 1,
         "graduation_year": 1, "grad_year": 1,
         "positions": 1, "position": 1, "secondary_position": 1,
         "height": 1, "weight": 1,
         "jersey_number": 1, "gpa": 1, "sat_score": 1, "act_score": 1,
         "club_team": 1, "high_school": 1, "state": 1, "city": 1,
         "highlight_video": 1, "highlights_url": 1, "hudl_url": 1, "full_game_film_url": 1,
         "photo_url": 1, "dominant_hand": 1, "reach": 1, "approach_jump": 1,
         "block_jump": 1, "standing_reach": 1, "vertical_jump": 1,
         "wingspan": 1, "speed_60yd": 1}
    )

    # Get program info
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "university_name": 1, "stage": 1}
    )

    # Get schedule (upcoming events only)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    schedule = []
    if config.get("show_schedule", True):
        schedule = await db.schedule_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}},
            {"_id": 0, "name": 1, "start_date": 1, "end_date": 1,
             "location": 1, "division": 1, "jersey_number": 1}
        ).sort("start_date", 1).to_list(20)

    return {
        "profile": profile or {},
        "program": program or {},
        "config": {
            "coach_note": config.get("coach_note", ""),
            "featured_video": config.get("featured_video", ""),
            "show_schedule": config.get("show_schedule", True),
            "show_academics": config.get("show_academics", True),
            "show_measurables": config.get("show_measurables", True),
            "show_videos": config.get("show_videos", True),
        },
        "schedule": schedule,
        "view_count": config.get("view_count", 0),
    }



def _build_pdf(profile, program, config, schedule):
    """Generate a 1-page PDF Coach Card."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            topMargin=0.5 * inch, bottomMargin=0.5 * inch,
                            leftMargin=0.6 * inch, rightMargin=0.6 * inch)

    teal = HexColor("#1a8a80")
    dark = HexColor("#1e293b")
    gray = HexColor("#64748b")
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  fontSize=22, textColor=dark, spaceAfter=4, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"],
                                     fontSize=11, textColor=gray, alignment=TA_CENTER, spaceAfter=2)
    heading_style = ParagraphStyle("H2", parent=styles["Heading2"],
                                    fontSize=13, textColor=teal, spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                 fontSize=10, textColor=dark, leading=14)
    note_style = ParagraphStyle("Note", parent=styles["Normal"],
                                 fontSize=10, textColor=dark, leading=14,
                                 backColor=HexColor("#f0fdfa"), borderPadding=8)

    elements = []
    p = profile or {}
    name = p.get("athlete_name") or f'{p.get("first_name","")} {p.get("last_name","")}'.strip() or "Athlete"
    grad = p.get("graduation_year") or p.get("grad_year", "")
    pos = p.get("positions", [p.get("position", "")])[0] if p.get("positions") else p.get("position", "")

    # Header
    elements.append(Paragraph(name, title_style))
    sub_parts = [s for s in [pos, f"Class of {grad}" if grad else "", p.get("club_team", "")] if s]
    if sub_parts:
        elements.append(Paragraph(" | ".join(sub_parts), subtitle_style))
    loc_parts = [s for s in [p.get("high_school", ""), f'{p.get("city","")}, {p.get("state","")}' if p.get("state") else ""] if s]
    if loc_parts:
        elements.append(Paragraph(" | ".join(loc_parts), subtitle_style))

    if program and program.get("university_name"):
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(f"Interested in <b>{program['university_name']}</b>", subtitle_style))

    # Coach Note
    if config.get("coach_note"):
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f'"{config["coach_note"]}"', note_style))

    # Measurables
    if config.get("show_measurables", True):
        stats = []
        for label, key in [("Height", "height"), ("Weight", "weight"), ("Jersey", "jersey_number"),
                           ("Reach", "standing_reach"), ("Approach", "approach_jump"),
                           ("Block", "block_jump"), ("Vertical", "vertical_jump"), ("Hand", "dominant_hand")]:
            val = p.get(key, "") or p.get("reach", "") if key == "standing_reach" else p.get(key, "")
            if val:
                display = f"{val} lbs" if key == "weight" else (f"#{val}" if key == "jersey_number" else str(val))
                stats.append((label, display))
        if stats:
            elements.append(Paragraph("Athletic Measurables", heading_style))
            rows = []
            row = []
            for i, (label, val) in enumerate(stats):
                row.append(f"<b>{val}</b><br/><font size=7 color='#64748b'>{label}</font>")
                if len(row) == 4 or i == len(stats) - 1:
                    while len(row) < 4:
                        row.append("")
                    rows.append([Paragraph(c, ParagraphStyle("C", alignment=TA_CENTER, fontSize=10, textColor=dark)) for c in row])
                    row = []
            if rows:
                t = Table(rows, colWidths=[1.6 * inch] * 4)
                t.setStyle(TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f8fafc")),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
                    ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ]))
                elements.append(t)

    # Academics
    if config.get("show_academics", True):
        acad = []
        for label, key in [("GPA", "gpa"), ("SAT", "sat_score"), ("ACT", "act_score")]:
            if p.get(key):
                acad.append(f"<b>{label}:</b> {p[key]}")
        if acad:
            elements.append(Paragraph("Academics", heading_style))
            elements.append(Paragraph("    ".join(acad), body_style))

    # Videos
    if config.get("show_videos", True):
        vids = []
        featured = config.get("featured_video", "")
        if featured:
            vids.append(("Featured Video", featured))
        for label, key in [("Highlights", "highlight_video"), ("Hudl", "hudl_url"), ("Full Game Film", "full_game_film_url")]:
            url = p.get(key, "")
            if url and url != featured:
                vids.append((label, url))
        if vids:
            elements.append(Paragraph("Video Links", heading_style))
            for label, url in vids:
                elements.append(Paragraph(f"<b>{label}:</b> <link href='{url}'>{url}</link>", body_style))

    # Schedule
    if config.get("show_schedule", True) and schedule:
        elements.append(Paragraph("Upcoming Schedule", heading_style))
        sched_data = [["Date", "Event", "Location", "Division"]]
        for ev in schedule[:10]:
            sd = ev.get("start_date", "TBA")
            ed = ev.get("end_date", "")
            date_str = sd if not ed or sd == ed else f"{sd} - {ed}"
            sched_data.append([date_str, ev.get("name", ""), ev.get("location", ""), ev.get("division", "")])
        st = Table(sched_data, colWidths=[1.3 * inch, 2.2 * inch, 1.8 * inch, 1.1 * inch])
        st.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), teal),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f8fafc")]),
        ]))
        elements.append(st)

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Generated by CapyMatch", ParagraphStyle("Foot", alignment=TA_CENTER, fontSize=8, textColor=gray)))

    doc.build(elements)
    buf.seek(0)
    return buf


@router.get("/card/{slug}/pdf")
async def download_coach_card_pdf(slug: str):
    """Public endpoint — generates and returns a 1-page PDF of the Coach Card."""
    config = await db.coach_cards.find_one({"slug": slug}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Coach Card not found")

    tenant_id = config["tenant_id"]
    program_id = config["program_id"]

    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id},
        {"_id": 0, "athlete_name": 1, "first_name": 1, "last_name": 1,
         "graduation_year": 1, "grad_year": 1,
         "positions": 1, "position": 1, "secondary_position": 1,
         "height": 1, "weight": 1, "jersey_number": 1,
         "gpa": 1, "sat_score": 1, "act_score": 1,
         "club_team": 1, "high_school": 1, "state": 1, "city": 1,
         "highlight_video": 1, "hudl_url": 1, "full_game_film_url": 1,
         "dominant_hand": 1, "reach": 1, "approach_jump": 1,
         "block_jump": 1, "standing_reach": 1, "vertical_jump": 1}
    )

    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "university_name": 1}
    )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    schedule = []
    if config.get("show_schedule", True):
        schedule = await db.schedule_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}},
            {"_id": 0, "name": 1, "start_date": 1, "end_date": 1, "location": 1, "division": 1}
        ).sort("start_date", 1).to_list(10)

    name = (profile or {}).get("athlete_name", "athlete").replace(" ", "_")
    school = (program or {}).get("university_name", "school").replace(" ", "_")
    filename = f"CoachCard_{name}_{school}.pdf"

    buf = _build_pdf(profile, program, config, schedule)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
