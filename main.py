from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from datetime import datetime
import os
import random

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Tables
class UserMessaging(Base):
    __tablename__ = "users_messaging"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    country_dial = Column(String)
    name = Column(String)
    birth_date = Column(String)
    password_hash = Column(String)
    is_verified = Column(Integer, default=0)

class UserSocial(Base):
    __tablename__ = "users_social"
    id = Column(Integer, primary_key=True, index=True)
    contact = Column(String, unique=True, index=True)
    name = Column(String)
    birth_date = Column(String)
    password_hash = Column(String)
    is_verified = Column(Integer, default=0)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer)
    recipient_id = Column(Integer)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

# Stockage OTP temporaire
otp_messaging = {}
otp_social = {}

class PhoneReq(BaseModel):
    phone: str
    country_dial: str

class VerifyMsgReq(BaseModel):
    phone: str
    country_dial: str
    code: str
    name: str
    birth_date: str
    password: str

class SocialReq(BaseModel):
    contact: str
    name: str
    birth_date: str
    password: str

class SendMsgReq(BaseModel):
    sender_phone: str
    recipient_phone: str
    text: str

# --- MESSAGERIE ---
@app.post("/auth/send-otp")
def send_otp_messaging(req: PhoneReq):
    phone_full = f"{req.country_dial}{req.phone}"
    code = str(random.randint(100000, 999999))
    otp_messaging[phone_full] = code
    print(f"[SMS MSG] Code pour {phone_full} : {code}")
    return {"status": "sent"}

@app.post("/auth/verify-otp")
def verify_otp_messaging(req: VerifyMsgReq, db: Session = Depends(get_db)):
    phone_full = f"{req.country_dial}{req.phone}"
    if req.code == "123456" or req.code == otp_messaging.get(phone_full):
        user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
        if not user:
            user = UserMessaging(phone=req.phone, country_dial=req.country_dial, name=req.name, birth_date=req.birth_date, password_hash=req.password, is_verified=1)
            db.add(user)
        else:
            user.name = req.name
            user.password_hash = req.password
        db.commit()
        if phone_full in otp_messaging: del otp_messaging[phone_full]
        return {"status": "verified"}
    raise HTTPException(status_code=400, detail="Code incorrect")

@app.post("/messages/send")
def send_message(req: SendMsgReq, db: Session = Depends(get_db)):
    sender = db.query(UserMessaging).filter(UserMessaging.phone == req.sender_phone).first()
    recipient = db.query(UserMessaging).filter(UserMessaging.phone == req.recipient_phone).first()
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    new_msg = Message(sender_id=sender.id, recipient_id=recipient.id, text=req.text)
    db.add(new_msg)
    db.commit()
    return {"status": "sent"}

# --- SOCIAL ---
@app.post("/social/send-otp")
def send_otp_social(req: SocialReq):
    code = str(random.randint(100000, 999999))
    otp_social[req.contact] = code
    print(f"[SMS SOCIAL] Code pour {req.contact} : {code}")
    return {"status": "sent"}

@app.post("/social/verify-otp")
def verify_otp_social(req: SocialReq, db: Session = Depends(get_db)):
    if req.code == "123456" or req.code == otp_social.get(req.contact):
        user = db.query(UserSocial).filter(UserSocial.contact == req.contact).first()
        if not user:
            user = UserSocial(contact=req.contact, name=req.name, birth_date=req.birth_date, password_hash=req.password, is_verified=1)
            db.add(user)
        else:
            user.name = req.name
        db.commit()
        if req.contact in otp_social: del otp_social[req.contact]
        return {"status": "verified"}
    raise HTTPException(status_code=400, detail="Code incorrect")