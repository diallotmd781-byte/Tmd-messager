from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from datetime import datetime
import os
import random

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db") 
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 1. TABLE MESSAGERIE (Identité privée) ---
class UserMessaging(Base):
    __tablename__ = "users_messaging"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    country_dial = Column(String)
    name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    is_verified = Column(Integer, default=0)
    face_scanned = Column(Integer, default=0)

# --- 2. TABLE RÉSEAU SOCIAL (Identité publique) ---
class UserSocial(Base):
    __tablename__ = "users_social"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    birth_date = Column(String) # Privé
    contact = Column(String, unique=True, index=True) # Email ou Téléphone
    password_hash = Column(String)
    is_verified = Column(Integer, default=0)
    face_scanned = Column(Integer, default=0)

# --- 3. TABLE MESSAGES (Liés à la messagerie) ---
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users_messaging.id"))
    recipient_id = Column(Integer, ForeignKey("users_messaging.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- 4. TABLE POSTS (Liés au social) ---
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users_social.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

otp_storage = {}

# --- MODÈLES PYDANTIC ---
class SendOtpReq(BaseModel):
    phone: str
    country_dial: str

class VerifyOtpReq(BaseModel):
    phone: str
    country_dial: str
    code: str
    name: str
    birth_date: str
    password: str

class SocialRegisterReq(BaseModel):
    name: str
    birth_date: str
    contact: str
    password: str

class SendMessageReq(BaseModel):
    sender_phone: str
    recipient_phone: str
    text: str

class CreatePostReq(BaseModel):
    author_contact: str
    text: str

# --- ROUTES MESSAGERIE ---
@app.post("/auth/send-otp")
def send_otp(req: SendOtpReq, db: Session = Depends(get_db)):
    user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
    if user and user.is_verified == 1:
        raise HTTPException(status_code=400, detail="Ce numéro est déjà inscrit.")
    
    phone_full = f"{req.country_dial}{req.phone}"
    code = str(random.randint(100000, 999999))
    otp_storage[phone_full] = code
    print(f"[SMS SIMULÉ] Code OTP pour {phone_full} : {code}")
    return {"status": "sent"}

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyOtpReq, db: Session = Depends(get_db)):
    phone_full = f"{req.country_dial}{req.phone}"
    saved_code = otp_storage.get(phone_full)
    
    if req.code == "123456" or req.code == saved_code:
        user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
        if not user:
            new_user = UserMessaging(phone=req.phone, country_dial=req.country_dial, is_verified=1, name=req.name, birth_date=req.birth_date, password_hash=req.password)
            db.add(new_user)
        else:
            user.is_verified = 1
            user.name = req.name
            user.password_hash = req.password
        db.commit()
        if phone_full in otp_storage: del otp_storage[phone_full]
        return {"status": "verified"}
    raise HTTPException(status_code=400, detail="Code incorrect")

@app.post("/messages/send")
def send_message(req: SendMessageReq, db: Session = Depends(get_db)):
    sender = db.query(UserMessaging).filter(UserMessaging.phone == req.sender_phone).first()
    recipient = db.query(UserMessaging).filter(UserMessaging.phone == req.recipient_phone).first()
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    new_msg = Message(sender_id=sender.id, recipient_id=recipient.id, text=req.text)
    db.add(new_msg)
    db.commit()
    return {"status": "sent"}

# --- ROUTES SOCIAL ---
@app.post("/social/register")
def social_register(req: SocialRegisterReq, db: Session = Depends(get_db)):
    # On force le scan visage à 1 pour l'inscription (simulation)
    new_user = UserSocial(name=req.name, birth_date=req.birth_date, contact=req.contact, password_hash=req.password, is_verified=1, face_scanned=1)
    db.add(new_user)
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
        result.append({"id": p.id, "text": p.text, "author_name": author.name if author else "Inconnu", "created_at": p.created_at.strftime("%H:%M")})
    return result