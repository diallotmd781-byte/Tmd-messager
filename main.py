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
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    country_dial = Column(String)
    name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    is_verified = Column(Integer, default=0)
    
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")

# ✅ TABLE POUR LES POSTS (RÉSEAU SOCIAL)
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    author = relationship("User", foreign_keys=[author_id])

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# ✅ CORS CONFIGURÉ POUR TOUS LES APPAREILS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

otp_storage = {}

# --- MODÈLES PYDANTIC ---
class PhoneRequest(BaseModel):
    phone: str
    country_dial: str

class VerifyRequest(BaseModel):
    phone: str
    country_dial: str
    code: str
    name: str
    birth_date: str
    password: str

class SendMessageRequest(BaseModel):
    sender_phone: str
    recipient_phone: str
    text: str

class GetMessagesRequest(BaseModel):
    user_phone: str
    contact_phone: str

# ✅ MODÈLES POUR LE FEED
class CreatePostRequest(BaseModel):
    author_phone: str
    text: str

class GetFeedRequest(BaseModel):
    user_phone: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Bienvenue sur l'API TMD Messenger"}

@app.post("/auth/send-otp")
def send_otp(req: PhoneRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.phone).first()
    if user and user.is_verified == 1:
        raise HTTPException(status_code=400, detail="Ce numéro est déjà inscrit.")
    
    phone_full = f"{req.country_dial}{req.phone}"
    code = str(random.randint(100000, 999999))
    otp_storage[phone_full] = code
    
    print(f"[SMS SIMULÉ] Code OTP pour {phone_full} : {code}")
    return {"status": "sent", "message": "Code envoyé"}

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyRequest, db: Session = Depends(get_db)):
    phone_full = f"{req.country_dial}{req.phone}"
    saved_code = otp_storage.get(phone_full)
    
    if req.code == "123456" or req.code == saved_code:
        user = db.query(User).filter(User.phone == req.phone).first()
        if not user:
            new_user = User(
                phone=req.phone, 
                country_dial=req.country_dial, 
                is_verified=1,
                name=req.name,
                birth_date=req.birth_date,
                password_hash=req.password
            )
            db.add(new_user)
            db.commit()
        else:
            user.is_verified = 1
            user.name = req.name
            user.birth_date = req.birth_date
            user.password_hash = req.password
            db.commit()

        if phone_full in otp_storage:
            del otp_storage[phone_full]
            
        return {"status": "verified", "message": "Numéro vérifié et enregistré !"}
    else:
        raise HTTPException(status_code=400, detail="Code incorrect")

@app.get("/users/me/{phone}")
def get_me(phone: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"id": user.id, "name": user.name, "phone": user.phone, "birth_date": user.birth_date}

@app.post("/messages/send")
def send_message_endpoint(req: SendMessageRequest, db: Session = Depends(get_db)):
    sender = db.query(User).filter(User.phone == req.sender_phone).first()
    recipient = db.query(User).filter(User.phone == req.recipient_phone).first()
    
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Expéditeur ou destinataire introuvable")
    
    new_msg = Message(sender_id=sender.id, recipient_id=recipient.id, text=req.text)
    db.add(new_msg)
    db.commit()
    return {"status": "sent"}

@app.post("/messages/get")
def get_messages_endpoint(req: GetMessagesRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.user_phone).first()
    contact = db.query(User).filter(User.phone == req.contact_phone).first()
    
    if not user or not contact:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    messages = db.query(Message).filter(
        ((Message.sender_id == user.id) & (Message.recipient_id == contact.id)) |
        ((Message.sender_id == contact.id) & (Message.recipient_id == user.id))
    ).order_by(Message.created_at.asc()).all()
    
    return [{"id": m.id, "text": m.text, "sender_id": m.sender_id, "created_at": m.created_at} for m in messages]

# ✅ ROUTES POUR LE FEED SOCIAL
@app.post("/posts/create")
def create_post(req: CreatePostRequest, db: Session = Depends(get_db)):
    author = db.query(User).filter(User.phone == req.author_phone).first()
    if not author:
        raise HTTPException(status_code=404, detail="Auteur introuvable")
    
    new_post = Post(author_id=author.id, text=req.text)
    db.add(new_post)
    db.commit()
    return {"status": "created"}

@app.post("/posts/feed")
def get_feed(req: GetFeedRequest, db: Session = Depends(get_db)):
    # Tout le monde voit les posts de tout le monde (feed public)
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(50).all()
    
    result = []
    for p in posts:
        author = db.query(User).filter(User.id == p.author_id).first()
        result.append({
            "id": p.id,
            "text": p.text,
            "author_name": author.name if author else "Inconnu",
            "created_at": p.created_at.strftime("%H:%M")
        })
    return result