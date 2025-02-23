from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
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
    email: EmailStr
    username: str
    full_name: str
    role: str
    company_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
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

class ProjectBase(BaseModel):
    name: str
    status: str
    client: str
    start_date: datetime
    end_date: datetime
    progress: float
    total_parts: int
    completed_parts: int
    city_image: str
    
class ProjectCreate(ProjectBase):
    company_id: int
    
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    completed_parts: Optional[int] = None

class Project(ProjectBase):
    id: int
    company_id: int
    created_at: datetime
    location: Optional[dict] = None
    documents: List[dict] = []
    equipment: List[str] = []
    last_technician: dict = {}
    
    class Config:
        from_attributes = True

class Credentials(BaseModel):
    username: str
    password: str

class TimeEntryCreate(BaseModel):
    user_id: int
    project_id: int
    hours: float
    description: Optional[str] = None

class TimeEntry(BaseModel):
    id: int
    user_id: int
    project_id: int
    hours: float
    description: Optional[str]
    status: str
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
    email: EmailStr
    name: str
    company_id: int

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PushSubscription(BaseModel):
    subscription_info: dict 

    class Config:
        from_attributes = True

