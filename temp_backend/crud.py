from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
from fastapi import HTTPException

# Company operations
def create_company(db: Session, company: schemas.CompanyCreate):
    db_company = models.Company(name=company.name)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def get_company(db: Session, company_id: int):
    return db.query(models.Company).filter(models.Company.id == company_id).first()

def get_companies(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Company).offset(skip).limit(limit).all()

# Employee operations
def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.User(
        email=employee.email,
        username=employee.email,
        full_name=employee.name,
        role="employee",
        company_id=employee.company_id,
        is_active=True,
        status="activo",
        location="",
        phone=""
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def get_employee(db: Session, employee_id: int):
    return db.query(models.User).filter(models.User.id == employee_id).first()

def get_employee_by_link(db: Session, unique_link: str):
    return db.query(models.User).filter(models.User.email == unique_link).first()

# Attendance operations
def create_attendance_record(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(
        user_id=attendance.user_id,
        check_in=datetime.utcnow(),
        latitude=attendance.latitude,
        longitude=attendance.longitude
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def update_attendance_record(db: Session, record_id: int):
    db_record = db.query(models.Attendance).filter(
        models.Attendance.id == record_id
    ).first()
    if db_record and not db_record.check_out:
        db_record.check_out = datetime.utcnow()
        db.commit()
        db.refresh(db_record)
    return db_record

def get_projects(db: Session):
    return db.query(models.Project).all()

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for key, value in project.dict(exclude_unset=True).items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

def get_user_by_email(db: Session, email: str):
    print(f"\n=== BUSCANDO USUARIO ===")
    print(f"Email buscado: '{email}'")
    user = db.query(models.User).filter(models.User.email == email).first()
    print(f"Usuario encontrado: {user is not None}")
    if user:
        print(f"Email en DB: '{user.email}'")
        print(f"Hash en DB: '{user.hashed_password}'")
    return user

def get_users(db: Session):
    return db.query(models.User).all()

def get_dashboard_stats(db: Session):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.status == 'presente').count()
    total_projects = db.query(models.Project).count()
    active_projects = db.query(models.Project).filter(models.Project.status == 'activo').count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_projects": total_projects,
        "active_projects": active_projects
    }

def get_time_entries(db: Session):
    return db.query(models.TimeEntry).all()

def create_time_entry(db: Session, time_entry: schemas.TimeEntryCreate):
    db_time_entry = models.TimeEntry(**time_entry.dict())
    db.add(db_time_entry)
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()