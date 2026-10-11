from sqlalchemy import Column, Integer, String, Boolean, Text
from database import Base


class ScamReport(Base):
    __tablename__ = "scam_reports"

    id = Column(Integer, primary_key=True, index=True)

    caller_claim = Column(String)
    claimed_authority = Column(Boolean)
    threatened_arrest = Column(Boolean)
    demanded_money = Column(Boolean)
    asked_otp_bank = Column(Boolean)
    forced_video_call = Column(Boolean)
    asked_install_app = Column(Boolean)
    created_urgency = Column(Boolean)

    risk_score = Column(Integer)
    risk_level = Column(String)
    red_flags = Column(Text)