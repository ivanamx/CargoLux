from database import SessionLocal
from models import Admin

def check_existing_admins():
    db = SessionLocal()
    admins = db.query(Admin).all()
    
    print("\nAdministradores registrados:")
    print("-" * 50)
    for admin in admins:
        print(f"Email: {admin.email}")
        print(f"Nombre: {admin.full_name}")
        print(f"Company ID: {admin.company_id}")
        print("-" * 50)
    
    db.close()

if __name__ == "__main__":
    check_existing_admins() 