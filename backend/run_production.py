#!/usr/bin/env python3
"""
Script para ejecutar el servidor FastAPI en modo producción
"""

import uvicorn
import os
from main import app

if __name__ == "__main__":
    # Configuración para producción
    host = os.getenv("HOST", "0.0.0.0")  # Escuchar en todas las interfaces
    port = int(os.getenv("PORT", "8000"))
    workers = int(os.getenv("WORKERS", "4"))
    
    print(f"🚀 Iniciando servidor de producción en {host}:{port}")
    print(f"👥 Workers: {workers}")
    print(f"🌐 Dominio: apizhe.lat")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        workers=workers,
        reload=False,  # Deshabilitar reload en producción
        access_log=True,
        log_level="info"
    ) 