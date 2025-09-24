import os
import shutil
from fastapi import UploadFile
from pathlib import Path
from datetime import datetime

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)  # Crear directorio si no existe

# También crear subdirectorios
(UPLOAD_DIR / "avatars").mkdir(exist_ok=True)
(UPLOAD_DIR / "contracts").mkdir(exist_ok=True)

async def save_upload_file(upload_file: UploadFile, folder: str) -> str:
    # Crear directorios si no existen
    save_dir = UPLOAD_DIR / folder
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # Generar nombre único para el archivo
    file_name = f"{datetime.now().timestamp()}_{upload_file.filename}"
    file_path = save_dir / file_name
    
    # Guardar el archivo
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    # Retornar la URL relativa
    return f"/uploads/{folder}/{file_name}" 