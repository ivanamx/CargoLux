from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
import models

# Crear el hash de la contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_client():
    db = SessionLocal()
    try:
        # Crear cliente de prueba
        client_password = "client123"
        client_hash = pwd_context.hash(client_password)
        
        client = models.User(
            email="client@apizhe.com",
            username="client@apizhe.com",
            full_name="Cliente Prueba",
            hashed_password=client_hash,
            role="client",
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
        
        # Verificar si el cliente ya existe
        existing_client = db.query(models.User).filter_by(email="client@apizhe.com").first()
        if existing_client:
            print("El cliente ya existe. Actualizando...")
            existing_client.hashed_password = client_hash
            existing_client.role = "client"
            existing_client.full_name = "Cliente Prueba"
            existing_client.is_active = True
            existing_client.status = "activo"
            existing_client.company_id = 1
        else:
            # Agregar cliente
            db.add(client)
        
        db.commit()
        
        # Verificar que se guardó correctamente
        client_saved = db.query(models.User).filter_by(email="client@apizhe.com").first()
        
        # Probar verificación
        client_verify = pwd_context.verify(client_password, client_saved.hashed_password)
        
        print("\nUsuario cliente creado/actualizado:")
        print(f"Email: {client_saved.email}")
        print(f"Nombre: {client_saved.full_name}")
        print(f"Rol: {client_saved.role}")
        print(f"Verificación de contraseña: {client_verify}")
        print(f"Contraseña: {client_password}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_client()
