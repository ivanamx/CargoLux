from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
import models

# Crear el hash de la contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_users():
    db = SessionLocal()
    try:
        # Limpiar usuarios existentes
        db.query(models.User).delete()
        db.commit()
        
        # 1. Crear admin
        admin_password = "admin123"
        admin_hash = pwd_context.hash(admin_password)
        
        admin = models.User(
            email="admin@apizhe.com",
            username="admin@apizhe.com",
            full_name="Admin User",
            hashed_password=admin_hash,
            role="admin",
            is_active=True,
            status="activo",
            company_id=1
        )
        
        # 2. Crear técnico
        tech_password = "tech123"
        tech_hash = pwd_context.hash(tech_password)
        
        tech = models.User(
            email="tech@apizhe.com",
            username="tech@apizhe.com",
            full_name="Técnico Prueba",
            hashed_password=tech_hash,
            role="employee",
            is_active=True,
            status="activo",
            company_id=1
        )
        
        # Verificar/crear compañía
        company = db.query(models.Company).filter(models.Company.id == 1).first()
        if not company:
            company = models.Company(
                id=1,
                name="Apizhe"
            )
            db.add(company)
            db.commit()
        
        # Agregar usuarios
        db.add(admin)
        db.add(tech)
        db.commit()
        
        # Verificar que se guardaron correctamente
        admin_saved = db.query(models.User).filter_by(email="admin@apizhe.com").first()
        tech_saved = db.query(models.User).filter_by(email="tech@apizhe.com").first()
        
        # Probar verificación
        admin_verify = pwd_context.verify(admin_password, admin_saved.hashed_password)
        tech_verify = pwd_context.verify(tech_password, tech_saved.hashed_password)
        
        print("\nVerificación de contraseñas:")
        print(f"Admin ({admin_saved.email}): {admin_verify}")
        print(f"Tech ({tech_saved.email}): {tech_verify}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_users() 