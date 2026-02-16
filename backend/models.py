from pydantic import BaseModel
from typing import Optional


class ProgramCreate(BaseModel):
    university_name: str
    division: str = ""
    conference: str = ""
    region: str = ""
    website: str = ""
    program_interest: str = ""
    mascot: str = ""
    recruiting_status: str = "Not Contacted"
    reply_status: str = "No Reply"
    priority: str = "Medium"
    is_active: bool = True
    initial_contact_sent: str = ""
    last_follow_up: str = ""
    follow_up_days: int = 14
    next_action: str = ""
    next_action_due: str = ""
    scholarship_type: str = ""
    roster_needs: str = ""
    events_seen: str = ""
    video_link: str = ""
    coach_contract_expiration: str = ""
    notes: str = ""
    athlete_interest: int = 5
    school_interest: int = 0


class ProgramUpdate(BaseModel):
    university_name: Optional[str] = None
    division: Optional[str] = None
    conference: Optional[str] = None
    region: Optional[str] = None
    website: Optional[str] = None
    program_interest: Optional[str] = None
    mascot: Optional[str] = None
    recruiting_status: Optional[str] = None
    reply_status: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    initial_contact_sent: Optional[str] = None
    last_follow_up: Optional[str] = None
    follow_up_days: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    scholarship_type: Optional[str] = None
    roster_needs: Optional[str] = None
    events_seen: Optional[str] = None
    video_link: Optional[str] = None
    coach_contract_expiration: Optional[str] = None
    notes: Optional[str] = None
    athlete_interest: Optional[int] = None
    school_interest: Optional[int] = None


class MarkAsReplied(BaseModel):
    note: str


class CoachCreate(BaseModel):
    program_id: str
    university_name: str = ""
    coach_name: str
    role: str = "Head Coach"
    email: str = ""
    phone: str = ""
    notes: str = ""


class CoachUpdate(BaseModel):
    coach_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class InteractionCreate(BaseModel):
    program_id: str
    university_name: str = ""
    coach_email: str = ""
    date_time: str = ""
    type: str = "Email"
    outcome: str = "No Response"
    notes: str = ""
    message_copy: str = ""
    links: str = ""


class MarkFollowUpSent(BaseModel):
    outcome: str = "No Response"
    reply_status: str = "No Reply"


class EventCreate(BaseModel):
    title: str
    event_type: str = "Camp"
    location: str = ""
    description: str = ""
    start_date: str = ""
    end_date: str = ""
    start_time: str = ""
    end_time: str = ""
    program_id: str = ""
    color: str = "purple"


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    program_id: Optional[str] = None
    color: Optional[str] = None


class ComposeEmail(BaseModel):
    to: str
    subject: str
    body: str
    cc: Optional[str] = ""
    bcc: Optional[str] = ""


class ReplyEmail(BaseModel):
    thread_id: str
    message_id: str
    body: str
    reply_all: bool = False


class DraftEmailRequest(BaseModel):
    program_id: str
    email_type: str = "intro"
    custom_instructions: Optional[str] = ""
