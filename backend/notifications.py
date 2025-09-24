from pywebpush import webpush, WebPushException
from datetime import datetime, time
import json
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from dotenv import load_dotenv
import os

load_dotenv()

with open('vapid_keys.json') as f:
    vapid_keys = json.load(f)

VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {
    "sub": f"mailto:{os.getenv('VAPID_CLAIM_EMAIL')}"
}

def send_web_push(subscription_info, message_body):
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(message_body),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
    except WebPushException as ex:
        print("Error sending push notification:", repr(ex))
        if ex.response and ex.response.json():
            print("Remote service replied with:", ex.response.json())

def check_and_notify_employees():
    db = SessionLocal()
    try:
        # Obtener empleados que no han fichado hoy
        current_date = datetime.now().date()
        employees = db.query(models.User).filter(models.User.role == 'tecnico').all()
        
        for employee in employees:
            # Verificar si ya fichó hoy
            today_record = db.query(models.Attendance).filter(
                models.Attendance.user_id == employee.id,
                models.Attendance.check_in >= current_date
            ).first()
            
            if not today_record and employee.push_subscription:
                try:
                    subscription = employee.push_subscription
                    
                    # Asegurar que subscription sea un diccionario
                    if isinstance(subscription, str):
                        try:
                            subscription = json.loads(subscription)
                        except json.JSONDecodeError as e:
                            print(f"Error parsing subscription JSON for {employee.email}: {e}")
                            continue
                    
                    # Verificar que subscription tenga la estructura correcta
                    if not isinstance(subscription, dict) or 'endpoint' not in subscription:
                        print(f"Invalid subscription format for {employee.email}: {subscription}")
                        continue
                    
                    message = {
                        "title": "Recordatorio de Asistencia",
                        "body": f"Hola {employee.full_name}, no olvides registrar tu entrada.",
                        "icon": "/icon.png",
                        "badge": "/badge.png"
                    }
                    send_web_push(subscription, message)
                    print(f"Recordatorio enviado exitosamente a {employee.email}")
                    
                except Exception as e:
                    print(f"Error enviando recordatorio a {employee.email}: {str(e)}")
    finally:
        db.close()

# Configurar el scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    check_and_notify_employees,
    CronTrigger(hour='9', minute='0')  # Notificar a las 9:00 AM
)
