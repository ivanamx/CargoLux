from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
from database import engine, get_db
import pytz
import crud
import schemas
from typing import List
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from security import (
    get_current_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    verify_password,
    get_password_hash
)
from notifications import scheduler, VAPID_PUBLIC_KEY
from contextlib import asynccontextmanager
from passlib.context import CryptContext
from pydantic import BaseModel

# Crear las tablas
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código de inicio
    scheduler.start()
    try:
        # Crear usuario admin por defecto si no existe
        db = next(get_db())
        admin_exists = db.query(models.User).filter(models.User.email == "admin@example.com").first()
        if not admin_exists:
            db_admin = models.User(
                email="admin@example.com",
                username="admin",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
                status="activo",
                location="",
                phone=""
            )
            db.add(db_admin)
            db.commit()
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    yield
    # Código de cierre
    scheduler.shutdown()

app = FastAPI(title="Attendance System API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://apizhe.lat",
        "https://apizhe.lat",
        "http://www.apizhe.lat",
        "https://www.apizhe.lat"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Attendance System API v1.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(pytz.UTC).isoformat()
    }

@app.get("/test-db")
async def test_db(db: Session = Depends(get_db)):
    try:
        test_company = models.Company(name="Test Company")
        db.add(test_company)
        db.commit()
        db.refresh(test_company)
        return {"message": "Database connection successful", "company_id": test_company.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/companies/", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    return crud.create_company(db=db, company=company)

@app.get("/api/companies/", response_model=List[schemas.Company])
def read_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    companies = crud.get_companies(db, skip=skip, limit=limit)
    return companies

@app.get("/api/companies/{company_id}", response_model=schemas.Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    company = crud.get_company(db, company_id=company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@app.post("/api/employees/", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    return crud.create_employee(db=db, employee=employee)

@app.get("/api/employees/{employee_id}", response_model=schemas.Employee)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = crud.get_employee(db, employee_id=employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.get("/api/employees/link/{unique_link}", response_model=schemas.Employee)
def read_employee_by_link(unique_link: str, db: Session = Depends(get_db)):
    employee = crud.get_employee_by_link(db, unique_link=unique_link)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.post("/api/employees/{employee_id}/subscribe")
def subscribe_to_push(
    employee_id: int,
    subscription: schemas.PushSubscription,
    db: Session = Depends(get_db)
):
    employee = crud.get_employee(db, employee_id=employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.push_subscription = json.dumps(subscription.subscription_info)
    db.commit()
    return {"message": "Successfully subscribed to push notifications"}

@app.get("/api/vapid-public-key")
def get_vapid_public_key():
    return {"public_key": VAPID_PUBLIC_KEY}

@app.post("/api/attendance/", response_model=schemas.AttendanceRecord)
def create_attendance(
    attendance: schemas.AttendanceCreate, 
    db: Session = Depends(get_db)
):
    return crud.create_attendance_record(db=db, attendance=attendance)

@app.put("/api/attendance/{record_id}", response_model=schemas.AttendanceRecord)
def update_attendance(record_id: int, db: Session = Depends(get_db)):
    record = crud.update_attendance_record(db=db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        print("\nDatos recibidos:")
        print(f"Username: {form_data.username}")
        print(f"Password: {form_data.password}")
        print(f"Grant type: {form_data.grant_type}")

        # Buscar usuario
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        
        if not user:
            print(f"Usuario no encontrado: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        print(f"Usuario encontrado: {user.email}")
        print(f"Hash almacenado: {user.hashed_password}")
        
        # Verificar contraseña
        is_valid = verify_password(form_data.password, user.hashed_password)
        print(f"¿Contraseña válida?: {is_valid}")
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
            
        # Crear token con datos del usuario
        access_token = create_access_token(
            data={
                "sub": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        )
        
        # Preparar respuesta
        response_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        }
        
        print("\nRespuesta:", response_data)
        return response_data
        
    except Exception as e:
        print(f"\nError en login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@app.post("/api/admins/", response_model=schemas.Admin)
async def create_admin(admin: schemas.AdminCreate, db: Session = Depends(get_db)):
    try:
        print("Creating admin with data:", admin.dict())
        
        # Verificar si ya existe un usuario con ese email
        db_user = crud.get_user_by_email(db, admin.email)
        if db_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Hashear la contraseña antes de guardarla
        hashed_password = get_password_hash(admin.password)
        
        # Crear el usuario admin
        db_admin = models.User(
            email=admin.email,
            username=admin.email,
            full_name=admin.full_name,
            hashed_password=hashed_password,
            role="admin",
            company_id=admin.company_id,
            is_active=True,
            status="activo",
            location="",
            phone=""
        )
        
        db.add(db_admin)
        db.commit()
        db.refresh(db_admin)
        print("Successfully created admin:", db_admin.__dict__)
        return db_admin
        
    except Exception as e:
        print(f"Error creating admin: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating admin: {str(e)}"
        )

@app.get("/api/projects", response_model=List[schemas.Project])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_projects(db)

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/api/projects", response_model=schemas.Project)
def create_project(
    project: schemas.ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_project(db=db, project=project)

@app.put("/api/projects/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: int, 
    project: schemas.ProjectUpdate, 
    db: Session = Depends(get_db)
):
    return crud.update_project(db=db, project_id=project_id, project=project)

# Rutas para usuarios/empleados
@app.get("/api/users/current", response_model=schemas.User)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db)):
    return crud.get_users(db)

# Rutas para estadísticas del dashboard
@app.get("/api/stats/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_dashboard_stats(db)

# Rutas para horas trabajadas
@app.get("/api/time-entries")
def get_time_entries(db: Session = Depends(get_db)):
    return crud.get_time_entries(db)

@app.post("/api/time-entries")
def create_time_entry(time_entry: schemas.TimeEntryCreate, db: Session = Depends(get_db)):
    return crud.create_time_entry(db, time_entry)

@app.post("/api/attendance/check-in")
async def check_in(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        data = await request.json()
        
        # Crear nuevo registro de asistencia
        attendance = models.Attendance(
            user_id=current_user.id,
            check_in=datetime.utcnow(),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            status=data.get('status', 'presente'),  # presente, ausente, tarde
            city=data.get('city', '')
        )
        
        # Actualizar el status del usuario
        current_user.status = data.get('status', 'presente')
        
        db.add(attendance)
        db.commit()
        
        return {
            "message": "Check-in successful",
            "attendance_id": attendance.id,
            "status": attendance.status,
            "check_in_time": attendance.check_in
        }
        
    except Exception as e:
        print(f"Error en check-in: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/attendance/recent", response_model=List[schemas.RecentActivity])
async def get_recent_activity(db: Session = Depends(get_db)):
    try:
        # Obtener las últimas 10 actividades
        recent = db.query(models.Attendance)\
            .join(models.User)\
            .order_by(models.Attendance.timestamp.desc())\
            .limit(10)\
            .all()
        
        # Formatear la respuesta
        return [{
            "user_name": activity.user.full_name,
            "status": activity.status,
            "timestamp": activity.timestamp.isoformat()
        } for activity in recent]
    except Exception as e:
        print(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recent activity: {str(e)}"
        )

@app.get("/test-login")
async def test_login(db: Session = Depends(get_db)):
    test_password = "admin123"
    user = db.query(models.User).filter(models.User.email == "admin@apizhe.com").first()
    if not user:
        return {"error": "User not found"}
    
    result = verify_password(test_password, user.hashed_password)
    return {
        "email": user.email,
        "stored_hash": user.hashed_hash,
        "password_matches": result
    }