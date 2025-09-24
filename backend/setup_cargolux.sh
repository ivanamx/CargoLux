#!/bin/bash

# Script de configuración para cargolux.lat
echo "=== Configurando ControlAsist para cargolux.lat ==="

# Variables
APP_DIR="/var/www/cargolux"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="controlasist"
DB_USER="controlasist"
DB_PASSWORD="TuPasswordSeguro123!"

# Crear directorios
echo "1. Creando estructura de directorios..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKEND_DIR
sudo mkdir -p $FRONTEND_DIR
sudo mkdir -p $BACKEND_DIR/uploads/avatars
sudo mkdir -p $BACKEND_DIR/uploads/contracts
sudo mkdir -p $BACKEND_DIR/uploads/project_documents
sudo mkdir -p $BACKEND_DIR/logs

# Crear usuario para la aplicación
echo "2. Configurando usuario de aplicación..."
sudo useradd -r -s /bin/false -d $APP_DIR controlasist 2>/dev/null || true
sudo usermod -aG www-data controlasist

# Configurar PostgreSQL
echo "3. Configurando base de datos..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

# Configurar archivo .env
echo "4. Configurando variables de entorno..."
if [ -f "$BACKEND_DIR/env.cargolux.production" ]; then
    cp $BACKEND_DIR/env.cargolux.production $BACKEND_DIR/.env
    echo "Archivo .env creado desde plantilla"
else
    echo "Error: No se encontró env.cargolux.production"
    exit 1
fi

# Establecer permisos
echo "5. Estableciendo permisos..."
sudo chown -R controlasist:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod -R 775 $BACKEND_DIR/uploads
sudo chmod -R 775 $BACKEND_DIR/logs

# Crear entorno virtual
echo "6. Creando entorno virtual Python..."
cd $BACKEND_DIR
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependencias
echo "7. Instalando dependencias Python..."
pip install --upgrade pip
pip install -r requirements.production.txt

# Configurar PostgreSQL optimizado para 2GB RAM
echo "8. Optimizando PostgreSQL para 2GB RAM..."
sudo tee -a /etc/postgresql/15/main/postgresql.conf > /dev/null <<EOF

# Optimizaciones para 2GB RAM
shared_buffers = 512MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 50
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
EOF

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar conexión a la base de datos
echo "9. Verificando conexión a la base de datos..."
python3 -c "
import os
os.environ['DATABASE_URL'] = 'postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME'
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
    echo "10. Ejecutando migraciones..."
    alembic upgrade head
fi

echo ""
echo "=== Configuración completada ==="
echo "Próximos pasos:"
echo "1. Subir el código del proyecto a $APP_DIR"
echo "2. Configurar el servicio systemd"
echo "3. Configurar Nginx"
echo "4. Configurar SSL con Let's Encrypt"
echo "5. Iniciar la aplicación"
