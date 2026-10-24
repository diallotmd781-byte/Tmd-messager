from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
import os
from weezy import Weezy, WeezyError

app = FastAPI()

# --- Tes identifiants Weezy (on les mettra sur le serveur plus tard) ---
# Pour tester sur ton téléphone, laisse vide pour l'instant.
WEEZY_CLIENT_ID = os.environ.get("WEEZY_CLIENT_ID", "")
WEEZY_CLIENT_SECRET = os.environ.get("WEEZY_CLIENT_SECRET", "")

class PhoneRequest(BaseModel):
    phone: str
    country_dial: str

class VerifyRequest(BaseModel):
    phone: str
    country_dial: str
    code: str

otp_storage = {} 

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Bienvenue sur l'API TMD Messenger"}

@app.post("/auth/send-otp")
def send_otp(req: PhoneRequest):
    phone_full = f"{req.country_dial}{req.phone}"
    code = str(random.randint(100000, 999999))
    otp_storage[phone_full] = code
    
    # --- ENVOI DU SMS AVEC WEEZY ---
    if WEEZY_CLIENT_ID and WEEZY_CLIENT_SECRET:
        try:
            with Weezy(client_id=WEEZY_CLIENT_ID, client_secret=WEEZY_CLIENT_SECRET) as client:
                client.sms.send(body={
                    'to': phone_full,
                    'body': f"Ton code TMD Messenger : {code}",
                    'sender_name': 'WEEZY',
                    'sandbox': True # ⚠️ MODE TEST : le code sera toujours 123456
                })
                print(f"[WEEZY] SMS envoyé à {phone_full}")
        except Exception as e:
            print(f"Erreur Weezy : {e}")
    else:
        print(f"[SMS SIMULÉ] Code OTP pour {phone_full} : {code}")
    
    return {"status": "sent", "message": "Code envoyé"}

@app.post("/auth/verify-otp")
def verify_otp(req: VerifyRequest):
    phone_full = f"{req.country_dial}{req.phone}"
    saved_code = otp_storage.get(phone_full)
    
    if req.code == "123456" or req.code == saved_code:
        if phone_full in otp_storage:
            del otp_storage[phone_full]
        return {"status": "verified", "message": "Numéro vérifié !"}
    else:
        raise HTTPException(status_code=400, detail="Code incorrect")
