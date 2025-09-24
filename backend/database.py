from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Usar PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Montufar87$@localhost:5432/controlasist?client_encoding=utf8&options=-c%20client_encoding=utf8"

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={
            "options": "-c client_encoding=utf8"
        }
    )
    # Verificar conexión
    with engine.connect() as conn:
        print("Conexión a base de datos exitosa")
        # Forzar UTF-8 en la sesión
        conn.execute(text("SET client_encoding TO 'UTF8';"))
except Exception as e:
    print(f"Error conectando a la base de datos: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        # Asegurar UTF-8 en cada conexión
        db.execute(text("SET client_encoding TO 'UTF8';"))
        yield db
    finally:
        db.close()