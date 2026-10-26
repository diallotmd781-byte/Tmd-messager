from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from datetime import datetime
import os
import random

# --- CONFIGURATION DE LA BASE DE DONNÉES ---
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db") 

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODÈLES DE DONNÉES ---
class UserMessaging(Base):
    __tablename__ = "users_messaging"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    country_dial = Column(String)
    name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    is_verified = Column(Integer, default=0)
    
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")

class UserSocial(Base):
    __tablename__ = "users_social"
    id = Column(Integer, primary_key=True, index=True)
    contact = Column(String, unique=True, index=True)
    name = Column(String)
    birth_date = Column(String)
    password_hash = Column(String)
    avatar = Column(String, nullable=True)
    is_verified = Column(Integer, default=0)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users_messaging.id"))
    recipient_id = Column(Integer, ForeignKey("users_messaging.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("UserMessaging", foreign_keys=[sender_id], back_populates="sent_messages")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users_social.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Création des tables dans la base de données
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# --- CONFIGURATION CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stockage temporaire des codes OTP
otp_messaging = {}
otp_social = {}

# --- MODÈLES PYDANTIC (Validation des données) ---
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
    avatar: str

class SocialReq(BaseModel):
    contact: str
    name: str
    birth_date: str
    password: str
    avatar: str

class SendMsgReq(BaseModel):
    sender_phone: str
    recipient_phone: str
    text: str

class CreatePostReq(BaseModel):
    author_contact: str
    text: str

# --- ROUTES DE BASE ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Bienvenue sur l'API TMD Messenger"}

# --- ROUTES MESSAGERIE ---
@app.post("/auth/send-otp")
def send_otp(req: PhoneReq):
    phone_full = f"{req.country_dial}{req.phone}"
    code = str(random.randint(100000, 999999))
    otp_messaging[phone_full] = code
    print(f"[SMS MSG] Code pour {phone_full} : {code}")
    return {"status": "sent", "message": "Code envoyé"}

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyMsgReq, db: Session = Depends(get_db)):
    phone_full = f"{req.country_dial}{req.phone}"
    saved_code = otp_messaging.get(phone_full)
    
    if req.code == "123456" or req.code == saved_code:
        user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
        if not user:
            user = UserMessaging(
                phone=req.phone, country_dial=req.country_dial, 
                name=req.name, birth_date=req.birth_date, 
                password_hash=req.password, avatar=req.avatar, is_verified=1
            )
            db.add(user)
        else:
            user.name = req.name
            user.password_hash = req.password
            user.avatar = req.avatar
            user.is_verified = 1
        db.commit()
        if phone_full in otp_messaging: del otp_messaging[phone_full]
        return {"status": "verified", "message": "Numéro vérifié et enregistré !"}
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

# NOUVELLE ROUTE : Récupérer l'historique des discussions
@app.get("/messages/chats/{phone}")
def get_user_chats(phone: str, db: Session = Depends(get_db)):
    user = db.query(UserMessaging).filter(UserMessaging.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    # On récupère tous les messages envoyés ou reçus
    messages = db.query(Message).filter(
        (Message.sender_id == user.id) | (Message.recipient_id == user.id)
    ).order_by(Message.created_at.asc()).all()

    result = []
    for m in messages:
        is_mine = m.sender_id == user.id
        # On identifie l'interlocuteur
        other_user = m.recipient if is_mine else m.sender
        
        result.append({
            "id": m.id,
            "text": m.text,
            "mine": is_mine,
            "other_phone": other_user.phone,
            "other_name": other_user.name or other_user.phone,
            "other_avatar": other_user.avatar or "👤",
            "time": m.created_at.strftime("%H:%M")
        })
    return result

# --- ROUTES SOCIAL ---
@app.post("/social/register")
def social_register(req: SocialReq, db: Session = Depends(get_db)):
    user = db.query(UserSocial).filter(UserSocial.contact == req.contact).first()
    if not user:
        user = UserSocial(
            contact=req.contact, name=req.name, 
            birth_date=req.birth_date, password_hash=req.password, 
            avatar=req.avatar, is_verified=1
        )
        db.add(user)
        db.commit()
    return {"status": "created"}

@app.post("/social/posts")
def create_post(req: CreatePostReq, db: Session = Depends(get_db)):
    author = db.query(UserSocial).filter(UserSocial.contact == req.author_contact).first()
    if not author: raise HTTPException(status_code=404, detail="Auteur introuvable")
    new_post = Post(author_id=author.id, text=req.text)
    db.add(new_post)
    db.commit()
    return {"status": "created"}

@app.get("/social/feed")
def get_feed(db: Session = Depends(get_db)):
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(50).all()
    result = []
    for p in posts:
        author = db.query(UserSocial).filter(UserSocial.id == p.author_id).first()
        result.append({
            "id": p.id, 
            "text": p.text, 
            "author_name": author.name if author else "Inconnu", 
            "author_avatar": author.avatar if author else "🌍",
            "created_at": p.created_at.strftime("%H:%M")
        })
    return result