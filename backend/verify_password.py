from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_admin_password():
    db = SessionLocal()
    try:
        # Obtener el usuario admin
        admin = db.query(models.User).filter_by(email="admin@apizhe.com").first()
        if not admin:
            print("Admin no encontrado")
            return
        
        # Probar la contraseña
        test_password = "admin123"
        stored_hash = admin.hashed_password
        
        # Crear un nuevo hash para comparar
        new_hash = pwd_context.hash(test_password)
        
        print(f"\nPrueba de contraseña para {admin.email}:")
        print(f"Hash almacenado: {stored_hash}")
        print(f"Nuevo hash: {new_hash}")
        print(f"¿Coinciden?: {pwd_context.verify(test_password, stored_hash)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    verify_admin_password() 