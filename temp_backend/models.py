from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Float, Boolean, Text, func, JSON, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String)  # 'admin', 'employee'
    status = Column(String)  # 'presente', 'ausente', etc.
    location = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    push_subscription = Column(String, nullable=True)

    # Información Personal
    personal_info = Column(JSON, default={
        "curp": "",
        "rfc": "",
        "birth_date": "",
        "address": "",
        "emergency_contact": {
            "name": "",
            "phone": "",
            "relation": ""
        }
    })

    # Información Laboral
    employment_info = Column(JSON, default={
        "start_date": "",
        "last_contract_renewal": "",
        "contract_file": "",
        "position": "",
        "supervisor": "",
        "certifications": []
    })

    # Estadísticas
    statistics = Column(JSON, default={
        "total_hours": 0,
        "total_services": 0,
        "avg_monthly_hours": 0,
        "success_rate": 0,
        "incidents": 0
    })

    # Información de RRHH
    hr_info = Column(JSON, default={
        "salary": {
            "base": 0,
            "last_increase": "",
            "next_review_date": ""
        },
        "benefits": [],
        "vacations": {
            "days_total": 0,
            "days_used": 0,
            "next_vacation_date": "",
            "history": []
        },
        "documents": []
    })

    # Desempeño
    performance = Column(JSON, default={
        "last_evaluation": {
            "date": "",
            "score": 0,
            "evaluator": "",
            "comments": ""
        },
        "skills": [],
        "certifications": [],
        "trainings": []
    })

    # Incidentes
    incidents = Column(JSON, default=[])

    # Notificaciones
    notifications = relationship("Notification", back_populates="user")

    # Certificaciones
    certifications = relationship("Certification", back_populates="user")

    # Historial de vacaciones
    vacation_history = relationship(
        "VacationHistory",
        back_populates="user",
        foreign_keys="[VacationHistory.user_id]"
    )

    # Evaluaciones de desempeño
    evaluations = relationship(
        "PerformanceEvaluation",
        back_populates="user",
        foreign_keys="[PerformanceEvaluation.user_id]"
    )

    company = relationship("Company", back_populates="users")
    attendances = relationship("Attendance", back_populates="user")
    time_entries = relationship(
        "TimeEntry",
        back_populates="user",
        foreign_keys="[TimeEntry.user_id]"
    )
    project_assignments = relationship("ProjectAssignment", back_populates="user")

    def get_time_entries_stats(self, period='day'):
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        if period == 'day':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'fortnight':
            if now.day <= 15:
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                start_date = now.replace(day=16, hour=0, minute=0, second=0, microsecond=0)
        
        return {
            'total_hours': sum(entry.hours for entry in self.time_entries 
                             if entry.date >= start_date),
            'pending_entries': sum(1 for entry in self.time_entries 
                                 if entry.status == 'pending' and entry.date >= start_date),
            'approved_entries': sum(1 for entry in self.time_entries 
                                  if entry.status == 'approved' and entry.date >= start_date)
        }

    def get_current_location(self):
        current_attendance = (
            self.attendances
            .order_by(Attendance.created_at.desc())
            .first()
        )
        if current_attendance:
            latest_location = (
                current_attendance.location_history
                .order_by(LocationHistory.timestamp.desc())
                .first()
            )
            return {
                'coordinates': [current_attendance.latitude, current_attendance.longitude],
                'status': current_attendance.status,
                'city': current_attendance.city,
                'check_in_time': current_attendance.check_in.strftime('%H:%M') if current_attendance.check_in else None,
                'delay_minutes': current_attendance.delay_minutes
            }
        return None

    def get_project_stats(self):
        """Obtiene estadísticas de proyectos del usuario"""
        return {
            'active_projects': sum(1 for pa in self.project_assignments if pa.project.status == 'activo'),
            'completed_projects': sum(1 for pa in self.project_assignments if pa.project.status == 'completado'),
            'total_parts_assigned': sum(pa.assigned_parts for pa in self.project_assignments),
            'total_parts_completed': sum(pa.completed_parts for pa in self.project_assignments)
        }

    def get_attendance_stats(self, period='month'):
        """Obtiene estadísticas de asistencia"""
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        if period == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)

        attendances = [a for a in self.attendances if a.created_at >= start_date]
        return {
            'total_days': len(attendances),
            'present_days': sum(1 for a in attendances if a.status == 'presente'),
            'absent_days': sum(1 for a in attendances if a.status == 'ausente'),
            'late_days': sum(1 for a in attendances if a.delay_minutes and a.delay_minutes > 0)
        }

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="company")
    projects = relationship("Project", back_populates="company")

    def get_daily_reporting_stats(self):
        from datetime import datetime
        
        today = datetime.utcnow().date()
        total_technicians = sum(1 for user in self.users if user.role == 'employee')
        reported_today = sum(1 for user in self.users 
                           if user.role == 'employee' and 
                           any(entry.date.date() == today for entry in user.time_entries))
        
        return {
            'total_technicians': total_technicians,
            'reported_today': reported_today,
            'pending': total_technicians - reported_today
        }

class ProjectStatus(enum.Enum):
    active = "activo"
    completed = "completado"
    pending = "pendiente"
    delayed = "retrasado"

class Project(Base):
    __tablename__ = "projects"
   
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default='pending')  # 'activo', 'completado', 'pendiente', 'retrasado'
    client = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    progress = Column(Float, default=0)
    total_parts = Column(Integer, default=0)
    completed_parts = Column(Integer, default=0)
    city_image = Column(String)  # URL de la imagen de la ciudad
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Último técnico que trabajó en el proyecto
    last_technician = Column(JSON, default={
        "name": "",
        "date": "",
        "action": ""
    })
    
    # Relaciones
    company = relationship("Company", back_populates="projects")
    assignments = relationship("ProjectAssignment", back_populates="project")
    time_entries = relationship("TimeEntry", back_populates="project")
    documents = relationship("ProjectDocument", back_populates="project")
    equipment = relationship("ProjectEquipment", back_populates="project")
    location = relationship("ProjectLocation", back_populates="project", uselist=False)

class ProjectLocation(Base):
    __tablename__ = "project_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    # Planta
    plant_address = Column(String)
    plant_coordinates = Column(String)  # URL de Google Maps
    contact_name = Column(String)
    contact_phone = Column(String)
    contact_email = Column(String)
    
    # Hotel
    hotel_name = Column(String, nullable=True)
    hotel_address = Column(String, nullable=True)
    hotel_coordinates = Column(String, nullable=True)
    hotel_phone = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="location")

class ProjectDocument(Base):
    __tablename__ = "project_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    type = Column(String)  # 'PDF', etc.
    url = Column(String)
    size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="documents")

class ProjectEquipment(Base):
    __tablename__ = "project_equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="equipment")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)  # 'project_manager', 'team_member'
    assigned_parts = Column(Integer, default=0)
    completed_parts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="assignments")
    user = relationship("User", back_populates="project_assignments")

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    date = Column(DateTime, default=datetime.utcnow)
    hours = Column(Float)
    description = Column(Text, nullable=True)
    status = Column(String, default='pending')  # 'pending', 'approved', 'rejected'
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="time_entries")
    project = relationship("Project", back_populates="time_entries")
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    check_in = Column(DateTime)
    check_out = Column(DateTime, nullable=True)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String)  # 'presente', 'ausente', 'en-ruta'
    delay_minutes = Column(Integer, nullable=True)
    city = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="attendances")
    location_history = relationship("LocationHistory", back_populates="attendance")

class LocationHistory(Base):
    __tablename__ = "location_history"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendances.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # 'presente', 'ausente', 'en-ruta'
    
    attendance = relationship("Attendance", back_populates="location_history")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)  # 'reminder', 'alert', 'info'
    message = Column(Text)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class Certification(Base):
    __tablename__ = "certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    status = Column(String)  # 'vigente', 'por-vencer', 'vencido'
    document_url = Column(String, nullable=True)
    
    user = relationship("User", back_populates="certifications")

class VacationHistory(Base):
    __tablename__ = "vacation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    days = Column(Integer)
    status = Column(String)  # 'aprobado', 'pendiente', 'rechazado'
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    user = relationship(
        "User",
        back_populates="vacation_history",
        foreign_keys="[VacationHistory.user_id]"
    )
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class PerformanceEvaluation(Base):
    __tablename__ = "performance_evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    evaluator_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Float)
    comments = Column(Text)
    evaluation_date = Column(DateTime, default=datetime.utcnow)
    next_review_date = Column(DateTime)
    
    user = relationship(
        "User",
        back_populates="evaluations",
        foreign_keys="[PerformanceEvaluation.user_id]"
    )
    evaluator = relationship("User", foreign_keys=[evaluator_id])

