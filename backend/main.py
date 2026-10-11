from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from ai_agent import get_ai_advice
from database import engine, SessionLocal
from models import Base, ScamReport

from pathlib import Path
import json


app = FastAPI()


# =====================================================
# FRONTEND LOCATION
# =====================================================

FRONTEND_DIR = Path(__file__).resolve().parent / "fronted"


# =====================================================
# NO GOOGLE INDEXING
# =====================================================

@app.middleware("http")
async def add_noindex_header(request, call_next):

    response = await call_next(request)

    response.headers["X-Robots-Tag"] = "noindex, nofollow"

    return response


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# DATABASE
# =====================================================

Base.metadata.create_all(bind=engine)


# =====================================================
# FRONTEND
# =====================================================

@app.get("/", include_in_schema=False)
def home():

    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/style.css", include_in_schema=False)
def style():

    return FileResponse(
        FRONTEND_DIR / "style.css",
        media_type="text/css"
    )


@app.get("/script.js", include_in_schema=False)
def script():

    return FileResponse(
        FRONTEND_DIR / "script.js",
        media_type="application/javascript"
    )


# =====================================================
# USER INPUT MODEL
# =====================================================

class ScamInput(BaseModel):

    caller_claim: str
    claimed_authority: bool
    threatened_arrest: bool      # arrest / legal threat / threat of harm / kidnap
    demanded_money: bool
    asked_otp_bank: bool
    forced_video_call: bool
    asked_install_app: bool
    created_urgency: bool

    # NEW (optional, so the 8-question checker keeps working):
    # "your family member is in trouble / accident / kidnapped / arrested"
    family_emergency: bool = False


# =====================================================
# DIGITAL ARREST DETECTION
# =====================================================

@app.post("/detect-scam")
def detect_scam(data: ScamInput):

    risk_score = 0
    red_flags = []


    if data.claimed_authority:
        risk_score += 20
        red_flags.append("Authority impersonation")

    if data.threatened_arrest:
        risk_score += 20
        red_flags.append("Threat of arrest or harm")

    if data.family_emergency:
        risk_score += 20
        red_flags.append("Claim that a family member is in danger or trouble")

    if data.demanded_money:
        risk_score += 20
        red_flags.append("Money demand")

    if data.asked_otp_bank:
        risk_score += 20
        red_flags.append("OTP or bank details requested")

    if data.forced_video_call:
        risk_score += 10
        red_flags.append("Forced video call")

    if data.asked_install_app:
        risk_score += 5
        red_flags.append("Asked to install an application")

    if data.created_urgency:
        risk_score += 5
        red_flags.append("Created urgency or pressure")


    # =================================================
    # EXTORTION PATTERNS -> ALWAYS HIGH
    # =================================================

    # threat / "family member in trouble" + money demand
    if (data.threatened_arrest or data.family_emergency) and data.demanded_money:
        risk_score = max(risk_score, 60)

    # kidnapping / "your relative was arrested or hurt" style claims
    if data.family_emergency and data.threatened_arrest:
        risk_score = max(risk_score, 60)

    # asking for OTP/bank details together with an app install = phishing / remote-access scam
    if data.asked_otp_bank and data.asked_install_app:
        risk_score = max(risk_score, 60)

    risk_score = min(risk_score, 100)


    # =================================================
    # RISK LEVEL
    # =================================================

    if risk_score >= 50:
        risk_level = "HIGH"
    elif risk_score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    scam_detected = risk_score >= 30


    # =================================================
    # SAFETY ACTIONS
    # =================================================

    safety_actions = [
        "Do not transfer money.",
        "End the call.",
        "Do not share OTP, passwords, or bank details.",
        "Verify the caller independently.",
        "Report the incident through appropriate official channels."
    ]

    if data.family_emergency:
        safety_actions.insert(
            2,
            "Call the family member directly on their own number to check "
            "they are safe, before doing anything else."
        )


    # =================================================
    # DATABASE
    # =================================================

    db = SessionLocal()

    try:
        report = ScamReport(
            caller_claim=data.caller_claim,
            claimed_authority=data.claimed_authority,
            threatened_arrest=data.threatened_arrest,
            demanded_money=data.demanded_money,
            asked_otp_bank=data.asked_otp_bank,
            forced_video_call=data.forced_video_call,
            asked_install_app=data.asked_install_app,
            created_urgency=data.created_urgency,
            risk_score=risk_score,
            risk_level=risk_level,
            red_flags=json.dumps(red_flags)
        )

        db.add(report)
        db.commit()
        db.refresh(report)
        report_id = report.id

    finally:
        db.close()


    return {
        "message": "Scam report saved successfully",
        "report_id": report_id,
        "scam_detected": scam_detected,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "red_flags": red_flags,
        "safety_actions": safety_actions
    }


# =====================================================
# AI ADVICE INPUT
# =====================================================

class AdviceInput(BaseModel):

    user_question: str = ""
    risk_score: int = 0
    risk_level: str = "LOW"
    red_flags: List[str] = []


# =====================================================
# AI SAFETY ADVICE
# =====================================================

@app.post("/ai-advice")
def ai_advice(data: AdviceInput):

    advice = get_ai_advice(
        user_question=data.user_question,
        risk_score=data.risk_score,
        risk_level=data.risk_level,
        red_flags=data.red_flags
    )

    return {"advice": advice}


# =====================================================
# ALL REPORTS
# =====================================================

def _report_to_dict(report):

    return {
        "report_id": report.id,
        "caller_claim": report.caller_claim,
        "claimed_authority": report.claimed_authority,
        "threatened_arrest": report.threatened_arrest,
        "demanded_money": report.demanded_money,
        "asked_otp_bank": report.asked_otp_bank,
        "forced_video_call": report.forced_video_call,
        "asked_install_app": report.asked_install_app,
        "created_urgency": report.created_urgency,
        "risk_score": report.risk_score,
        "risk_level": report.risk_level,
        "red_flags": json.loads(report.red_flags or "[]")
    }


@app.get("/reports")
def get_reports():

    db = SessionLocal()

    try:
        result = [_report_to_dict(r) for r in db.query(ScamReport).all()]
    finally:
        db.close()

    return {
        "total_reports": len(result),
        "reports": result
    }


# =====================================================
# SINGLE REPORT
# =====================================================

@app.get("/reports/{report_id}")
def get_report(report_id: int):

    db = SessionLocal()

    try:
        report = db.query(ScamReport).filter(
            ScamReport.id == report_id
        ).first()

        if report is None:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        return _report_to_dict(report)

    finally:
        db.close()


# =====================================================
# VOICE SCAM DETECTOR (added feature)
# =====================================================

from voice_routes import register_voice_routes

register_voice_routes(app, detect_scam, ScamInput, FRONTEND_DIR)