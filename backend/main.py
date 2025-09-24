import os
import json
import shutil
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from passlib.context import CryptContext
from jose import JWTError, jwt
import pytz
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel, ValidationError
import models
from database import engine, get_db
import crud
import schemas
from typing import List, Optional
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from security import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    verify_password,
    get_password_hash
)
from notifications import scheduler, VAPID_PUBLIC_KEY, send_web_push
from utils import document_converter
from utils.document_converter import save_upload_file
import json
from models import UserStatus  # Agregar esta importación
from routers import nexus  # Agregar este import
from schemas import ProjectAssignmentRequest  # Agregar esta importación específica
from utils.document_converter import convert_to_pdf
import time

# Configurar zona horaria para México
MEXICO_TIMEZONE = pytz.timezone('America/Mexico_City')

def get_mexico_time():
    """Obtiene la hora actual en la zona horaria de México"""
    return datetime.now(MEXICO_TIMEZONE).replace(tzinfo=None)

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
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Desarrollo local
        "https://cargolux.lat",     # Producción
        "http://cargolux.lat",      # Producción (fallback)
        "https://www.cargolux.lat", # Producción con www
        "http://www.cargolux.lat"   # Producción con www (fallback)
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

@app.post("/api/employees/")
async def create_employee(
    request: Request,
    employee: str = Form(...),
    avatar: Optional[UploadFile] = File(None),
    contract: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Parsea los datos JSON del empleado
        employee_data = json.loads(employee)
        employee_schema = schemas.EmployeeCreate(**employee_data)
        
        # Procesa y guarda los archivos si existen
        avatar_url = None
        if avatar:
            avatar_url = await save_upload_file(avatar, "avatars")
        
        contract_url = None
        if contract:
            contract_url = await save_upload_file(contract, "contracts")
        
        # Crea el empleado en la base de datos
        return crud.create_employee(
            db=db,
            employee=employee_schema,
            avatar_url=avatar_url,
            contract_url=contract_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/employees/")
async def get_employees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print("=== GET EMPLOYEES ===")
        print(f"Current user: {current_user.email} {current_user.role}")
        
        # Obtener empleados con sus asignaciones de proyectos (técnicos y clientes)
        employees = db.query(models.User).filter(models.User.role.in_(["tecnico", "client"])).all()
        
        response_employees = []
        for employee in employees:
            # Obtener los proyectos asignados al empleado
            project_assignments = db.query(models.ProjectAssignment, models.Project).\
                join(models.Project, models.ProjectAssignment.project_id == models.Project.id).\
                filter(models.ProjectAssignment.user_id == employee.id).all()
            
            # Convertir el empleado a diccionario y agregar sus proyectos
            employee_dict = {
                "id": employee.id,
                "email": employee.email,
                "full_name": employee.full_name,
                "location": employee.location,
                "phone": employee.phone,
                "status": employee.status,
                "role": employee.role,
                "personal_info": employee.personal_info,
                "employment_info": employee.employment_info,
                "hr_info": employee.hr_info,
                "avatar": employee.avatar,
                "project": ", ".join([proj.name for _, proj in project_assignments]) if project_assignments else "Sin proyecto asignado"
            }
            response_employees.append(employee_dict)

        print(f"Found {len(employees)} employees (technicians and clients)")
        if employees:
            print(f"First employee example: {response_employees[0]}")
            
        return response_employees
        
    except Exception as e:
        print(f"Error in get_employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/employees/with-locations")
async def get_employees_with_locations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print("=== GET EMPLOYEES WITH LOCATIONS ===")
        
        # Obtener todos los técnicos
        employees = db.query(models.User).filter(models.User.role == "tecnico").all()
        
        response_employees = []
        for employee in employees:
            # Obtener la ubicación más reciente del empleado
            latest_attendance = db.query(models.Attendance).\
                filter(models.Attendance.user_id == employee.id).\
                order_by(models.Attendance.created_at.desc()).\
                first()
            
            # Obtener el proyecto más reciente si existe
            latest_time_entry = None
            if latest_attendance:
                latest_time_entry = db.query(models.TimeEntry).\
                    join(models.Project).\
                    filter(
                        models.TimeEntry.user_id == employee.id,
                        models.TimeEntry.start_time <= latest_attendance.check_in
                    ).\
                    order_by(models.TimeEntry.start_time.desc()).\
                    first()
            
            # Determinar coordenadas y tipo de marcador
            latitude = None
            longitude = None
            marker_type = None
            project_name = None
            photo_check_in = None
            photo_check_out = None
            check_in_time = None
            check_out_time = None
            
            if latest_attendance:
                if latest_attendance.check_out:
                    latitude = latest_attendance.check_out_latitude
                    longitude = latest_attendance.check_out_longitude
                    marker_type = 'check-out'
                    check_out_time = latest_attendance.check_out.strftime('%H:%M:%S') if latest_attendance.check_out else None
                else:
                    latitude = latest_attendance.check_in_latitude
                    longitude = latest_attendance.check_in_longitude
                    marker_type = 'check-in'
                check_in_time = latest_attendance.check_in.strftime('%H:%M:%S') if latest_attendance.check_in else None
                photo_check_in = latest_attendance.photo_check_in
                photo_check_out = latest_attendance.photo_check_out
                
                if latest_time_entry:
                    project_name = latest_time_entry.project.name
                    # Si la foto de time_entry existe y la de attendance no, usar la de time_entry como respaldo
                    if not photo_check_in:
                        photo_check_in = latest_time_entry.photo_check_in
                    if not photo_check_out:
                        photo_check_out = latest_time_entry.photo_check_out
            
            # Crear objeto del empleado con ubicación
            employee_dict = {
                "id": employee.id,
                "full_name": employee.full_name,
                "email": employee.email,
                "phone": employee.phone,
                "location": employee.location,
                "status": employee.status,
                "latitude": latitude,
                "longitude": longitude,
                "marker_type": marker_type,
                "project_name": project_name,
                "last_activity": latest_attendance.check_in if latest_attendance else None,
                "checkInTime": check_in_time,
                "checkOutTime": check_out_time,
                "photo_check_in": photo_check_in,
                "photo_check_out": photo_check_out
            }
            response_employees.append(employee_dict)

        print(f"Found {len(employees)} technicians with locations")
        return response_employees
        
    except Exception as e:
        print(f"Error in get_employees_with_locations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
    print(f"=== SUSCRIPCIÓN PUSH RECIBIDA ===")
    print(f"Employee ID: {employee_id}")
    print(f"Subscription data: {subscription.subscription_info}")
    
    employee = crud.get_employee(db, employee_id=employee_id)
    if employee is None:
        print(f"Empleado no encontrado con ID: {employee_id}")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    print(f"Empleado encontrado: {employee.email}")
    print(f"Suscripción anterior: {employee.push_subscription}")
    
    # Guardar como objeto JSON en lugar de string
    employee.push_subscription = subscription.subscription_info
    db.commit()
    
    print(f"Nueva suscripción guardada: {employee.push_subscription}")
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

        # Debug: Verificar todos los usuarios en la base de datos
        all_users = db.query(models.User).all()
        print(f"\nTotal de usuarios en BD: {len(all_users)}")
        for u in all_users:
            print(f"  - ID: {u.id}, Email: '{u.email}', Role: {u.role}")

        # Debug: Verificar la consulta específica
        print(f"\nBuscando usuario con email o username: '{form_data.username}'")
        
        # Buscar usuario por email o username
        user = db.query(models.User).filter(
            (models.User.email == form_data.username) | 
            (models.User.username == form_data.username)
        ).first()
        print(f"Usuario encontrado: {user is not None}")
        
        if not user:
            print(f"Usuario no encontrado: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/username or password"
            )
        
        print(f"Usuario encontrado: {user.email}")
        print(f"Hash almacenado: {user.hashed_password}")
        
        # Verificar contraseña
        is_valid = verify_password(form_data.password, user.hashed_password)
        print(f"¿Contraseña válida?: {is_valid}")
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/username or password"
            )
            
        # Crear tokens con datos del usuario
        access_token = create_access_token(
            data={
                "sub": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        )
        
        refresh_token = create_refresh_token(
            data={
                "sub": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        )
        
        # Preparar respuesta
        response_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
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

@app.post("/refresh")
async def refresh_token(refresh_data: dict, db: Session = Depends(get_db)):
    try:
        refresh_token = refresh_data.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token is required"
            )
        
        # Verificar el refresh token
        payload = verify_refresh_token(refresh_token)
        username = payload.get("sub")
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Obtener el usuario
        user = crud.get_user_by_email(db, email=username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Crear nuevo access token
        new_access_token = create_access_token(
            data={
                "sub": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token"
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

@app.get("/api/projects/", response_model=List[schemas.Project])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        projects = crud.get_projects(db)
        result = [
            {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "client": project.client,
                "start_date": project.start_date,
                "end_date": project.end_date,
                "progress": project.progress,
                "total_parts": project.total_parts,
                "completed_parts": project.completed_parts,
                "project_type": project.project_type,
                "description": project.description,
                "last_technician_name": project.last_technician_name,
                "last_technician_date": project.last_technician_date,
                "last_technician_action": project.last_technician_action,
                "documents": [
                    {
                        "name": doc.name,
                        "type": doc.type,
                        "url": doc.url
                    } for doc in project.documents
                ] if project.documents else [],
                "equipment": [eq.name for eq in project.equipment] if project.equipment else [],
                "assigned_to": [
                    assignment.user.full_name 
                    for assignment in project.assignments 
                    if assignment.user
                ],
                "location": {
                    "plant_name": project.location.plant_name if project.location else None,
                    "plant_address": project.location.plant_address if project.location else None,
                    "plant_coordinates": project.location.plant_coordinates if project.location else None,
                    "contact_name": project.location.contact_name if project.location else None,
                    "contact_phone": project.location.contact_phone if project.location else None,
                    "contact_email": project.location.contact_email if project.location else None,
                    "hotel_name": project.location.hotel_name if project.location else None,
                    "hotel_address": project.location.hotel_address if project.location else None,
                    "hotel_coordinates": project.location.hotel_coordinates if project.location else None,
                    "hotel_phone": project.location.hotel_phone if project.location else None
                } if project.location else None
            }
            for project in projects
        ]
        print("Sending projects:", result)  # Debug
        return result
    except Exception as e:
        print("Error getting projects:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        project = crud.get_project(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Transformar el proyecto de la misma manera que en la lista
        result = {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "client": project.client,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "progress": project.progress,
            "total_parts": project.total_parts,
            "completed_parts": project.completed_parts,
            "project_type": project.project_type,
            "description": project.description,
            "last_technician_name": project.last_technician_name,
            "last_technician_date": project.last_technician_date,
            "last_technician_action": project.last_technician_action,
            "documents": [
                {
                    "name": doc.name,
                    "type": doc.type,
                    "url": doc.url
                } for doc in project.documents
            ] if project.documents else [],
            "equipment": [eq.name for eq in project.equipment] if project.equipment else [],
            "assigned_to": [
                assignment.user.full_name 
                for assignment in project.assignments 
                if assignment.user
            ],
            "location": {
                "plant_name": project.location.plant_name if project.location else None,
                "plant_address": project.location.plant_address if project.location else None,
                "plant_coordinates": project.location.plant_coordinates if project.location else None,
                "contact_name": project.location.contact_name if project.location else None,
                "contact_phone": project.location.contact_phone if project.location else None,
                "contact_email": project.location.contact_email if project.location else None,
                "hotel_name": project.location.hotel_name if project.location else None,
                "hotel_address": project.location.hotel_address if project.location else None,
                "hotel_coordinates": project.location.hotel_coordinates if project.location else None,
                "hotel_phone": project.location.hotel_phone if project.location else None
            } if project.location else None
        }
        
        return result
    except Exception as e:
        print(f"Error getting project {project_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/")
async def create_project(
    request: Request,
    project: str = Form(...),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print("\n=== CREATE PROJECT ===")
        print("Files received:", [f.filename for f in files] if files else "No files")
        
        # Parse project data
        project_data = json.loads(project)
        print("Project data received:", project_data)
        
        # Process and save files if they exist
        document_urls = []
        if files:
            for file in files:
                if file is not None:
                    # Validar que sea un archivo PDF
                    if not file.content_type == "application/pdf":
                        raise HTTPException(
                            status_code=400,
                            detail=f"El archivo {file.filename} no es un PDF válido. Solo se permiten archivos PDF."
                        )
                    
                    print(f"\nProcessing PDF file: {file.filename}")
                    print(f"Content type: {file.content_type}")
                    file_url = await save_upload_file(file, "project_documents")
                    print(f"File saved with URL: {file_url}")
                    document_urls.append({
                        "name": file.filename,
                        "type": file.content_type,
                        "url": file_url,
                        "size": 0  # Agregar tamaño por defecto
                    })
                    print(f"Document added to list: {document_urls[-1]}")
        
        print("\nDocument URLs created:", document_urls)
        
        # Add documents to project data before creating schema
        if document_urls:
            project_data["documents"] = document_urls
            print("Updated project data with documents:", project_data)
            
        # Create schema with updated data including documents
        project_schema = schemas.ProjectCreate(**project_data)
        print("\nProject schema created with documents:", project_schema.documents)
        
        # Create project in database
        db_project = crud.create_project(db=db, project=project_schema)
        print("\nProject created in database. Project ID:", db_project.id)
        print("Documents in created project:", [doc.__dict__ for doc in db_project.documents] if db_project.documents else "No documents")
        
        # Verificar que los documentos se crearon
        if document_urls and not db_project.documents:
            print("\nDocuments not found in project, creating them manually")
            crud.create_project_documents(db, db_project.id, document_urls)
            db.refresh(db_project)
            print("Documents after manual creation:", [doc.__dict__ for doc in db_project.documents] if db_project.documents else "No documents")
        
        return db_project
        
    except ValidationError as e:
        print(f"\nValidation error: {str(e)}")
        headers = {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true"
        }
        raise HTTPException(
            status_code=422,
            detail=str(e),
            headers=headers
        )
    except Exception as e:
        print(f"\nGeneral error: {str(e)}")
        headers = {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true"
        }
        raise HTTPException(
            status_code=500,
            detail=str(e),
            headers=headers
        )

@app.put("/api/projects/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: int, 
    project: schemas.ProjectUpdate, 
    db: Session = Depends(get_db)
):
    return crud.update_project(db=db, project_id=project_id, project=project)

@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        result = crud.delete_project(db=db, project_id=project_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/api/time-entries/check-in")
async def register_check_in(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print("\n=== CHECK-IN PROCESS ===")
        data = await request.json()
        print(f"Received data: {data}")
        now = get_mexico_time()
        
        # Extraer la foto del data
        photo = data.get('photo')
        print(f"Photo received: {'Yes' if photo else 'No'}")
        
        # Crear registro de asistencia
        attendance = models.Attendance(
            user_id=current_user.id,
            check_in=now,
            check_in_latitude=data.get('latitude'),
            check_in_longitude=data.get('longitude'),
            photo_check_in=photo  # Guardar la foto de check-in en la columna correcta
        )
        print(f"Created attendance record for user {current_user.id}")
        
        # Actualizar estado del usuario
        current_user.status = data.get('status', 'presente')
        print(f"Updated user status to: {current_user.status}")
        
        # Actualizar estado del proyecto y crear time_entry
        project_id = data.get('projectId')
        print(f"Project ID received: {project_id}")
        time_entry = None
        
        if project_id:
            project = db.query(models.Project).filter(models.Project.id == project_id).first()
            print(f"Project found: {project is not None}")
            if project:
                print(f"Project name: {project.name}, status: {project.status}")
                if project.status != 'completado':
                    project.status = 'en-progreso'
                    project.last_technician_name = current_user.full_name
                    project.last_technician_date = now
                    project.last_technician_action = 'check-in'
                    
                    # Crear registro en time_entries
                    time_entry = models.TimeEntry(
                        user_id=current_user.id,
                        project_id=project_id,
                        start_time=now,
                        description=f"Check-in en {project.name}",
                        entry_type='automatic',  # Marcar como registro automático
                        photo_check_in=photo  # Guardar la foto de check-in en la columna correcta
                    )
                    db.add(time_entry)
                    print(f"Created time_entry for project {project_id}")
                else:
                    print("Project is completed, not creating time_entry")
            else:
                print(f"Project with ID {project_id} not found")
        else:
            print("No projectId provided, not creating time_entry")
        
        db.add(attendance)
        db.commit()
        print(f"Committed to database. Attendance ID: {attendance.id}, Time Entry ID: {time_entry.id if time_entry else None}")
        
        return {
            "message": "Check-in successful",
            "attendance_id": attendance.id,
            "time_entry_id": time_entry.id if time_entry else None,
            "user_status": current_user.status,
            "project_status": project.status if project_id and project else None
        }
        
    except Exception as e:
        print(f"Error en check-in: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/attendance/recent")
async def get_recent_activity(db: Session = Depends(get_db)):
    print("\n=== DEBUG RECENT ACTIVITY ===")
    activities = []
    
    # Obtener los últimos registros de asistencia
    recent_activities = db.query(
        models.Attendance,
        models.User
    ).join(
        models.User,
        models.Attendance.user_id == models.User.id
    ).order_by(
        models.Attendance.created_at.desc()
    ).limit(10).all()

    print(f"Found {len(recent_activities)} recent activities")

    # Procesar los registros
    for record in recent_activities:
        attendance, user = record
        
        print(f"\n--- Processing record ---")
        print(f"User: {user.full_name}")
        print(f"Check-in time: {attendance.check_in}")
        
        # Debug la consulta de time entry
        latest_time_entry = db.query(models.TimeEntry)\
            .join(models.Project)\
            .filter(
                models.TimeEntry.user_id == user.id,
                models.TimeEntry.start_time <= attendance.check_in
            )\
            .order_by(models.TimeEntry.start_time.desc())\
            .first()
            
        print(f"Time Entry found: {latest_time_entry is not None}")
        if latest_time_entry:
            print(f"Time Entry details:")
            print(f"- Project ID: {latest_time_entry.project_id}")
            print(f"- Project name: {latest_time_entry.project.name}")
            print(f"- Start time: {latest_time_entry.start_time}")
            print(f"- User ID: {latest_time_entry.user_id}")
        else:
            print("No time entry found for this attendance record")
        
        project_name = latest_time_entry.project.name if latest_time_entry else "Sin proyecto"
        
        # Agregar check-in si existe
        if attendance.check_in:
            activities.append({
                "user_name": user.full_name,
                "status": user.status,
                "timestamp": attendance.check_in,
                "type": "check-in",
                "latitude": attendance.check_in_latitude,
                "longitude": attendance.check_in_longitude,
                "city": user.location or "Ciudad Actual",
                "project_name": project_name
            })
        
        # Agregar check-out si existe
        if attendance.check_out:
            activities.append({
                "user_name": user.full_name,
                "status": "ausente",
                "timestamp": attendance.check_out,
                "type": "check-out",
                "latitude": attendance.check_out_latitude,
                "longitude": attendance.check_out_longitude,
                "city": user.location or "Ciudad Actual",
                "project_name": project_name
            })
    
    # Ordenar por timestamp descendente y limitar a 10
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:10]

@app.get("/test-login")
async def test_login(db: Session = Depends(get_db)):
    test_password = "admin123"
    user = db.query(models.User).filter(models.User.email == "admin@apizhe.com").first()
    if not user:
        return {"error": "User not found"}
    
    result = verify_password(test_password, user.hashed_password)
    return {
        "email": user.email,
        "stored_hash": user.hashed_password,
        "password_matches": result
    }

@app.put("/api/employees/{employee_id}", response_model=schemas.Employee)
async def update_employee(
    employee_id: int,
    employee: str = Form(...),
    avatar: Optional[UploadFile] = File(None),
    contract: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        employee_data = json.loads(employee)
        employee_schema = schemas.EmployeeCreate(**employee_data)
        
        avatar_url = None
        if avatar:
            avatar_url = await save_upload_file(avatar, "avatars")
        
        contract_url = None
        if contract:
            contract_url = await save_upload_file(contract, "contracts")
        
        return crud.update_employee(
            db=db,
            employee_id=employee_id,
            employee=employee_schema,
            avatar_url=avatar_url,
            contract_url=contract_url
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/employees/{employee_id}")
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        crud.delete_employee(db=db, employee_id=employee_id)
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def parse_employee_form(
    employee: str = Form(...),
) -> schemas.EmployeeCreate:
    try:
        employee_data = json.loads(employee)
        return schemas.EmployeeCreate(**employee_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data: {str(e)}")

@app.post("/api/time-entries/check-out")
async def register_check_out(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print("\n=== CHECK-OUT PROCESS ===")
        data = await request.json()
        now = get_mexico_time()
        
        # Extraer la foto del data
        photo = data.get('photo')
        print(f"Photo received for check-out: {'Yes' if photo else 'No'}")
        
        # Actualizar el registro de tiempo más reciente
        time_entry = db.query(models.TimeEntry)\
            .filter(models.TimeEntry.user_id == current_user.id)\
            .filter(models.TimeEntry.end_time.is_(None))\
            .order_by(models.TimeEntry.created_at.desc())\
            .first()
            
        if time_entry:
            time_entry.end_time = now
            time_entry.duration = (now - time_entry.start_time).total_seconds() / 3600.0
            if photo:
                time_entry.photo_check_out = photo  # Guardar la foto de check-out en la columna correcta
        
        # Actualizar el registro de asistencia más reciente
        attendance = db.query(models.Attendance)\
            .filter(models.Attendance.user_id == current_user.id)\
            .filter(models.Attendance.check_out.is_(None))\
            .order_by(models.Attendance.created_at.desc())\
            .first()
            
        if attendance:
            attendance.check_out = now
            attendance.check_out_latitude = data.get('latitude')
            attendance.check_out_longitude = data.get('longitude')
            if photo:
                attendance.photo_check_out = photo  # Guardar la foto de check-out en la columna correcta
        
        # Actualizar estado del usuario
        current_user.status = 'ausente'
        
        # Actualizar estado del proyecto
        project_id = data.get('projectId')
        print(f"Processing check-out for project ID: {project_id}")
        
        if project_id:
            project = db.query(models.Project).filter(models.Project.id == project_id).first()
            if project and project.status != 'completado':
                print(f"Current project status: {project.status}")
                
                # Verificar si hay otros técnicos activos en el proyecto
                print("\nChecking active technicians:")
                print(f"Project ID: {project_id}")
                print(f"Current user ID: {current_user.id}")
                
                project_assignments = db.query(models.ProjectAssignment)\
                    .filter(models.ProjectAssignment.project_id == project_id)\
                    .all()
                print(f"Total project assignments: {len(project_assignments)}")
                
                active_technicians = db.query(
                    models.User.id,
                    models.User.full_name,
                    models.User.status
                )\
                    .join(models.ProjectAssignment)\
                    .filter(
                        models.ProjectAssignment.project_id == project_id,
                        models.User.status == 'presente',
                        models.User.id != current_user.id
                    )\
                    .distinct()\
                    .all()
                
                print(f"Active technicians found: {len(active_technicians)}")
                if active_technicians:
                    print("Active technicians:")
                    for tech in active_technicians:
                        print(f"- {tech.full_name} (ID: {tech.id}, Status: {tech.status})")
                else:
                    print("No active technicians found")
                
                if not active_technicians:
                    print("Changing project status to 'activo'")
                    project.status = 'activo'
                else:
                    print(f"Project remains 'en-progreso' due to {len(active_technicians)} active technicians")
                
                project.last_technician_name = current_user.full_name
                project.last_technician_date = now
                project.last_technician_action = 'check-out'
        
        db.commit()
        print("Check-out process completed successfully")
        
        return {
            "message": "Check-out successful",
            "time_entry_id": time_entry.id if time_entry else None,
            "attendance_id": attendance.id if attendance else None,
            "duration": time_entry.duration if time_entry else None,
            "user_status": current_user.status,
            "project_status": project.status if project_id and project else None
        }
        
    except Exception as e:
        print(f"Error en check-out: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/time-entries/daily", response_model=List[schemas.TimeEntryResponse])
def get_daily_time_entries(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.now().date()
    entries = db.query(models.TimeEntry, models.Project)\
        .join(models.Project, models.TimeEntry.project_id == models.Project.id)\
        .filter(
            models.TimeEntry.user_id == current_user.id,
            func.date(models.TimeEntry.start_time) == today
        ).all()
    
    return [{
        "project_id": entry.TimeEntry.project_id,
        "project_name": entry.Project.name,
        "project_location": "Planta 3 - Línea A" if "APTIV" in entry.Project.name else "Planta Norte",  # Hardcodeado temporalmente
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "duration": entry.TimeEntry.duration or 0.0,
        "parts_completed": 0
    } for entry in entries]

@app.post("/api/time-entries/report")
async def submit_time_report(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        data = await request.json()
        now = get_mexico_time()
        
        # Crear registro de tiempo
        # El campo duration está en días, pero el frontend envía horas
        hours = data.get('hours', 0.0)
        duration_in_days = hours / 24  # Convertir horas a días
        
        time_entry = models.TimeEntry(
            user_id=current_user.id,
            project_id=data.get('projectId'),
            description=data.get('notes', data.get('description', '')),  # Usar notes si está disponible, sino description
            start_time=now,
            end_time=now,
            duration=duration_in_days,  # Guardar en días
            parts_completed=data.get('partsCompleted', 0),
            entry_type='manual'  # Marcar como reporte manual
        )
        
        db.add(time_entry)
        
        # Actualizar progreso del proyecto
        project = db.query(models.Project).filter(
            models.Project.id == data.get('projectId')
        ).first()
        
        if project:
            project.completed_parts += data.get('partsCompleted', 0)
            project.update_progress()
        
        db.commit()
        db.refresh(time_entry)
        
        return {
            "message": "Reporte enviado con éxito",
            "time_entry_id": time_entry.id,
            "project_progress": project.progress if project else 0
        }
    except Exception as e:
        print(f"Error al procesar reporte: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/time-entries/reports/today", response_model=List[schemas.TimeEntryReport])
async def get_today_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    entries = db.query(
        models.TimeEntry,
        models.Project,
        models.User
    ).join(
        models.Project, models.TimeEntry.project_id == models.Project.id
    ).join(
        models.User, models.TimeEntry.user_id == models.User.id
    ).filter(
        func.date(models.TimeEntry.start_time) == today,
        models.TimeEntry.entry_type == 'manual',  # Solo mostrar reportes manuales
        models.TimeEntry.end_time.isnot(None)     # Solo los que tienen checkout
    ).all()
    
    return [{
        "id": str(entry.TimeEntry.id),
        "technicianName": entry.User.full_name,
        "date": entry.TimeEntry.start_time,
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "hours": (entry.TimeEntry.duration or 0.0) * 24,  # Convertir días a horas
        "project": entry.Project.name,
        "description": entry.TimeEntry.description or "",
        "status": "pending"  # Por ahora todos serán pending
    } for entry in entries]

@app.get("/api/time-entries/reports/current-fortnight", response_model=List[schemas.TimeEntryReport])
async def get_current_fortnight_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    # Calcular inicio de quincena (día 1 o 16 del mes)
    if today.day <= 15:
        start_date = today.replace(day=1)
        end_date = today.replace(day=15)
    else:
        start_date = today.replace(day=16)
        end_date = today
    
    entries = db.query(
        models.TimeEntry,
        models.Project,
        models.User
    ).join(
        models.Project, models.TimeEntry.project_id == models.Project.id
    ).join(
        models.User, models.TimeEntry.user_id == models.User.id
    ).filter(
        func.date(models.TimeEntry.start_time) >= start_date,
        func.date(models.TimeEntry.start_time) <= end_date,
        models.TimeEntry.entry_type == 'manual',
        models.TimeEntry.end_time.isnot(None)
    ).all()
    
    return [{
        "id": str(entry.TimeEntry.id),
        "technicianName": entry.User.full_name,
        "date": entry.TimeEntry.start_time,
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "hours": (entry.TimeEntry.duration or 0.0) * 24,
        "project": entry.Project.name,
        "description": entry.TimeEntry.description or "",
        "status": "pending"
    } for entry in entries]

@app.get("/api/time-entries/reports/previous-fortnight", response_model=List[schemas.TimeEntryReport])
async def get_previous_fortnight_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    # Calcular quincena anterior
    if today.day <= 15:
        # Si estamos en la primera quincena, la anterior es la segunda del mes pasado
        if today.month == 1:
            prev_month = 12
            prev_year = today.year - 1
        else:
            prev_month = today.month - 1
            prev_year = today.year
        start_date = datetime(prev_year, prev_month, 16).date()
        end_date = datetime(prev_year, prev_month, 31).date()
    else:
        # Si estamos en la segunda quincena, la anterior es la primera del mismo mes
        start_date = today.replace(day=1)
        end_date = today.replace(day=15)
    
    entries = db.query(
        models.TimeEntry,
        models.Project,
        models.User
    ).join(
        models.Project, models.TimeEntry.project_id == models.Project.id
    ).join(
        models.User, models.TimeEntry.user_id == models.User.id
    ).filter(
        func.date(models.TimeEntry.start_time) >= start_date,
        func.date(models.TimeEntry.start_time) <= end_date,
        models.TimeEntry.entry_type == 'manual',
        models.TimeEntry.end_time.isnot(None)
    ).all()
    
    return [{
        "id": str(entry.TimeEntry.id),
        "technicianName": entry.User.full_name,
        "date": entry.TimeEntry.start_time,
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "hours": (entry.TimeEntry.duration or 0.0) * 24,
        "project": entry.Project.name,
        "description": entry.TimeEntry.description or "",
        "status": "pending"
    } for entry in entries]

@app.get("/api/time-entries/reports/current-month", response_model=List[schemas.TimeEntryReport])
async def get_current_month_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    start_date = today.replace(day=1)
    end_date = today
    
    entries = db.query(
        models.TimeEntry,
        models.Project,
        models.User
    ).join(
        models.Project, models.TimeEntry.project_id == models.Project.id
    ).join(
        models.User, models.TimeEntry.user_id == models.User.id
    ).filter(
        func.date(models.TimeEntry.start_time) >= start_date,
        func.date(models.TimeEntry.start_time) <= end_date,
        models.TimeEntry.entry_type == 'manual',
        models.TimeEntry.end_time.isnot(None)
    ).all()
    
    return [{
        "id": str(entry.TimeEntry.id),
        "technicianName": entry.User.full_name,
        "date": entry.TimeEntry.start_time,
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "hours": (entry.TimeEntry.duration or 0.0) * 24,
        "project": entry.Project.name,
        "description": entry.TimeEntry.description or "",
        "status": "pending"
    } for entry in entries]

@app.get("/api/time-entries/reports/previous-month", response_model=List[schemas.TimeEntryReport])
async def get_previous_month_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    # Calcular mes anterior
    if today.month == 1:
        prev_month = 12
        prev_year = today.year - 1
    else:
        prev_month = today.month - 1
        prev_year = today.year
    
    start_date = datetime(prev_year, prev_month, 1).date()
    end_date = datetime(prev_year, prev_month, 31).date()
    
    entries = db.query(
        models.TimeEntry,
        models.Project,
        models.User
    ).join(
        models.Project, models.TimeEntry.project_id == models.Project.id
    ).join(
        models.User, models.TimeEntry.user_id == models.User.id
    ).filter(
        func.date(models.TimeEntry.start_time) >= start_date,
        func.date(models.TimeEntry.start_time) <= end_date,
        models.TimeEntry.entry_type == 'manual',
        models.TimeEntry.end_time.isnot(None)
    ).all()
    
    return [{
        "id": str(entry.TimeEntry.id),
        "technicianName": entry.User.full_name,
        "date": entry.TimeEntry.start_time,
        "start_time": entry.TimeEntry.start_time,
        "end_time": entry.TimeEntry.end_time,
        "hours": (entry.TimeEntry.duration or 0.0) * 24,
        "project": entry.Project.name,
        "description": entry.TimeEntry.description or "",
        "status": "pending"
    } for entry in entries]

@app.post("/api/time-entries/close-day")
async def close_day(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print("Intentando cerrar el día...")  # Debug
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden cerrar el día")
    
    today = datetime.now().date()
    
    try:
        # Crear o actualizar el estado del día
        day_status = db.query(models.DayStatus).filter(
            func.date(models.DayStatus.date) == today
        ).first()
        
        if not day_status:
            day_status = models.DayStatus(
                date=today,
                is_closed=True,
                closed_by=current_user.id,
                closed_at=datetime.now()
            )
            db.add(day_status)
        else:
            day_status.is_closed = True
            day_status.closed_by = current_user.id
            day_status.closed_at = datetime.now()
        
        db.commit()
        print("Día cerrado exitosamente")  # Debug
        return {"message": "Día cerrado exitosamente"}
        
    except Exception as e:
        print(f"Error al cerrar el día: {str(e)}")  # Debug
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/time-entries/open-day")
async def open_day(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print("Intentando abrir el día...")  # Debug
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden abrir el día")
    
    today = datetime.now().date()
    
    try:
        # Buscar el estado del día actual
        day_status = db.query(models.DayStatus).filter(
            func.date(models.DayStatus.date) == today
        ).first()
        
        if day_status:
            # Actualizar el estado del día a abierto
            day_status.is_closed = False
            day_status.opened_by = current_user.id
            day_status.opened_at = datetime.now()
            db.commit()
            print("Día abierto exitosamente")  # Debug
            return {"message": "Día abierto exitosamente"}
        else:
            # Si no existe un registro de estado del día, crear uno abierto
            day_status = models.DayStatus(
                date=today,
                is_closed=False,
                opened_by=current_user.id,
                opened_at=datetime.now()
            )
            db.add(day_status)
            db.commit()
            print("Día abierto exitosamente (nuevo registro)")  # Debug
            return {"message": "Día abierto exitosamente"}
        
    except Exception as e:
        print(f"Error al abrir el día: {str(e)}")  # Debug
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/time-entries/day-status")
async def get_day_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = datetime.now().date()
    day_status = db.query(models.DayStatus).filter(
        func.date(models.DayStatus.date) == today
    ).first()
    
    return {
        "is_closed": day_status.is_closed if day_status else False,
        "closed_at": day_status.closed_at if day_status else None,
        "closed_by": day_status.user.full_name if day_status and day_status.user else None
    }

@app.get("/api/users/technicians/count")
async def get_technicians_count(db: Session = Depends(get_db)):
    total = db.query(models.User).filter(models.User.role == "tecnico").count()
    return {"total": total}

@app.post("/api/employees/{employee_id}/assign-project")
async def assign_project_to_employee(
    employee_id: int,
    project_data: ProjectAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"Recibiendo asignación - employee_id: {employee_id}")
        print(f"Project data recibido: {project_data.dict()}")
        print(f"Project ID: {project_data.project_id}")
        
        # Verificar que el empleado existe
        employee = db.query(models.User).filter(models.User.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == project_data.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_data.project_id} not found")

        # Verificar si ya existe la asignación
        existing_assignment = db.query(models.ProjectAssignment).filter(
            models.ProjectAssignment.user_id == employee_id,
            models.ProjectAssignment.project_id == project_data.project_id
        ).first()

        # Si es una desasignación
        if project_data.action == "unassign":
            if existing_assignment:
                db.delete(existing_assignment)
                db.commit()
                return {
                    "message": f"Proyecto {project.name} desasignado exitosamente",
                    "assignment_id": None,
                    "action": "unassign"
                }
            return {
                "message": "No existe tal asignación",
                "assignment_id": None,
                "action": "unassign"
            }

        # Si es una asignación
        if existing_assignment:
            return {
                "message": f"El técnico ya está asignado al proyecto {project.name}",
                "assignment_id": existing_assignment.id,
                "already_exists": True,
                "action": "assign"
            }
        else:
            # Crear nueva asignación
            new_assignment = models.ProjectAssignment(
                user_id=employee_id,
                project_id=project_data.project_id,
                role="tecnico",
                created_at=datetime.now()
            )
            
            db.add(new_assignment)
            db.commit()
            
            return {
                "message": "Project assigned successfully", 
                "assignment_id": new_assignment.id,
                "already_exists": False,
                "action": "assign"
            }
    except Exception as e:
        print(f"Error general: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")

@app.post("/api/time-entries/send-reminder")
async def send_time_report_reminder(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Obtener todos los técnicos
        technicians = db.query(models.User).filter(models.User.role == "tecnico").all()
        
        # Obtener los técnicos que ya reportaron hoy
        today = datetime.now().date()
        reported_technicians = db.query(models.TimeEntry.user_id)\
            .filter(func.date(models.TimeEntry.start_time) == today)\
            .distinct()\
            .all()
        reported_ids = [tech[0] for tech in reported_technicians]
        
        # Filtrar técnicos que no han reportado
        pending_technicians = [tech for tech in technicians if tech.id not in reported_ids]
        
        # Enviar notificación push a cada técnico pendiente
        successful_notifications = 0
        for technician in pending_technicians:
            if technician.push_subscription:
                try:
                    subscription = technician.push_subscription
                    
                    # Asegurar que subscription sea un diccionario
                    if isinstance(subscription, str):
                        try:
                            subscription = json.loads(subscription)
                        except json.JSONDecodeError as e:
                            print(f"Error parsing subscription JSON for {technician.email}: {e}")
                            continue
                    
                    # Verificar que subscription tenga la estructura correcta
                    if not isinstance(subscription, dict) or 'endpoint' not in subscription:
                        print(f"Invalid subscription format for {technician.email}: {subscription}")
                        continue
                    
                    print(f"Enviando notificación a {technician.email} con subscription: {subscription}")
                    
                    send_web_push(
                        subscription_info=subscription,
                        message_body={
                            "title": "Recordatorio de Reporte de Horas",
                            "body": "No hemos recibido tu reporte de horas. El día está por cerrarse.",
                            "tag": str(time.time())  # Tag único para cada notificación
                        }
                    )
                    successful_notifications += 1
                    print(f"Notificación enviada exitosamente a {technician.email}")
                    
                except Exception as e:
                    print(f"Error enviando notificación a {technician.email}: {str(e)}")
                    print(f"Subscription data: {technician.push_subscription}")
        
        return {
            "success": True,
            "message": f"Recordatorios enviados a {successful_notifications} de {len(pending_technicians)} técnicos pendientes",
            "pending_count": len(pending_technicians),
            "successful_count": successful_notifications
        }
        
    except Exception as e:
        print(f"Error en send_time_report_reminder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Agregar el router de nexus
app.include_router(
    nexus.router,
    prefix="/api/projects/update",
    tags=["projects"]
)

# Endpoint para crear escaneos
@app.post("/api/scanned-codes/", response_model=schemas.ScannedCode)
async def create_scanned_code(
    scanned_code: schemas.ScannedCodeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== CREATE SCANNED CODE ===")
        print(f"User: {current_user.full_name}")
        print(f"Code: {scanned_code.code}")
        print(f"Type: {scanned_code.type}")
        print(f"Source: {scanned_code.source}")
        print(f"Project ID: {scanned_code.project_id}")
        print(f"Location: {scanned_code.latitude}, {scanned_code.longitude}")
        
        # Crear el registro de escaneo
        db_scanned_code = models.ScannedCode(
            code=scanned_code.code,
            type=scanned_code.type,
            source=scanned_code.source,
            project_id=scanned_code.project_id,
            user_id=current_user.id,
            latitude=scanned_code.latitude,
            longitude=scanned_code.longitude,
            timestamp=scanned_code.timestamp
        )
        
        db.add(db_scanned_code)
        db.commit()
        db.refresh(db_scanned_code)
        
        # Obtener el nombre del proyecto si existe
        if scanned_code.project_id:
            project = db.query(models.Project).filter(models.Project.id == scanned_code.project_id).first()
            if project:
                db_scanned_code.project_name = project.name
        
        print(f"Scanned code created with ID: {db_scanned_code.id}")
        
        return db_scanned_code
        
    except Exception as e:
        print(f"Error creating scanned code: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener escaneos del usuario actual
@app.get("/api/scanned-codes/", response_model=List[schemas.ScannedCode])
async def get_user_scanned_codes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET USER SCANNED CODES ===")
        print(f"User: {current_user.full_name}")
        
        # Obtener escaneos del usuario con información del proyecto
        scanned_codes = db.query(models.ScannedCode).\
            filter(models.ScannedCode.user_id == current_user.id).\
            order_by(models.ScannedCode.created_at.desc()).\
            all()
        
        # Agregar nombres de proyectos
        for code in scanned_codes:
            if code.project_id:
                project = db.query(models.Project).filter(models.Project.id == code.project_id).first()
                if project:
                    code.project_name = project.name
        
        print(f"Found {len(scanned_codes)} scanned codes for user")
        
        return scanned_codes
        
    except Exception as e:
        print(f"Error getting scanned codes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener escaneos de hoy del usuario actual
@app.get("/api/scanned-codes/today", response_model=List[schemas.ScannedCode])
async def get_today_scanned_codes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET TODAY SCANNED CODES ===")
        print(f"User: {current_user.full_name}")
        
        today = datetime.now().date()
        
        # Obtener escaneos de hoy del usuario
        scanned_codes = db.query(models.ScannedCode).\
            filter(
                models.ScannedCode.user_id == current_user.id,
                func.date(models.ScannedCode.timestamp) == today
            ).\
            order_by(models.ScannedCode.created_at.desc()).\
            all()
        
        # Agregar nombres de proyectos
        for code in scanned_codes:
            if code.project_id:
                project = db.query(models.Project).filter(models.Project.id == code.project_id).first()
                if project:
                    code.project_name = project.name
        
        print(f"Found {len(scanned_codes)} scanned codes for today")
        
        return scanned_codes
        
    except Exception as e:
        print(f"Error getting today's scanned codes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener escaneos por proyecto (para mapas)
@app.get("/scanned-codes/project/{project_id}", response_model=List[schemas.ScannedCode])
async def get_scanned_codes_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET SCANNED CODES BY PROJECT ===")
        print(f"Project ID: {project_id}")
        print(f"User: {current_user.full_name}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Proyecto con ID {project_id} no encontrado"
            )
        
        # Obtener escaneos del proyecto con coordenadas
        scanned_codes = db.query(models.ScannedCode).\
            filter(
                models.ScannedCode.project_id == project_id,
                models.ScannedCode.latitude.isnot(None),
                models.ScannedCode.longitude.isnot(None)
            ).\
            order_by(models.ScannedCode.timestamp.desc()).\
            all()
        
        # Agregar nombres de proyectos
        for code in scanned_codes:
            code.project_name = project.name
        
        print(f"Found {len(scanned_codes)} scanned codes with coordinates for project {project_id}")
        
        return scanned_codes
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting scanned codes by project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener datos de panasonic_flow por proyecto (para mapas)
@app.get("/api/panasonic-flow/project/{project_id}", response_model=List[schemas.PanasonicFlow])
async def get_panasonic_flow_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET PANASONIC FLOW BY PROJECT ===")
        print(f"Project ID: {project_id}")
        print(f"User: {current_user.full_name}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Proyecto con ID {project_id} no encontrado"
            )
        
        # Obtener datos de panasonic_flow del proyecto con relación al usuario
        panasonic_data = db.query(models.PanasonicFlow).\
            join(models.User, models.PanasonicFlow.user_id == models.User.id).\
            filter(
                models.PanasonicFlow.project_id == project_id
            ).\
            order_by(models.PanasonicFlow.timestamp.desc()).\
            all()
        
        # Agregar nombres de proyectos
        for data in panasonic_data:
            data.project_name = project.name
        
        print(f"Found {len(panasonic_data)} panasonic flow records for project {project_id}")
        
        return panasonic_data
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting panasonic flow by project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para guardar códigos escaneados en panasonic_flow
@app.post("/api/panasonic-flow", response_model=schemas.PanasonicFlowResponse)
async def create_panasonic_flow(
    flow_data: schemas.PanasonicFlowCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== CREATE PANASONIC FLOW ===")
        print(f"User: {current_user.full_name}")
        print(f"Box Code: {flow_data.boxcode}")
        print(f"Battery Code: {flow_data.batterycode}")
        print(f"Project ID: {flow_data.project_id}")
        print(f"Category: {flow_data.categorie}")

        # Crear el registro de flujo
        db_flow = models.PanasonicFlow(
            boxcode=flow_data.boxcode,
            boxcode2=flow_data.boxcode2,
            batterycode=flow_data.batterycode,
            batterycode2=flow_data.batterycode2,
            batterycode3=flow_data.batterycode3,
            batterycode4=flow_data.batterycode4,
            project_id=flow_data.project_id,
            user_id=current_user.id,
            latitude=flow_data.latitude,
            longitude=flow_data.longitude,
            lat2=flow_data.lat2,
            lon2=flow_data.lon2,
            lat3=flow_data.lat3,
            lon3=flow_data.lon3,
            lat4=flow_data.lat4,
            lon4=flow_data.lon4,
            timestamp=flow_data.timestamp,
            status=flow_data.status,
            categorie=flow_data.categorie,
            boxtimestamp=flow_data.boxtimestamp
        )

        db.add(db_flow)
        db.commit()
        db.refresh(db_flow)

        print(f"Panasonic flow saved with ID: {db_flow.id}")

        return db_flow

    except Exception as e:
        print(f"Error creating panasonic flow: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-battery-categories")
async def update_battery_categories(
    category_data: schemas.BatteryCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== UPDATE BATTERY CATEGORIES ===")
        print(f"User: {current_user.full_name}")
        print(f"Battery Code 1: {category_data.batteryCode1}")
        print(f"Category 1: {category_data.category1}")
        print(f"Battery Code 2: {category_data.batteryCode2}")
        print(f"Category 2: {category_data.category2}")
        print(f"Project ID: {category_data.projectId}")
        print(f"Session ID: {category_data.sessionId}")

        # Buscar el registro de panasonic_flow que coincida con los códigos de baterías
        flow_record = db.query(models.PanasonicFlow).filter(
            models.PanasonicFlow.batterycode == category_data.batteryCode1,
            models.PanasonicFlow.batterycode2 == category_data.batteryCode2,
            models.PanasonicFlow.project_id == category_data.projectId,
            models.PanasonicFlow.user_id == current_user.id
        ).first()

        if not flow_record:
            raise HTTPException(status_code=404, detail="No se encontró el registro de flujo con los códigos de baterías especificados")

        # Actualizar las categorías
        flow_record.categorie = f"{category_data.category1},{category_data.category2}"
        
        db.commit()
        db.refresh(flow_record)

        print(f"Battery categories updated successfully for flow ID: {flow_record.id}")
        print(f"New categories: {flow_record.categorie}")

        return {"message": "Categorías actualizadas correctamente", "categorie": flow_record.categorie}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating battery categories: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para guardar respuestas de calidad
@app.post("/api/quality-check", response_model=schemas.PanasonicQualityCheckResponse)
async def create_quality_check(
    quality_data: schemas.PanasonicQualityCheckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== CREATE QUALITY CHECK ===")
        print(f"User: {current_user.full_name}")
        print(f"Session ID: {quality_data.session_id}")
        print(f"Project ID: {quality_data.project_id}")
        print(f"Phase: {quality_data.phase}")
        print(f"Raw data received: {quality_data}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == quality_data.project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Proyecto con ID {quality_data.project_id} no encontrado"
            )
        
        # Verificar si ya existe un registro para esta sesión
        existing_check = db.query(models.PanasonicQualityCheck).filter(
            models.PanasonicQualityCheck.session_id == quality_data.session_id
        ).first()
        
        if existing_check:
            # Actualizar registro existente
            for field, value in quality_data.dict(exclude_unset=True).items():
                if hasattr(existing_check, field):
                    setattr(existing_check, field, value)
            existing_check.timestamp = datetime.utcnow()
            db.commit()
            db.refresh(existing_check)
            print(f"Quality check updated with ID: {existing_check.id}")
            return existing_check
        else:
            # Crear nuevo registro de calidad
            db_quality_check = models.PanasonicQualityCheck(
                user_id=current_user.id,
                project_id=quality_data.project_id,
                session_id=quality_data.session_id,
                phase=quality_data.phase,
                timestamp=datetime.utcnow(),
                # Respuestas de categorización (1-14)
                respuesta1=quality_data.respuesta1,
                respuesta2=quality_data.respuesta2,
                escaneo2=quality_data.escaneo2,
                respuesta3=quality_data.respuesta3,
                respuesta4=quality_data.respuesta4,
                respuesta5=quality_data.respuesta5,
                respuesta6=quality_data.respuesta6,
                respuesta7=quality_data.respuesta7,
                respuesta8=quality_data.respuesta8,
                respuesta9=quality_data.respuesta9,
                escaneo9=quality_data.escaneo9,
                respuesta10=quality_data.respuesta10,
                respuesta11=quality_data.respuesta11,
                respuesta12=quality_data.respuesta12,
                respuesta13=quality_data.respuesta13,
                respuesta14=quality_data.respuesta14,
                # Respuestas de reempacado (15-21)
                respuesta15=quality_data.respuesta15,
                escaneo15=quality_data.escaneo15,
                respuesta16=quality_data.respuesta16,
                respuesta17=quality_data.respuesta17,
                escaneo17=quality_data.escaneo17,
                respuesta18=quality_data.respuesta18,
                respuesta19=quality_data.respuesta19,
                respuesta20=quality_data.respuesta20,
                respuesta21=quality_data.respuesta21,
                # Campos para categorías de baterías (pregunta 14)
                battery1_code=quality_data.battery1_code,
                battery1_category=quality_data.battery1_category,
                battery2_code=quality_data.battery2_code,
                battery2_category=quality_data.battery2_category
            )
            
            db.add(db_quality_check)
            db.commit()
            db.refresh(db_quality_check)
            
            print(f"Quality check saved with ID: {db_quality_check.id}")
            return db_quality_check
        
    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        raise he
    except ValidationError as ve:
        print(f"Validation Error: {ve}")
        raise HTTPException(status_code=422, detail=f"Error de validación: {ve}")
    except Exception as e:
        print(f"Error creating quality check: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener respuestas de calidad por sesión
@app.get("/api/quality-check/session/{session_id}", response_model=schemas.PanasonicQualityCheckResponse)
async def get_quality_check_by_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        quality_check = db.query(models.PanasonicQualityCheck).filter(
            models.PanasonicQualityCheck.session_id == session_id
        ).first()
        
        if not quality_check:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron respuestas de calidad para la sesión {session_id}"
            )
        
        return quality_check
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting quality check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para guardar checkpoints
@app.post("/api/panasonic-checkpoints", response_model=schemas.PanasonicCheckpointResponse)
async def create_panasonic_checkpoint(
    checkpoint_data: schemas.PanasonicCheckpointCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== CREATE PANASONIC CHECKPOINT ===")
        print(f"User: {current_user.full_name}")
        print(f"Session ID: {checkpoint_data.session_id}")
        print(f"Checkpoint Type: {checkpoint_data.checkpoint_type}")
        print(f"Checkpoint Number: {checkpoint_data.checkpoint_number}")
        print(f"Scanned Code: {checkpoint_data.scanned_code}")
        print(f"Coordinates: {checkpoint_data.latitude}, {checkpoint_data.longitude}")
        print(f"Project ID: {checkpoint_data.project_id}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == checkpoint_data.project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Proyecto con ID {checkpoint_data.project_id} no encontrado"
            )
        
        # Crear el registro de checkpoint
        db_checkpoint = models.PanasonicCheckpoint(
            session_id=checkpoint_data.session_id,
            checkpoint_type=checkpoint_data.checkpoint_type,
            checkpoint_number=checkpoint_data.checkpoint_number,
            scanned_code=checkpoint_data.scanned_code,
            scan_order=checkpoint_data.scan_order,
            latitude=checkpoint_data.latitude,
            longitude=checkpoint_data.longitude,
            accuracy=checkpoint_data.accuracy,
            project_id=checkpoint_data.project_id,
            user_id=current_user.id,
            status=checkpoint_data.status,
            categorie=checkpoint_data.categorie,
            phase=checkpoint_data.phase,
            # Campos adicionales para los 7 checkpoints extra
            checkpoint_7_storage_exit=checkpoint_data.checkpoint_7_storage_exit,
            lat_7_storage_exit=checkpoint_data.lat_7_storage_exit,
            lon_7_storage_exit=checkpoint_data.lon_7_storage_exit,
            checkpoint_8_cd_arrival=checkpoint_data.checkpoint_8_cd_arrival,
            lat_8_cd_arrival=checkpoint_data.lat_8_cd_arrival,
            lon_8_cd_arrival=checkpoint_data.lon_8_cd_arrival,
            checkpoint_8_cde_exit=checkpoint_data.checkpoint_8_cde_exit,
            lat_8_cde_exit=checkpoint_data.lat_8_cde_exit,
            lon_8_cde_exit=checkpoint_data.lon_8_cde_exit,
            checkpoint_10_e_arrival=checkpoint_data.checkpoint_10_e_arrival,
            lat_10_e_arrival=checkpoint_data.lat_10_e_arrival,
            lon_10_e_arrival=checkpoint_data.lon_10_e_arrival,
            checkpoint_11_e_arrival=checkpoint_data.checkpoint_11_e_arrival,
            lat_11_e_arrival=checkpoint_data.lat_11_e_arrival,
            lon_11_e_arrival=checkpoint_data.lon_11_e_arrival,
            checkpoint_11_e_exit=checkpoint_data.checkpoint_11_e_exit,
            lat_11_e_exit=checkpoint_data.lat_11_e_exit,
            lon_11_e_exit=checkpoint_data.lon_11_e_exit,
            checkpoint_ab_exit=checkpoint_data.checkpoint_ab_exit,
            lat_ab_exit=checkpoint_data.lat_ab_exit,
            lon_ab_exit=checkpoint_data.lon_ab_exit
        )
        
        db.add(db_checkpoint)
        db.commit()
        db.refresh(db_checkpoint)
        
        print(f"Panasonic checkpoint saved with ID: {db_checkpoint.id}")
        return db_checkpoint
        
    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        raise he
    except ValidationError as ve:
        print(f"Validation Error: {ve}")
        raise HTTPException(status_code=422, detail=f"Error de validación: {ve}")
    except Exception as e:
        print(f"Error creating panasonic checkpoint: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener checkpoints por sesión
@app.get("/api/panasonic-checkpoints/session/{session_id}", response_model=List[schemas.PanasonicCheckpointResponse])
async def get_panasonic_checkpoints_by_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        checkpoints = db.query(models.PanasonicCheckpoint).filter(
            models.PanasonicCheckpoint.session_id == session_id
        ).order_by(models.PanasonicCheckpoint.checkpoint_number).all()
        
        return checkpoints
        
    except Exception as e:
        print(f"Error getting panasonic checkpoints: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener checkpoints por proyecto
@app.get("/api/panasonic-checkpoints/project/{project_id}", response_model=List[schemas.PanasonicCheckpointResponse])
async def get_panasonic_checkpoints_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Obtener checkpoints con información del usuario
        checkpoints = db.query(models.PanasonicCheckpoint, models.User).\
            join(models.User, models.PanasonicCheckpoint.user_id == models.User.id).\
            filter(
                models.PanasonicCheckpoint.project_id == project_id
            ).\
            order_by(models.PanasonicCheckpoint.timestamp.desc()).\
            all()
        
        # Crear respuesta con información del usuario incluida
        result = []
        for checkpoint, user in checkpoints:
            checkpoint_dict = {
                "id": checkpoint.id,
                "session_id": checkpoint.session_id,
                "checkpoint_type": checkpoint.checkpoint_type,
                "checkpoint_number": checkpoint.checkpoint_number,
                "scanned_code": checkpoint.scanned_code,
                "scan_order": checkpoint.scan_order,
                "latitude": checkpoint.latitude,
                "longitude": checkpoint.longitude,
                "accuracy": checkpoint.accuracy,
                "timestamp": checkpoint.timestamp,
                "user_id": checkpoint.user_id,
                "project_id": checkpoint.project_id,
                "status": checkpoint.status,
                "categorie": checkpoint.categorie,
                "phase": checkpoint.phase,
                "checkpoint_7_storage_exit": checkpoint.checkpoint_7_storage_exit,
                "lat_7_storage_exit": checkpoint.lat_7_storage_exit,
                "lon_7_storage_exit": checkpoint.lon_7_storage_exit,
                "checkpoint_8_cd_arrival": checkpoint.checkpoint_8_cd_arrival,
                "lat_8_cd_arrival": checkpoint.lat_8_cd_arrival,
                "lon_8_cd_arrival": checkpoint.lon_8_cd_arrival,
                "checkpoint_8_cde_exit": checkpoint.checkpoint_8_cde_exit,
                "lat_8_cde_exit": checkpoint.lat_8_cde_exit,
                "lon_8_cde_exit": checkpoint.lon_8_cde_exit,
                "checkpoint_10_e_arrival": checkpoint.checkpoint_10_e_arrival,
                "lat_10_e_arrival": checkpoint.lat_10_e_arrival,
                "lon_10_e_arrival": checkpoint.lon_10_e_arrival,
                "checkpoint_11_e_arrival": checkpoint.checkpoint_11_e_arrival,
                "lat_11_e_arrival": checkpoint.lat_11_e_arrival,
                "lon_11_e_arrival": checkpoint.lon_11_e_arrival,
                "checkpoint_11_e_exit": checkpoint.checkpoint_11_e_exit,
                "lat_11_e_exit": checkpoint.lat_11_e_exit,
                "lon_11_e_exit": checkpoint.lon_11_e_exit,
                "checkpoint_ab_exit": checkpoint.checkpoint_ab_exit,
                "lat_ab_exit": checkpoint.lat_ab_exit,
                "lon_ab_exit": checkpoint.lon_ab_exit,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email
                }
            }
            result.append(checkpoint_dict)
        
        return result
        
    except Exception as e:
        print(f"Error getting panasonic checkpoints by project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener quality questions por proyecto
@app.get("/api/panasonic-quality-questions/project/{project_id}", response_model=List[schemas.PanasonicQualityCheckResponse])
async def get_panasonic_quality_questions_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        quality_questions = db.query(models.PanasonicQualityCheck).filter(
            models.PanasonicQualityCheck.project_id == project_id
        ).order_by(models.PanasonicQualityCheck.timestamp.desc()).all()
        
        return quality_questions
        
    except Exception as e:
        print(f"Error getting panasonic quality questions by project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attendance/current-status")
async def get_current_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Obtener el último registro de asistencia del día
        today = datetime.now().date()
        latest_attendance = db.query(models.Attendance)\
            .filter(
                models.Attendance.user_id == current_user.id,
                func.date(models.Attendance.check_in) == today
            )\
            .order_by(models.Attendance.check_in.desc())\
            .first()
            
        if not latest_attendance:
            return {
                "is_checked_in": False,
                "active_project": None,
                "check_in_time": None,
                "status": current_user.status
            }
            
        # Si hay check-in pero no check-out, el usuario está activo
        is_checked_in = latest_attendance.check_in and not latest_attendance.check_out
        
        # Obtener el proyecto activo si existe
        active_project = None
        if is_checked_in:
            # Buscar la asignación de proyecto más reciente
            project_assignment = db.query(models.ProjectAssignment)\
                .join(models.Project)\
                .filter(
                    models.ProjectAssignment.user_id == current_user.id,
                    models.Project.status.in_(['activo', 'en-progreso'])
                )\
                .order_by(models.ProjectAssignment.created_at.desc())\
                .first()
                
            if project_assignment:
                project = project_assignment.project
                active_project = {
                    "id": project.id,
                    "name": project.name,
                    "location": {
                        "plant_name": project.location.plant_name if project.location else None,
                        "plant_address": project.location.plant_address if project.location else None,
                        "plant_coordinates": project.location.plant_coordinates if project.location else None,
                        "contact_name": project.location.contact_name if project.location else None,
                        "contact_phone": project.location.contact_phone if project.location else None,
                        "contact_email": project.location.contact_email if project.location else None,
                        "hotel_name": project.location.hotel_name if project.location else None,
                        "hotel_address": project.location.hotel_address if project.location else None,
                        "hotel_coordinates": project.location.hotel_coordinates if project.location else None,
                        "hotel_phone": project.location.hotel_phone if project.location else None
                    },
                    "check_in_time": latest_attendance.check_in.strftime("%H:%M:%S")
                }
        
        return {
            "is_checked_in": is_checked_in,
            "active_project": active_project,
            "check_in_time": latest_attendance.check_in.strftime("%H:%M:%S") if is_checked_in else None,
            "status": current_user.status
        }
        
    except Exception as e:
        print(f"Error al obtener estado actual: {str(e)}")
        db.rollback()
        return {
            "is_checked_in": False,
            "active_project": None,
            "check_in_time": None,
            "status": current_user.status
        }

@app.post("/api/projects/recalculate-progress")
async def recalculate_all_projects_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        projects = db.query(models.Project).all()
        for project in projects:
            project.update_progress()
        db.commit()
        return {"message": f"Progress recalculated for {len(projects)} projects"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/projects/{project_id}/update-parts")
async def update_project_parts(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza las partes completadas de un proyecto en tiempo real"""
    try:
        data = await request.json()
        parts_completed = data.get('parts_completed', 0)
        
        # Buscar el proyecto
        project = db.query(models.Project).filter(
            models.Project.id == project_id
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        # Actualizar las partes completadas
        project.completed_parts = parts_completed
        project.update_progress()
        
        # Actualizar información del técnico
        project.last_technician_name = current_user.full_name
        project.last_technician_date = datetime.now()
        project.last_technician_action = "parts_updated"
        
        db.commit()
        db.refresh(project)
        
        return {
            "message": "Partes completadas actualizadas correctamente",
            "project_id": project.id,
            "completed_parts": project.completed_parts,
            "progress": project.progress
        }
    except Exception as e:
        db.rollback()
        print(f"Error al actualizar partes del proyecto: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/employees/technician/{full_name}")
async def get_technician_by_name(
    full_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET TECHNICIAN BY NAME ===")
        print(f"Searching for technician: {full_name}")
        
        # Buscar el técnico por nombre completo
        technician = db.query(models.User).filter(
            models.User.full_name == full_name,
            models.User.role == "tecnico"
        ).first()
        
        if not technician:
            raise HTTPException(
                status_code=404,
                detail=f"Técnico '{full_name}' no encontrado"
            )
            
        print(f"Found technician: {technician.full_name}")
        
        # Obtener el proyecto actual del técnico
        current_project = db.query(models.Project)\
            .join(models.ProjectAssignment)\
            .filter(
                models.ProjectAssignment.user_id == technician.id,
                models.Project.status.in_(['activo', 'en-progreso'])
            )\
            .order_by(models.ProjectAssignment.created_at.desc())\
            .first()
            
        # Preparar la respuesta
        response = {
            "id": technician.id,
            "full_name": technician.full_name,
            "email": technician.email,
            "phone": technician.phone,
            "location": technician.location,
            "status": technician.status,
            "avatar": technician.avatar,
            "current_project": current_project.name if current_project else None,
            "personal_info": technician.personal_info,
            "employment_info": technician.employment_info
        }
        
        print(f"Sending response: {response}")
        return response
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting technician: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener datos del técnico: {str(e)}"
        )

# Endpoints para Issues
@app.post("/api/issues/", response_model=schemas.IssueResponse)
async def create_issue(
    issue: schemas.IssueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== CREATE ISSUE ===")
        print(f"User: {current_user.full_name}")
        print(f"Type: {issue.type}")
        print(f"Part Number/VIN: {issue.part_number_vin}")
        print(f"Project: {issue.project}")
        print(f"Location: {issue.location}")
        print(f"Description: {issue.description}")
        
        # Crear el issue
        db_issue = models.Issue(
            type=issue.type,
            part_number_vin=issue.part_number_vin,
            project=issue.project,
            location=issue.location,
            description=issue.description,
            created_by=current_user.id,
            date_reported=datetime.now().date()
        )
        
        db.add(db_issue)
        db.commit()
        db.refresh(db_issue)
        
        print(f"Issue created with ID: {db_issue.id}")
        
        return db_issue
        
    except Exception as e:
        print(f"Error creating issue: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/issues/", response_model=List[schemas.IssueResponse])
async def get_issues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET ISSUES ===")
        print(f"User: {current_user.full_name}")
        print(f"User role: {current_user.role}")
        
        # Construir la consulta base
        query = db.query(models.Issue)
        
        # Si el usuario es cliente o admin, mostrar todos los issues
        # Si es técnico, mostrar solo los issues que creó
        if current_user.role == "client" or current_user.role == "admin":
            print("User is client or admin, showing all issues")
        else:
            print("User is not client or admin, filtering by created_by")
            query = query.filter(models.Issue.created_by == current_user.id)
        
        # Ordenar por fecha de creación descendente
        issues = query.order_by(models.Issue.created_at.desc()).all()
        
        print(f"Found {len(issues)} issues")
        
        return issues
        
    except Exception as e:
        print(f"Error getting issues: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/issues/count")
async def get_issues_count(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET ISSUES COUNT ===")
        print(f"User: {current_user.full_name}")
        print(f"Status filter: {status}")
        
        # Construir la consulta base
        query = db.query(models.Issue)
        
        # Si el usuario es cliente o admin, mostrar todos los issues
        # Si es técnico, mostrar solo los issues que creó
        if current_user.role == "client" or current_user.role == "admin":
            print("User is client or admin, showing all issues")
        else:
            print("User is not client or admin, filtering by created_by")
            query = query.filter(models.Issue.created_by == current_user.id)
        
        # Aplicar filtro de status si se proporciona
        if status:
            query = query.filter(models.Issue.status == status)
        
        count = query.count()
        print(f"Found {count} issues")
        
        return {"count": count, "status": status or "all"}
        
    except Exception as e:
        print(f"Error counting issues: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/issues/{issue_id}", response_model=schemas.IssueResponse)
async def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET ISSUE ===")
        print(f"User: {current_user.full_name}")
        print(f"Issue ID: {issue_id}")
        
        # Obtener el issue específico
        issue = db.query(models.Issue).filter(
            models.Issue.id == issue_id,
            models.Issue.created_by == current_user.id
        ).first()
        
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        return issue
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting issue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/issues/project/{project_id}", response_model=List[schemas.IssueResponse])
async def get_issues_by_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== GET ISSUES BY PROJECT ===")
        print(f"User: {current_user.full_name}")
        print(f"Project ID: {project_id}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail=f"Proyecto con ID {project_id} no encontrado"
            )
        
        # Obtener issues del proyecto
        issues = db.query(models.Issue).filter(
            models.Issue.project_id == project_id
        ).order_by(models.Issue.created_at.desc()).all()
        
        print(f"Found {len(issues)} issues for project {project_id}")
        
        return issues
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting issues by project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/issues/{issue_id}", response_model=schemas.IssueResponse)
async def update_issue(
    issue_id: int,
    issue_update: schemas.IssueUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"\n=== UPDATE ISSUE ===")
        print(f"User: {current_user.full_name}")
        print(f"Issue ID: {issue_id}")
        print(f"Update data: {issue_update.dict()}")
        
        # Obtener el issue existente
        db_issue = db.query(models.Issue).filter(
            models.Issue.id == issue_id,
            models.Issue.created_by == current_user.id
        ).first()
        
        if not db_issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Actualizar solo los campos proporcionados
        update_data = issue_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_issue, field, value)
        
        # Si se está resolviendo, establecer resolved_at
        if issue_update.status == 'resuelto' and not db_issue.resolved_at:
            db_issue.resolved_at = datetime.now()
        
        db.commit()
        db.refresh(db_issue)
        
        print(f"Issue updated successfully")
        
        return db_issue
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error updating issue: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))