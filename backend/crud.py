from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
from fastapi import HTTPException, Depends
from typing import Optional, List
from security import get_current_user

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
def create_employee(
    db: Session, 
    employee: schemas.EmployeeCreate,
    avatar_url: Optional[str] = None,
    contract_url: Optional[str] = None
) -> schemas.Employee:
    # Verificar si el email ya existe
    if db.query(models.User).filter(models.User.email == employee.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generar un username único basado en el email
    base_username = employee.email.split('@')[0]
    username = base_username
    counter = 1
    while db.query(models.User).filter(models.User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1
    
    # Crear el objeto User
    full_name = f"{employee.firstName} {employee.lastName} {employee.secondLastName}"
    db_employee = models.User(
        email=employee.email,
        username=username,
        full_name=full_name,
        avatar=avatar_url,
        role="tecnico",
        status="ausente",
        location=employee.location,
        phone=employee.phone,
        is_active=True,
        company_id=employee.company_id,
        personal_info={
            "curp": employee.curp or "",
            "rfc": employee.rfc or "",
            "birth_date": employee.birthDate or "",
            "first_name": employee.firstName,
            "last_name": employee.lastName,
            "second_last_name": employee.secondLastName
        },
        employment_info={
            "start_date": employee.startDate or "",
            "last_contract_renewal": "",
            "contract_file": contract_url,
            "position": employee.position or "",
            "supervisor": "",
            "certifications": []
        },
        hr_info={
            "salary": {
                "base": float(employee.salary) if employee.salary else 0,
                "last_increase": "",
                "next_review_date": ""
            },
            "benefits": [],
            "vacations": {
                "days_total": int(employee.vacationDays) if employee.vacationDays else 0,
                "days_used": 0,
                "next_vacation_date": "",
                "history": []
            },
            "documents": []
        }
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

def create_project_equipment(db: Session, project_id: int, equipment_names: List[str]):
    try:
        equipment_list = []
        for name in equipment_names:
            db_equipment = models.ProjectEquipment(
                project_id=project_id,
                name=name
            )
            db.add(db_equipment)
            equipment_list.append(db_equipment)
        
        db.commit()
        return equipment_list
    except Exception as e:
        db.rollback()
        raise e

def get_user_by_full_name(db: Session, full_name: str):
    return db.query(models.User).filter(models.User.full_name == full_name).first()

def create_project_assignments(db: Session, project_id: int, technician_names: List[str]):
    try:
        assignments_list = []
        for name in technician_names:
            # Get user by full name
            user = get_user_by_full_name(db, name)
            if user:
                db_assignment = models.ProjectAssignment(
                    project_id=project_id,
                    user_id=user.id,
                    role="tecnico",
                    created_at=datetime.utcnow()
                )
                db.add(db_assignment)
                assignments_list.append(db_assignment)
        
        db.commit()
        return assignments_list
    except Exception as e:
        db.rollback()
        raise e

def create_project_documents(db: Session, project_id: int, documents: List[dict]):
    try:
        print("\n=== CREATING PROJECT DOCUMENTS ===")
        print(f"Project ID: {project_id}")
        print(f"Documents to create: {documents}")
        
        # Verificar que el proyecto existe
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID {project_id} not found")
        print(f"Found project: {project.name}")
        
        documents_list = []
        for doc in documents:
            print(f"\nProcessing document: {doc}")
            try:
                db_document = models.ProjectDocument(
                    project_id=project_id,
                    name=doc["name"],
                    type=doc["type"],
                    url=doc["url"],
                    size=doc.get("size", 0),
                    created_at=datetime.utcnow()
                )
                print(f"Created document object: {db_document.__dict__}")
                
                db.add(db_document)
                print("Document added to session")
                
                documents_list.append(db_document)
                
            except Exception as doc_error:
                print(f"Error creating document: {str(doc_error)}")
                raise doc_error
        
        print(f"\nAdded {len(documents_list)} documents to session")
        print("\nCommitting documents to database...")
        
        try:
            db.flush()
            print("Documents flushed successfully")
            
            db.commit()
            print("Documents committed successfully")
            
            # Verificar que los documentos se crearon
            created_docs = db.query(models.ProjectDocument).filter(
                models.ProjectDocument.project_id == project_id
            ).all()
            print(f"\nVerification - Found {len(created_docs)} documents in database:")
            for doc in created_docs:
                print(f"- Document ID: {doc.id}, Name: {doc.name}, URL: {doc.url}")
            
            return documents_list
            
        except Exception as commit_error:
            print(f"\nError during commit: {str(commit_error)}")
            db.rollback()
            raise commit_error
            
    except Exception as e:
        print(f"\nError in create_project_documents: {str(e)}")
        print("Rolling back changes...")
        db.rollback()
        raise e

def create_project(db: Session, project: schemas.ProjectCreate):
    try:
        print("\n=== CREATE PROJECT IN CRUD ===")
        print("Project schema received:", project.dict())
        print("Documents in schema:", project.documents)
        
        # Transformar los nombres de campos al formato de la base de datos
        project_data = {
            "name": project.name,
            "status": project.status,
            "client": project.client,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "progress": project.progress,
            "total_parts": project.total_parts,
            "completed_parts": project.completed_parts,
            "project_type": project.project_type,
            "company_id": project.company_id,
            "description": project.description,
            "last_technician_name": project.assigned_to[-1] if project.assigned_to else None,
            "last_technician_date": datetime.utcnow() if project.assigned_to else None,
            "last_technician_action": "Asignado" if project.assigned_to else None
        }
        
        print("\nCreating project with data:", project_data)
        
        # Crear el proyecto
        db_project = models.Project(**project_data)
        db.add(db_project)
        print("Project added to session")
        
        db.flush()  # Obtener el ID del proyecto sin hacer commit
        print(f"Project flushed, got ID: {db_project.id}")
        
        # Crear el registro de ubicación
        location_data = {
            "project_id": db_project.id,
            "plant_name": project.location.plant_name,
            "plant_address": project.location.plant_address,
            "plant_coordinates": project.location.plant_coordinates,
            "contact_name": project.location.contact_name,
            "contact_phone": project.location.contact_phone,
            "contact_email": project.location.contact_email,
            "hotel_name": project.location.hotel_name,
            "hotel_address": project.location.hotel_address,
            "hotel_coordinates": project.location.hotel_coordinates,
            "hotel_phone": project.location.hotel_phone
        }
        db_location = models.ProjectLocation(**location_data)
        db.add(db_location)
        print("\nLocation data added:", location_data)

        # Crear registros de equipo si hay equipo especificado
        if project.equipment:
            print("\nCreating equipment:", project.equipment)
            create_project_equipment(db, db_project.id, project.equipment)
        
        # Crear asignaciones de técnicos
        if project.assigned_to:
            print("\nCreating technician assignments:", project.assigned_to)
            create_project_assignments(db, db_project.id, project.assigned_to)
        
        # Crear documentos del proyecto
        if project.documents:
            print("\nCreating project documents:", project.documents)
            created_docs = create_project_documents(db, db_project.id, project.documents)
            print("Documents created:", [doc.__dict__ for doc in created_docs] if created_docs else "No documents created")
        
        print("\nCommitting all changes to database...")
        db.commit()
        print("Changes committed successfully")
        
        print("\nRefreshing project instance...")
        db.refresh(db_project)
        print("Project refreshed")
        
        print("\nFinal project state:")
        print(f"- ID: {db_project.id}")
        print(f"- Name: {db_project.name}")
        print(f"- Documents: {[doc.__dict__ for doc in db_project.documents] if db_project.documents else 'No documents'}")
        print(f"- Location: {db_project.location.__dict__ if db_project.location else 'No location'}")
        print(f"- Equipment: {[eq.__dict__ for eq in db_project.equipment] if db_project.equipment else 'No equipment'}")
        print(f"- Assignments: {[assg.__dict__ for assg in db_project.assignments] if db_project.assignments else 'No assignments'}")

        return db_project
    except Exception as e:
        print("\nError creating project:", str(e))
        print("Rolling back changes...")
        db.rollback()
        raise e

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

def create_time_entry(db: Session, time_entry_data: dict):
    db_time_entry = models.TimeEntry(
        user_id=time_entry_data["user_id"],
        project_id=time_entry_data["project_id"],
        description=time_entry_data.get("description"),
        start_time=time_entry_data["start_time"],
        end_time=time_entry_data.get("end_time"),
        duration=time_entry_data.get("duration")
    )
    db.add(db_time_entry)
    db.commit()
    db.refresh(db_time_entry)
    return db_time_entry

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_employees(db: Session) -> List[schemas.Employee]:
    try:
        print("\n=== GET EMPLOYEES ===")
        
        # Cambiar el filtro para obtener solo técnicos
        employees = db.query(models.User).filter(models.User.role == "tecnico").all()
        print(f"Found {len(employees)} technicians")
        if employees:
            print("First technician example:", {
                "id": employees[0].id,
                "email": employees[0].email,
                "full_name": employees[0].full_name,
                "personal_info": employees[0].personal_info,
                "employment_info": employees[0].employment_info,
                "hr_info": employees[0].hr_info
            })
        
        return employees
    except Exception as e:
        print("Error in get_employees:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

def update_employee(
    db: Session, 
    employee_id: int,
    employee: schemas.EmployeeCreate,
    avatar_url: Optional[str] = None,
    contract_url: Optional[str] = None
) -> schemas.Employee:
    db_employee = db.query(models.User).filter(models.User.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Actualizar campos
    full_name = f"{employee.firstName} {employee.lastName} {employee.secondLastName}".strip()
    
    db_employee.email = employee.email
    db_employee.full_name = full_name
    db_employee.location = employee.location
    db_employee.phone = employee.phone
    
    if avatar_url:
        db_employee.avatar = avatar_url

    # Actualizar información adicional
    db_employee.personal_info.update({
        "curp": employee.curp or "",
        "rfc": employee.rfc or "",
        "birth_date": employee.birthDate or "",
        "first_name": employee.firstName,
        "last_name": employee.lastName,
        "second_last_name": employee.secondLastName
    })
    
    db_employee.employment_info.update({
        "start_date": employee.startDate or "",
        "position": employee.position or "",
        "contract_file": contract_url
    })
    
    db_employee.hr_info.update({
        "salary": {
            "base": float(employee.salary) if employee.salary else 0
        },
        "vacations": {
            "days_total": int(employee.vacationDays) if employee.vacationDays else 0,
            "days_used": 0
        }
    })

    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = db.query(models.User).filter(models.User.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(db_employee)
    db.commit()

def update_project_progress(db: Session, project_id: int, completed_parts: int):
    """Actualiza las partes completadas y el progreso de un proyecto"""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.completed_parts = completed_parts
    project.update_progress()
    db.commit()
    db.refresh(project)
    return project

def submit_time_entry(db: Session, time_entry: schemas.TimeEntryCreate):
    """Crea un nuevo registro de tiempo y actualiza el progreso del proyecto"""
    try:
        # Crear el registro de tiempo
        db_time_entry = models.TimeEntry(
            user_id=time_entry.user_id,
            project_id=time_entry.project_id,
            start_time=time_entry.start_time,
            end_time=time_entry.end_time,
            duration=time_entry.duration,
            parts_completed=time_entry.parts_completed
        )
        db.add(db_time_entry)
        
        # Actualizar el progreso del proyecto
        project = get_project(db, time_entry.project_id)
        if project:
            project.completed_parts += time_entry.parts_completed
            project.update_progress()
        
        db.commit()
        db.refresh(db_time_entry)
        return db_time_entry
    except Exception as e:
        db.rollback()
        raise e

def delete_project(db: Session, project_id: int):
    """Elimina un proyecto y todos sus registros relacionados"""
    try:
        # Obtener el proyecto
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Eliminar asignaciones
        db.query(models.ProjectAssignment).filter(
            models.ProjectAssignment.project_id == project_id
        ).delete()

        # Eliminar documentos
        db.query(models.ProjectDocument).filter(
            models.ProjectDocument.project_id == project_id
        ).delete()

        # Eliminar equipos
        db.query(models.ProjectEquipment).filter(
            models.ProjectEquipment.project_id == project_id
        ).delete()

        # Eliminar ubicación
        db.query(models.ProjectLocation).filter(
            models.ProjectLocation.project_id == project_id
        ).delete()

        # Finalmente, eliminar el proyecto
        db.delete(project)
        db.commit()
        return {"message": f"Project {project.name} and all related records deleted successfully"}
    except Exception as e:
        db.rollback()
        print("Error al eliminar proyecto:", str(e))
        raise e