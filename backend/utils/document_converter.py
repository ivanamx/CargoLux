from PIL import Image
import fitz  # PyMuPDF
from docx2pdf import convert
import io
import os
from typing import Union, BinaryIO, Tuple
from fastapi import UploadFile
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)  # Crear directorio si no existe

# También crear subdirectorios
(UPLOAD_DIR / "avatars").mkdir(exist_ok=True)
(UPLOAD_DIR / "contracts").mkdir(exist_ok=True)
(UPLOAD_DIR / "project_documents").mkdir(exist_ok=True)  # Agregar directorio para documentos de proyectos

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

async def convert_to_pdf(file: UploadFile) -> Tuple[bytes, str]:
    """
    Convierte varios tipos de archivo a PDF.
    Retorna: (bytes del archivo convertido, nuevo nombre de archivo)
    """
    content_type = file.content_type
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Crear un archivo temporal para guardar el contenido
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        if content_type in ['image/jpeg', 'image/png']:
            # Convertir imagen a PDF
            image = Image.open(temp_path)
            pdf_bytes = io.BytesIO()
            image.convert('RGB').save(pdf_bytes, format='PDF')
            new_filename = os.path.splitext(file.filename)[0] + '.pdf'
            return pdf_bytes.getvalue(), new_filename

        elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'application/msword']:
            # Convertir Word a PDF
            pdf_path = temp_path + '.pdf'
            convert(temp_path, pdf_path)
            with open(pdf_path, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
            new_filename = os.path.splitext(file.filename)[0] + '.pdf'
            os.remove(pdf_path)
            return pdf_content, new_filename

        elif content_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'application/vnd.ms-excel']:
            # No convertir Excel, devolverlo tal cual
            await file.seek(0)
            return await file.read(), file.filename

        elif content_type == 'application/pdf':
            # Ya es PDF, devolverlo tal cual
            return content, file.filename

        else:
            raise ValueError(f"Tipo de archivo no soportado: {content_type}")

    finally:
        # Limpiar archivo temporal
        os.unlink(temp_path)