from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import SessionLocal
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_auth():
    db = SessionLocal()
    try:
        # 1. Crear un usuario de prueba
        test_password = "test123"
        test_hash = pwd_context.hash(test_password)
        
        test_user = models.User(
            email="test@test.com",
            username="test@test.com",
            full_name="Test User",
            hashed_password=test_hash,
            role="admin",
            is_active=True,
            status="activo",
            company_id=1
        )
        
        # Limpiar usuarios existentes
        db.query(models.User).delete()
        db.commit()
        
        # Guardar usuario de prueba
        db.add(test_user)
        db.commit()
        
        # 2. Recuperar el usuario y verificar la contraseña
        saved_user = db.query(models.User).first()
        print("\nUsuario guardado:")
        print(f"Email: {saved_user.email}")
        print(f"Hash guardado: {saved_user.hashed_password}")
        
        # 3. Probar verificación
        result = pwd_context.verify(test_password, saved_user.hashed_password)
        print(f"\nVerificación de contraseña:")
        print(f"Contraseña probada: {test_password}")
        print(f"¿Coincide?: {result}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_auth() 