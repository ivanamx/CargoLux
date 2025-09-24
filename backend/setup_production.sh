#!/bin/bash

# Script de configuración para producción
echo "=== Configurando entorno de producción ==="

# Crear archivo .env desde la plantilla
if [ ! -f .env ]; then
    echo "Creando archivo .env..."
    cp env.production .env
    echo "Archivo .env creado"
else
    echo "Archivo .env ya existe"
fi

# Crear directorios necesarios
echo "Creando directorios..."
mkdir -p uploads/avatars
mkdir -p uploads/contracts
mkdir -p uploads/project_documents
mkdir -p logs

# Establecer permisos
echo "Estableciendo permisos..."
chmod 755 uploads
chmod 755 uploads/avatars
chmod 755 uploads/contracts
chmod 755 uploads/project_documents
chmod 755 logs

# Verificar conexión a la base de datos
echo "Verificando conexión a la base de datos..."
python3 -c "
from database import engine
try:
    with engine.connect() as conn:
        print('✓ Conexión a base de datos exitosa')
except Exception as e:
    print(f'✗ Error conectando a la base de datos: {e}')
    exit(1)
"

# Ejecutar migraciones si existen
if [ -d "alembic" ]; then
    echo "Ejecutando migraciones..."
    alembic upgrade head
fi

echo "=== Configuración completada ==="
echo "Próximos pasos:"
echo "1. Editar el archivo .env con las configuraciones correctas"
echo "2. Configurar el servicio systemd"
echo "3. Configurar Nginx"
echo "4. Iniciar la aplicación" 