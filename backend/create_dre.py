from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
import models

# Crear el hash de la contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_dre():
    db = SessionLocal()
    try:
        # Crear usuario DRE de prueba
        dre_password = "dre123"
        dre_hash = pwd_context.hash(dre_password)
        
        dre_user = models.User(
            email="dre@apizhe.com",
            username="dre@apizhe.com",
            full_name="Usuario DRE",
            hashed_password=dre_hash,
            role="dre",
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
        
        # Verificar si el usuario DRE ya existe
        existing_dre = db.query(models.User).filter_by(email="dre@apizhe.com").first()
        if existing_dre:
            print("El usuario DRE ya existe. Actualizando...")
            existing_dre.hashed_password = dre_hash
            existing_dre.role = "dre"
            existing_dre.full_name = "Usuario DRE"
            existing_dre.is_active = True
            existing_dre.status = "activo"
            existing_dre.company_id = 1
        else:
            # Agregar usuario DRE
            db.add(dre_user)
        
        db.commit()
        
        # Verificar que se guardó correctamente
        dre_saved = db.query(models.User).filter_by(email="dre@apizhe.com").first()
        
        # Probar verificación
        dre_verify = pwd_context.verify(dre_password, dre_saved.hashed_password)
        
        print("\nUsuario DRE creado/actualizado:")
        print(f"Email: {dre_saved.email}")
        print(f"Nombre: {dre_saved.full_name}")
        print(f"Rol: {dre_saved.role}")
        print(f"Verificación de contraseña: {dre_verify}")
        print(f"Contraseña: {dre_password}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_dre()
