from pydantic import BaseModel, EmailStr, Field, model_validator, validator
from typing import Optional, List, Union
from datetime import datetime, date
from sqlalchemy.orm import relationship

class RecentActivity(BaseModel):
    user_name: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Modelos base
class AttendanceBase(BaseModel):
    check_in: datetime
    check_out: Optional[datetime] = None
    latitude: float
    longitude: float

class AttendanceCreate(AttendanceBase):
    user_id: int

class AttendanceRecord(AttendanceBase):  # Renombrado de Attendance a AttendanceRecord
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    message: str
    read: bool = False

class CertificationBase(BaseModel):
    name: str
    issue_date: datetime
    expiry_date: datetime

class VacationHistoryBase(BaseModel):
    start_date: datetime
    end_date: datetime
    days: int
    status: str

class PerformanceEvaluationBase(BaseModel):
    score: float
    comments: str
    evaluation_date: datetime

# Modelos completos
class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Certification(CertificationBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class VacationHistory(VacationHistoryBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class PerformanceEvaluation(PerformanceEvaluationBase):
    id: int
    user_id: int
    evaluator_id: int

    class Config:
        from_attributes = True

# Usuario y otros modelos
class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str = "employee"
    status: str = "ausente"
    location: str = ""
    phone: str = ""
    is_active: bool = True
    company_id: Optional[int] = None
    personal_info: dict = {}
    employment_info: dict = {}
    statistics: dict = {}
    hr_info: dict = {}
    performance: dict = {}
    incidents: dict = {}

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    push_subscription: Optional[dict] = None
    attendances: List[AttendanceRecord] = []
    notifications: List[Notification] = []
    certifications: List[Certification] = []
    vacation_history: List[VacationHistory] = []
    evaluations: List[PerformanceEvaluation] = []

    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    created_at: datetime
    users: List[User] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ProjectLocation(BaseModel):
    plant_name: Optional[str] = None
    plant_address: Optional[str] = None
    plant_coordinates: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    hotel_name: Optional[str] = None
    hotel_address: Optional[str] = None
    hotel_coordinates: Optional[str] = None
    hotel_phone: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    status: str
    client: str
    start_date: datetime
    end_date: datetime
    progress: float
    total_parts: int
    completed_parts: int

class ProjectCreate(BaseModel):
    name: str
    status: str = "activo"
    client: str
    start_date: datetime
    end_date: datetime
    progress: float = 0
    total_parts: int
    completed_parts: int = 0
    project_type: str
    description: Optional[str] = None
    company_id: int = 1
    location: ProjectLocation = ProjectLocation()
    documents: List[dict] = []
    equipment: List[str] = []
    assigned_to: List[str] = []

    @validator('project_type')
    def validate_project_type(cls, v):
        if v not in ['bench', 'patios']:
            raise ValueError('project_type must be either "bench" or "patios"')
        return v

    @validator('total_parts')
    def validate_total_parts(cls, v):
        if not isinstance(v, int) or v <= 0:
            raise ValueError('total_parts must be a positive integer')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v not in ['activo', 'completado', 'en-progreso']:
            raise ValueError('status must be one of: activo, completado, en-progreso')
        return v

    class Config:
        from_attributes = True
        alias_generator = lambda string: ''.join(['_' + i.lower() if i.isupper() else i for i in string]).lstrip('_')

class ProjectDocument(BaseModel):
    name: str
    type: str
    url: str

    class Config:
        from_attributes = True

class Project(BaseModel):
    id: int
    name: str
    status: str
    client: str
    start_date: datetime
    end_date: datetime
    progress: float = 0
    total_parts: int
    completed_parts: int = 0
    project_type: str
    description: Optional[str] = None
    last_technician_name: Optional[str] = None
    last_technician_date: Optional[datetime] = None
    last_technician_action: Optional[str] = None
    documents: List[ProjectDocument] = []
    equipment: List[str] = []
    location: Optional[ProjectLocation] = None
    assigned_to: List[str] = []
    
    class Config:
        from_attributes = True

        @classmethod
        def get_properties(cls):
            return [prop for prop in cls.__properties__]

        def json_schema(self):
            schema = super().json_schema()
            schema.update({"title": "Project"})
            return schema

    @property
    def equipment_names(self) -> List[str]:
        if hasattr(self, 'equipment') and self.equipment:
            return [eq.name if hasattr(eq, 'name') else str(eq) for eq in self.equipment]
        return []

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        d['equipment'] = self.equipment_names
        return d

class Credentials(BaseModel):
    username: str
    password: str

class TimeEntryCreate(BaseModel):
    user_id: int
    project_id: int
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None

class TimeEntry(TimeEntryCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AdminCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    company_id: int

class Admin(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: str
    role: str
    status: str
    location: str
    phone: str
    company_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EmployeeBase(BaseModel):
    firstName: str
    lastName: str
    secondLastName: str
    location: str
    phone: str
    email: EmailStr
    curp: Optional[str] = None
    rfc: Optional[str] = None
    birthDate: Optional[str] = None
    startDate: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = 0.0
    vacationDays: Optional[int] = 0
    company_id: int = Field(..., exclude=True)  # Required but hidden from API

class EmployeeCreate(EmployeeBase):
    pass

class Employee(BaseModel):
    id: int
    email: str
    full_name: str
    location: str
    phone: str
    status: str
    avatar: Optional[str] = None
    personal_info: dict = {
        "curp": "",
        "rfc": "",
        "birth_date": "",
        "address": "",
        "emergency_contact": {
            "name": "",
            "phone": "",
            "relation": ""
        }
    }
    employment_info: dict = {
        "start_date": "",
        "last_contract_renewal": "",
        "contract_file": "",
        "position": "",
        "supervisor": "",
        "certifications": []
    }
    hr_info: dict = {
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
    }
    project: Optional[str] = None

    @property
    def name(self) -> str:
        return self.full_name

    @property
    def firstName(self) -> str:
        return self.personal_info.get("first_name", "")
        
    @property
    def lastName(self) -> str:
        return self.personal_info.get("last_name", "")
        
    @property
    def secondLastName(self) -> str:
        return self.personal_info.get("second_last_name", "")

    @property
    def curp(self) -> str:
        return self.personal_info.get("curp", "")

    @property
    def rfc(self) -> str:
        return self.personal_info.get("rfc", "")

    @property
    def birthDate(self) -> str:
        return self.personal_info.get("birth_date", "")

    @property
    def position(self) -> str:
        return self.employment_info.get("position", "")

    @property
    def startDate(self) -> str:
        return self.employment_info.get("start_date", "")

    @property
    def salary(self) -> float:
        return self.hr_info.get("salary", {}).get("base", 0)

    @property
    def vacationDays(self) -> int:
        return self.hr_info.get("vacations", {}).get("days_total", 0)

    @model_validator(mode='after')
    def set_name(self):
        # Asegurarnos que name siempre tenga un valor
        if not hasattr(self, 'name') or not self.name:
            self.name = self.full_name
        return self

    class Config:
        from_attributes = True

class PushSubscription(BaseModel):
    subscription_info: dict 

    class Config:
        from_attributes = True

# Agregar de nuevo la clase ProjectUpdate
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    completed_parts: Optional[int] = None
    description: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v and v not in ['activo', 'completado', 'en-progreso']:
            raise ValueError('status must be one of: activo, completado, en-progreso')
        return v

    class Config:
        from_attributes = True

class TimeEntryResponse(BaseModel):
    project_id: int
    project_name: str
    project_location: str
    start_time: datetime
    end_time: Optional[datetime]
    duration: float
    parts_completed: int

class TimeEntryReport(BaseModel):
    id: str
    technicianName: str
    date: datetime
    start_time: datetime
    end_time: Optional[datetime]
    hours: float
    project: str
    description: Optional[str] = ""
    status: str

class DayStatusResponse(BaseModel):
    date: datetime
    is_closed: bool
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None

    class Config:
        from_attributes = True

# Agregar después de la clase TimeEntryReport
class ProjectAssignmentRequest(BaseModel):
    project_id: int
    action: str  # "assign" o "unassign"

    class Config:
        from_attributes = True

class ProjectEquipmentCreate(BaseModel):
    project_id: int
    name: str

    class Config:
        from_attributes = True

# Schemas para escaneos
class ScannedCodeBase(BaseModel):
    code: str
    type: str  # 'barcode' o 'qrcode'
    source: str  # 'camera' o 'usb_scanner'
    project_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime
    status: str = 'ok'  # Campo status agregado

class ScannedCodeCreate(ScannedCodeBase):
    user_id: int

class ScannedCode(ScannedCodeBase):
    id: int
    user_id: int
    created_at: datetime
    project_name: Optional[str] = None  # Para mostrar el nombre del proyecto

    class Config:
        from_attributes = True

class PanasonicFlow(BaseModel):
    id: int
    boxcode: str
    batterycode: str
    project_id: int
    user_id: int
    latitude: float
    longitude: float
    timestamp: datetime
    boxtimestamp: Optional[datetime] = None
    status: str
    categorie: str
    project_name: Optional[str] = None  # Para mostrar el nombre del proyecto

    class Config:
        from_attributes = True

class PanasonicCheckpointBase(BaseModel):
    session_id: str
    checkpoint_type: str
    checkpoint_number: int
    scanned_code: str
    scan_order: Optional[int] = None
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    project_id: int
    status: str = "ok"
    categorie: Optional[str] = None
    phase: str
    
    # Campos adicionales para los 7 checkpoints extra
    checkpoint_7_storage_exit: Optional[str] = None
    lat_7_storage_exit: Optional[float] = None
    lon_7_storage_exit: Optional[float] = None
    
    checkpoint_8_cd_arrival: Optional[str] = None
    lat_8_cd_arrival: Optional[float] = None
    lon_8_cd_arrival: Optional[float] = None
    
    checkpoint_8_cde_exit: Optional[str] = None
    lat_8_cde_exit: Optional[float] = None
    lon_8_cde_exit: Optional[float] = None
    
    checkpoint_10_e_arrival: Optional[str] = None
    lat_10_e_arrival: Optional[float] = None
    lon_10_e_arrival: Optional[float] = None
    
    checkpoint_11_e_arrival: Optional[str] = None
    lat_11_e_arrival: Optional[float] = None
    lon_11_e_arrival: Optional[float] = None
    
    checkpoint_11_e_exit: Optional[str] = None
    lat_11_e_exit: Optional[float] = None
    lon_11_e_exit: Optional[float] = None
    
    checkpoint_ab_exit: Optional[str] = None
    lat_ab_exit: Optional[float] = None
    lon_ab_exit: Optional[float] = None

class PanasonicCheckpointCreate(PanasonicCheckpointBase):
    pass

class PanasonicCheckpointResponse(PanasonicCheckpointBase):
    id: int
    user_id: int
    timestamp: datetime
    user: Optional[dict] = None  # Información del usuario

    class Config:
        from_attributes = True

class PanasonicQualityCheckBase(BaseModel):
    session_id: str
    project_id: int
    phase: str  # 'categorizacion' o 'reempacado'
    
    # Respuestas de categorización (1-14)
    respuesta1: Optional[str] = None
    respuesta2: Optional[str] = None
    escaneo2: Optional[str] = None
    respuesta3: Optional[str] = None
    respuesta4: Optional[str] = None
    respuesta5: Optional[str] = None
    respuesta6: Optional[str] = None
    respuesta7: Optional[str] = None
    respuesta8: Optional[str] = None
    respuesta9: Optional[str] = None
    escaneo9: Optional[str] = None
    respuesta10: Optional[str] = None
    respuesta11: Optional[str] = None
    respuesta12: Optional[str] = None
    respuesta13: Optional[str] = None
    respuesta14: Optional[str] = None
    
    # Respuestas de reempacado (15-21)
    respuesta15: Optional[str] = None
    escaneo15: Optional[str] = None
    respuesta16: Optional[str] = None
    respuesta17: Optional[str] = None
    escaneo17: Optional[str] = None
    respuesta18: Optional[str] = None
    respuesta19: Optional[str] = None
    respuesta20: Optional[str] = None
    respuesta21: Optional[str] = None
    
    # Campos para categorías de baterías (pregunta 14)
    battery1_code: Optional[str] = None
    battery1_category: Optional[str] = None
    battery2_code: Optional[str] = None
    battery2_category: Optional[str] = None
    
    # Campo para tiempo promedio por caja (en segundos)
    avg_box_time: Optional[int] = None

class PanasonicQualityCheckCreate(PanasonicQualityCheckBase):
    pass

class PanasonicQualityCheckResponse(PanasonicQualityCheckBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class BatteryCategoryUpdate(BaseModel):
    batteryCode1: str
    category1: str
    batteryCode2: str
    category2: str
    projectId: int
    sessionId: str

class PanasonicFlowBase(BaseModel):
    boxcode: str
    boxcode2: Optional[str] = None
    batterycode: str
    batterycode2: Optional[str] = None
    batterycode3: Optional[str] = None
    batterycode4: Optional[str] = None
    project_id: int
    latitude: float
    longitude: float
    lat2: Optional[float] = None
    lon2: Optional[float] = None
    lat3: Optional[float] = None
    lon3: Optional[float] = None
    lat4: Optional[float] = None
    lon4: Optional[float] = None
    timestamp: datetime
    status: str = "ok"
    categorie: str
    boxtimestamp: datetime

class PanasonicFlowCreate(PanasonicFlowBase):
    pass

class PanasonicFlowResponse(PanasonicFlowBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class PanasonicQualityCheck(PanasonicQualityCheckResponse):
    pass

# Esquemas para Issues
class IssueBase(BaseModel):
    type: str
    part_number_vin: str
    project: str
    location: str
    description: Optional[str] = None

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseModel):
    type: Optional[str] = None
    part_number_vin: Optional[str] = None
    project: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None

class IssueResponse(IssueBase):
    id: int
    date_reported: date
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Esquema para asignación de proyectos
class ProjectAssignmentRequest(BaseModel):
    project_id: int
    action: str  # "assign" o "unassign"

