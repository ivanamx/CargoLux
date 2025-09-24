from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Date, Float, Boolean, Text, func, JSON, Enum, CheckConstraint, Numeric
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserStatus(str, Enum):
    PRESENTE = "presente"
    AUSENTE = "ausente"
    EN_RUTA = "en-ruta"
    VACACIONES = "vacaciones"
    INCAPACIDAD = "incapacidad"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True)
    full_name = Column(String)
    avatar = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(String)
    status = Column(String, default=UserStatus.AUSENTE)
    location = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    push_subscription = Column(JSON, nullable=True)

    # Campos JSON con valores por defecto
    personal_info = Column(JSON, default=lambda: {
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
    
    employment_info = Column(JSON, default=lambda: {
        "start_date": "",
        "last_contract_renewal": "",
        "contract_file": "",
        "position": "",
        "supervisor": "",
        "certifications": []
    })
    
    hr_info = Column(JSON, default=lambda: {
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
    
    # Relaciones
    company = relationship("Company", back_populates="employees")
    attendances = relationship("Attendance", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    certifications = relationship("Certification", back_populates="user")
    vacation_history = relationship("VacationHistory", back_populates="user", foreign_keys="[VacationHistory.user_id]")
    evaluations = relationship("PerformanceEvaluation", back_populates="user", foreign_keys="[PerformanceEvaluation.user_id]")
    time_entries = relationship("TimeEntry", back_populates="user", foreign_keys="[TimeEntry.user_id]")
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
            # Usar check_in_latitude/longitude si no hay check_out, sino usar check_out_latitude/longitude
            if current_attendance.check_out is None:
                coordinates = [current_attendance.check_in_latitude, current_attendance.check_in_longitude]
            else:
                coordinates = [current_attendance.check_out_latitude, current_attendance.check_out_longitude]
            
            return {
                'coordinates': coordinates,
                'status': self.status,
                'city': self.location,
                'check_in_time': current_attendance.check_in.strftime('%H:%M') if current_attendance.check_in else None,
                'delay_minutes': None  # No tenemos este campo en el modelo actual
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
    employees = relationship("User", back_populates="company")
    projects = relationship("Project", back_populates="company")

    def get_daily_reporting_stats(self):
        from datetime import datetime
        
        today = datetime.utcnow().date()
        total_technicians = sum(1 for user in self.employees if user.role == 'employee')
        reported_today = sum(1 for user in self.employees 
                           if user.role == 'employee' and 
                           any(entry.date.date() == today for entry in user.time_entries))
        
        return {
            'total_technicians': total_technicians,
            'reported_today': reported_today,
            'pending': total_technicians - reported_today
        }

class ProjectStatus(Enum):
    ACTIVO = "activo"
    COMPLETADO = "completado"
    EN_PROGRESO = "en-progreso"

class Project(Base):
    __tablename__ = "projects"
   
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)
    client = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    progress = Column(Float, default=0)
    total_parts = Column(Integer)
    completed_parts = Column(Integer, default=0)
    project_type = Column(String(10))
    company_id = Column(Integer, ForeignKey("companies.id"))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_technician_name = Column(String(255))
    last_technician_date = Column(DateTime)
    last_technician_action = Column(String(255))
    
    # Relaciones
    company = relationship("Company", back_populates="projects")
    assignments = relationship("ProjectAssignment", back_populates="project")
    time_entries = relationship("TimeEntry", back_populates="project")
    documents = relationship("ProjectDocument", back_populates="project")
    equipment = relationship("ProjectEquipment", back_populates="project")
    location = relationship("ProjectLocation", back_populates="project", uselist=False)

    __table_args__ = (
        CheckConstraint(
            project_type.in_(['bench', 'patios']),
            name='check_project_type'
        ),
        CheckConstraint(
            status.in_(['activo', 'completado', 'en-progreso']),
            name='projects_status_check'
        ),
    )

    def get_real_completed_parts(self, db):
        """Obtiene el número real de partes completadas basado en project_updates"""
        from sqlalchemy import text
        result = db.execute(
            text("""
            SELECT COUNT(*) 
            FROM project_updates 
            WHERE project_name = :project_name 
            AND flash_status = 'updated'
            """),
            {"project_name": self.name}
        ).scalar()
        return result or 0

    def update_progress(self):
        """Actualiza el progreso basado en las partes completadas"""
        if self.total_parts and self.total_parts > 0:
            self.progress = round((self.completed_parts / self.total_parts) * 100)
        else:
            self.progress = 0

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
    plant_name = Column(String)
    
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
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="assignments")
    user = relationship("User", back_populates="project_assignments")

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    description = Column(Text)
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    parts_completed = Column(Integer, default=0)
    entry_type = Column(String, default='manual')  # 'manual' o 'automatic'
    photo = Column(Text, nullable=True)  # Campo para almacenar la foto en Base64
    photo_check_in = Column(Text, nullable=True)  # Foto específica del check-in
    photo_check_out = Column(Text, nullable=True)  # Foto específica del check-out
    
    user = relationship("User", back_populates="time_entries")
    project = relationship("Project", back_populates="time_entries")

class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    check_in_latitude = Column(Float)
    check_in_longitude = Column(Float)
    check_out_latitude = Column(Float)
    check_out_longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    photo = Column(Text, nullable=True)  # Campo para almacenar la foto en Base64
    photo_check_in = Column(Text, nullable=True)  # Foto específica del check-in
    photo_check_out = Column(Text, nullable=True)  # Foto específica del check-out
    
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

class DayStatus(Base):
    __tablename__ = "day_status"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    is_closed = Column(Boolean, default=False)
    closed_by = Column(Integer, ForeignKey("users.id"))
    closed_at = Column(DateTime)
    opened_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    opened_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[closed_by])
    opened_by_user = relationship("User", foreign_keys=[opened_by])

class ScannedCode(Base):
    __tablename__ = "scanned_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)  # 'barcode' o 'qrcode'
    source = Column(String(20), nullable=False)  # 'camera' o 'usb_scanner'
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=False, default='ok')  # Campo status agregado
    
    # Relaciones
    user = relationship("User")
    project = relationship("Project")
    
    # Campo virtual para el nombre del proyecto (no se guarda en BD)
    project_name = None

class PanasonicFlow(Base):
    __tablename__ = "panasonic_flow"
    
    id = Column(Integer, primary_key=True, index=True)
    boxcode = Column(String(255), nullable=False)
    boxcode2 = Column(String(255), nullable=True)
    batterycode = Column(String(255), nullable=False)
    batterycode2 = Column(String(255), nullable=True)
    batterycode3 = Column(String(255), nullable=True)
    batterycode4 = Column(String(255), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, default=28)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    lat2 = Column(Numeric(10, 8), nullable=True)
    lon2 = Column(Numeric(11, 8), nullable=True)
    lat3 = Column(Numeric(10, 8), nullable=True)
    lon3 = Column(Numeric(11, 8), nullable=True)
    lat4 = Column(Numeric(10, 8), nullable=True)
    lon4 = Column(Numeric(11, 8), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    boxtimestamp = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False)
    categorie = Column(String(100), nullable=False)
    
    # Relaciones
    user = relationship("User")
    project = relationship("Project")
    
    # Campo virtual para el nombre del proyecto (no se guarda en BD)
    project_name = None

class PanasonicCheckpoint(Base):
    __tablename__ = "panasonic_checkpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False)
    checkpoint_type = Column(String(50), nullable=False)
    checkpoint_number = Column(Integer, nullable=False)
    scanned_code = Column(String(255), nullable=False)
    scan_order = Column(Integer, nullable=True)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    accuracy = Column(Numeric(8, 2), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(String(50), nullable=False, default='ok')
    categorie = Column(String(100), nullable=True)
    phase = Column(String(20), nullable=False)
    
    # Campos adicionales para los 7 checkpoints extra
    checkpoint_7_storage_exit = Column(String(255), nullable=True)
    lat_7_storage_exit = Column(Numeric(10, 8), nullable=True)
    lon_7_storage_exit = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_8_cd_arrival = Column(String(255), nullable=True)
    lat_8_cd_arrival = Column(Numeric(10, 8), nullable=True)
    lon_8_cd_arrival = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_8_cde_exit = Column(String(255), nullable=True)
    lat_8_cde_exit = Column(Numeric(10, 8), nullable=True)
    lon_8_cde_exit = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_10_e_arrival = Column(String(255), nullable=True)
    lat_10_e_arrival = Column(Numeric(10, 8), nullable=True)
    lon_10_e_arrival = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_11_e_arrival = Column(String(255), nullable=True)
    lat_11_e_arrival = Column(Numeric(10, 8), nullable=True)
    lon_11_e_arrival = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_11_e_exit = Column(String(255), nullable=True)
    lat_11_e_exit = Column(Numeric(10, 8), nullable=True)
    lon_11_e_exit = Column(Numeric(11, 8), nullable=True)
    
    checkpoint_ab_exit = Column(String(255), nullable=True)
    lat_ab_exit = Column(Numeric(10, 8), nullable=True)
    lon_ab_exit = Column(Numeric(11, 8), nullable=True)
    
    # Relaciones
    user = relationship("User")
    project = relationship("Project")

class PanasonicQualityCheck(Base):
    __tablename__ = "panasonic_quality_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase = Column(String(20), nullable=False)  # 'categorizacion' o 'reempacado'
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Respuestas de categorización (1-14)
    respuesta1 = Column(String(10), nullable=True)
    respuesta2 = Column(String(10), nullable=True)
    escaneo2 = Column(String(255), nullable=True)
    respuesta3 = Column(String(10), nullable=True)
    respuesta4 = Column(String(10), nullable=True)
    respuesta5 = Column(String(10), nullable=True)
    respuesta6 = Column(String(10), nullable=True)
    respuesta7 = Column(String(10), nullable=True)
    respuesta8 = Column(String(10), nullable=True)
    respuesta9 = Column(String(10), nullable=True)
    escaneo9 = Column(String(255), nullable=True)
    respuesta10 = Column(String(10), nullable=True)
    respuesta11 = Column(String(10), nullable=True)
    respuesta12 = Column(String(10), nullable=True)
    respuesta13 = Column(String(10), nullable=True)
    respuesta14 = Column(String(10), nullable=True)
    
    # Respuestas de reempacado (15-21)
    respuesta15 = Column(String(10), nullable=True)
    escaneo15 = Column(String(255), nullable=True)
    respuesta16 = Column(String(10), nullable=True)
    respuesta17 = Column(String(10), nullable=True)
    escaneo17 = Column(String(255), nullable=True)
    respuesta18 = Column(String(10), nullable=True)
    respuesta19 = Column(String(10), nullable=True)
    respuesta20 = Column(String(10), nullable=True)
    respuesta21 = Column(String(10), nullable=True)
    
    # Campos para categorías de baterías (pregunta 14)
    battery1_code = Column(String(255), nullable=True)
    battery1_category = Column(String(10), nullable=True)
    battery2_code = Column(String(255), nullable=True)
    battery2_category = Column(String(10), nullable=True)
    
    # Campo para tiempo promedio por caja (en segundos)
    avg_box_time = Column(Integer, nullable=True)
    
    # Relaciones
    user = relationship("User")
    project = relationship("Project")

class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100), nullable=False)
    part_number_vin = Column(String(200), nullable=False)
    project = Column(String(200), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    location = Column(String(200), nullable=False)
    date_reported = Column(Date, nullable=False, default=func.current_date())
    status = Column(String(20), nullable=False, default='pendiente')
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relaciones
    user = relationship("User")
    project_rel = relationship("Project")

