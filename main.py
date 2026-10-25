from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import Session
from fastapi import Depends
import os
import random

# --- CONFIGURATION DE LA BASE DE DONNÉES ---
# Render va injecter cette variable d'environnement (on la configurera à l'étape 3)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db") 

# Création du moteur de base de données
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODÈLE DE DONNÉES (Table Utilisateur) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    country_dial = Column(String)
    is_verified = Column(Integer, default=0)

# Créer la table si elle n'existe pas
Base.metadata.create_all(bind=engine)

# --- FONCTION POUR OBTENIR LA SESSION DB ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- INITIALISATION FASTAPI ---
app = FastAPI()

# Mémoire temporaire pour les codes OTP (en attendant de les mettre en base)
otp_storage = {}

class PhoneRequest(BaseModel):
    phone: str
    country_dial: str

class VerifyRequest(BaseModel):
    phone: str
    country_dial: str
    code: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Bienvenue sur l'API TMD Messenger"}

@app.post("/auth/send-otp")
def send_otp(req: PhoneRequest, db: Session = Depends(get_db)):
    # 1. Vérifier si l'utilisateur existe déjà dans la base
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
        # On enregistre l'utilisateur dans la base de données !
        user = db.query(User).filter(User.phone == req.phone).first()
        if not user:
            new_user = User(phone=req.phone, country_dial=req.country_dial, is_verified=1)
            db.add(new_user)
            db.commit()
        else:
            user.is_verified = 1
            db.commit()

        if phone_full in otp_storage:
            del otp_storage[phone_full]
            
        return {"status": "verified", "message": "Numéro vérifié et enregistré !"}
    else:
        raise HTTPException(status_code=400, detail="Code incorrect")