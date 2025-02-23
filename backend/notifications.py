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
        employees = db.query(models.Employee).all()
        
        for employee in db.query(models.Employee).all():
            # Verificar si ya fichó hoy
            today_record = db.query(models.AttendanceRecord).filter(
                models.AttendanceRecord.employee_id == employee.id,
                models.AttendanceRecord.check_in >= current_date
            ).first()
            
            if not today_record and hasattr(employee, 'push_subscription'):
                message = {
                    "title": "Recordatorio de Asistencia",
                    "body": f"Hola {employee.name}, no olvides registrar tu entrada.",
                    "icon": "/icon.png",
                    "badge": "/badge.png"
                }
                send_web_push(json.loads(employee.push_subscription), message)
    finally:
        db.close()

# Configurar el scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    check_and_notify_employees,
    CronTrigger(hour='9', minute='0')  # Notificar a las 9:00 AM
)
