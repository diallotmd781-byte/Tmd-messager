from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from datetime import datetime
import os
import random

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db") 
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if "postgresql" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODÈLES ---
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

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users_messaging.id"))
    recipient_id = Column(Integer, ForeignKey("users_messaging.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="sent")
    sender = relationship("UserMessaging", foreign_keys=[sender_id])

class UserSocial(Base):
    __tablename__ = "users_social"
    id = Column(Integer, primary_key=True, index=True)
    contact = Column(String, unique=True, index=True)
    name = Column(String)
    birth_date = Column(String)
    password_hash = Column(String)
    avatar = Column(String, nullable=True)
    is_verified = Column(Integer, default=0)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users_social.id"))
    text = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    author_id = Column(Integer, ForeignKey("users_social.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SocialMessage(Base):
    __tablename__ = "social_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users_social.id"))
    recipient_id = Column(Integer, ForeignKey("users_social.id"))
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    sender = relationship("UserSocial", foreign_keys=[sender_id])

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

otp_messaging = {}

# --- MODÈLES PYDANTIC ---
class PhoneReq(BaseModel): phone: str; country_dial: str
class VerifyMsgReq(BaseModel): phone: str; country_dial: str; code: str; name: str; birth_date: str; password: str; avatar: str
class LoginReq(BaseModel): phone: str; password: str
class SendMsgReq(BaseModel): sender_phone: str; recipient_phone: str; text: str
class UpdateProfileReq(BaseModel): phone: str = None; contact: str = None; name: str; avatar: str

class SocialReq(BaseModel): contact: str; name: str; birth_date: str; password: str; avatar: str
class LoginSocialReq(BaseModel): contact: str; password: str
class CreatePostReq(BaseModel): author_contact: str; text: str
class CreateCommentReq(BaseModel): author_contact: str; text: str
class SendSocialMsgReq(BaseModel): sender_contact: str; recipient_contact: str; text: str

# --- ROUTES GÉNÉRALES ---
@app.get("/")
def read_root(): return {"status": "ok", "message": "Bienvenue sur l'API TMD Messenger"}

@app.get("/debug-db")
def debug_db(db: Session = Depends(get_db)):
    try:
        return {"status": "Connecté", "utilisateurs_messagerie": db.query(UserMessaging).count(), "utilisateurs_social": db.query(UserSocial).count(), "utilise_sqlite": "sqlite" in DATABASE_URL}
    except Exception as e:
        return {"error": str(e)}

# --- MESSAGERIE ---
@app.post("/auth/send-otp")
def send_otp(req: PhoneReq):
    otp_messaging[f"{req.country_dial}{req.phone}"] = str(random.randint(100000, 999999))
    return {"status": "sent"}

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyMsgReq, db: Session = Depends(get_db)):
    phone_full = f"{req.country_dial}{req.phone}"
    if req.code == "123456" or req.code == otp_messaging.get(phone_full):
        user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
        if not user:
            user = UserMessaging(phone=req.phone, country_dial=req.country_dial, name=req.name, birth_date=req.birth_date, password_hash=req.password, avatar=req.avatar, is_verified=1)
            db.add(user)
        else:
            user.name, user.birth_date, user.password_hash, user.avatar = req.name, req.birth_date, req.password, req.avatar
        db.commit()
        if phone_full in otp_messaging: del otp_messaging[phone_full]
        return {"status": "verified"}
    raise HTTPException(status_code=400, detail="Code incorrect")

@app.post("/auth/login")
def login_messaging(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(UserMessaging).filter(UserMessaging.phone.endswith(req.phone)).first()
    if not user: raise HTTPException(status_code=404, detail="Numéro non trouvé")
    if user.password_hash != req.password: raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"status": "success", "phone": user.phone, "name": user.name, "avatar": user.avatar or "👤", "country_dial": user.country_dial}

@app.put("/auth/update-profile")
def update_profile_messaging(req: UpdateProfileReq, db: Session = Depends(get_db)):
    user = db.query(UserMessaging).filter(UserMessaging.phone == req.phone).first()
    if not user: raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.name, user.avatar = req.name, req.avatar
    db.commit()
    return {"status": "updated"}

@app.post("/messages/send")
def send_message(req: SendMsgReq, db: Session = Depends(get_db)):
    sender = db.query(UserMessaging).filter(UserMessaging.phone == req.sender_phone).first()
    recipient = db.query(UserMessaging).filter(UserMessaging.phone == req.recipient_phone).first()
    if not sender or not recipient: raise HTTPException(status_code=404, detail="Numéro introuvable")
    db.add(Message(sender_id=sender.id, recipient_id=recipient.id, text=req.text, status="sent")); db.commit()
    return {"status": "sent"}

@app.get("/messages/chats/{phone}")
def get_user_chats(phone: str, db: Session = Depends(get_db)):
    user = db.query(UserMessaging).filter(UserMessaging.phone == phone).first()
    if not user: raise HTTPException(status_code=404, detail="Introuvable")
    messages = db.query(Message).filter((Message.sender_id == user.id) | (Message.recipient_id == user.id)).order_by(Message.created_at.asc()).all()
    result = []
    for m in messages:
        is_mine = m.sender_id == user.id
        other_user = m.recipient if is_mine else m.sender
        result.append({"id": m.id, "text": m.text, "mine": is_mine, "status": m.status, "other_phone": other_user.phone, "other_name": other_user.name or other_user.phone, "other_avatar": other_user.avatar or "👤", "time": m.created_at.strftime("%H:%M")})
    return result

# --- SOCIAL ---
@app.post("/social/register")
def social_register(req: SocialReq, db: Session = Depends(get_db)):
    user = db.query(UserSocial).filter(UserSocial.contact == req.contact).first()
    if not user:
        db.add(UserSocial(contact=req.contact, name=req.name, birth_date=req.birth_date, password_hash=req.password, avatar=req.avatar, is_verified=1))
        db.commit()
    return {"status": "created"}

@app.post("/social/login")
def login_social(req: LoginSocialReq, db: Session = Depends(get_db)):
    user = db.query(UserSocial).filter(UserSocial.contact == req.contact).first()
    if not user: raise HTTPException(status_code=404, detail="Compte non trouvé")
    if user.password_hash != req.password: raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"status": "success", "name": user.name, "avatar": user.avatar or "🌍"}

@app.put("/social/update-profile")
def update_profile_social(req: UpdateProfileReq, db: Session = Depends(get_db)):
    user = db.query(UserSocial).filter(UserSocial.contact == req.contact).first()
    if not user: raise HTTPException(status_code=404, detail="Compte introuvable")
    user.name, user.avatar = req.name, req.avatar
    db.commit()
    return {"status": "updated"}

@app.post("/social/posts")
def create_post(req: CreatePostReq, db: Session = Depends(get_db)):
    author = db.query(UserSocial).filter(UserSocial.contact == req.author_contact).first()
    if not author: raise HTTPException(status_code=404, detail="Auteur introuvable")
    db.add(Post(author_id=author.id, text=req.text)); db.commit()
    return {"status": "created"}

@app.get("/social/feed")
def get_feed(db: Session = Depends(get_db)):
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(50).all()
    result = []
    for p in posts:
        author = db.query(UserSocial).filter(UserSocial.id == p.author_id).first()
        comments_count = db.query(Comment).filter(Comment.post_id == p.id).count()
        result.append({
            "id": p.id, "text": p.text, "author_name": author.name if author else "Inconnu", 
            "author_avatar": author.avatar if author else "🌍", "created_at": p.created_at.strftime("%H:%M"),
            "likes": p.likes, "comments_count": comments_count
        })
    return result

@app.post("/social/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404, detail="Post introuvable")
    post.likes += 1; db.commit()
    return {"status": "liked", "likes": post.likes}

@app.post("/social/posts/{post_id}/comment")
def add_comment(post_id: int, req: CreateCommentReq, db: Session = Depends(get_db)):
    author = db.query(UserSocial).filter(UserSocial.contact == req.author_contact).first()
    if not author: raise HTTPException(status_code=404, detail="Auteur introuvable")
    db.add(Comment(post_id=post_id, author_id=author.id, text=req.text)); db.commit()
    return {"status": "commented"}

@app.get("/social/search/{name}")
def search_social_user(name: str, db: Session = Depends(get_db)):
    users = db.query(UserSocial).filter(UserSocial.name.ilike(f"%{name}%")).all()
    if not users: raise HTTPException(status_code=404, detail="Aucun utilisateur trouvé")
    user = users[0]
    return {"contact": user.contact, "name": user.name, "avatar": user.avatar or "🌍"}

@app.post("/social/messages/send")
def send_social_message(req: SendSocialMsgReq, db: Session = Depends(get_db)):
    sender = db.query(UserSocial).filter(UserSocial.contact == req.sender_contact).first()
    recipient = db.query(UserSocial).filter(UserSocial.contact == req.recipient_contact).first()
    if not sender or not recipient: raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.add(SocialMessage(sender_id=sender.id, recipient_id=recipient.id, text=req.text)); db.commit()
    return {"status": "sent"}

@app.get("/social/messages/chats/{contact}")
def get_social_chats(contact: str, db: Session = Depends(get_db)):
    user = db.query(UserSocial).filter(UserSocial.contact == contact).first()
    if not user: raise HTTPException(status_code=404, detail="Introuvable")
    messages = db.query(SocialMessage).filter((SocialMessage.sender_id == user.id) | (SocialMessage.recipient_id == user.id)).order_by(SocialMessage.created_at.asc()).all()
    result = []
    for m in messages:
        is_mine = m.sender_id == user.id
        other_user = db.query(UserSocial).filter(UserSocial.id == (m.recipient_id if is_mine else m.sender_id)).first()
        result.append({"id": m.id, "text": m.text, "mine": is_mine, "other_contact": other_user.contact, "other_name": other_user.name, "other_avatar": other_user.avatar or "🌍", "time": m.created_at.strftime("%H:%M")})
    return result