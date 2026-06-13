import os
import asyncio
import firebase_admin
from firebase_admin import credentials, messaging
from app.config import settings

_initialized = False

def _init_firebase():
    global _initialized
    
    if _initialized:
        return True
    
    if not os.path.exists(settings.firebase_credentials_path):
        print("firebase-credentials.json tidak ditemukan - FCM dinonaktifkan")
        return False
    
    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)
    _initialized = True
    print("Firebase FCM initialized")
    return True

async def send_alert_notification(title: str, body: str, severity: str):
    if not _init_firebase():
        return

    topic = f"mineos-{severity.lower()}"
    
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body[:200]
        ),
        data={
            "severity": severity,
            "zone": "PIT-B3",
            "type": "agent-alert",
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        },
        topic=topic,
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(headers={"apns-priority": "10"})
    )

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, messaging.send, message)
        print(f"[FCM] Terkirim -> topic={topic} · id={response}")
    except Exception as e:
        print(f"[FCM] Error: {e}")