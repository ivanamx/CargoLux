#!/bin/bash

# Script de despliegue para apizhe.lat
# Uso: ./deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de ControlAsist para apizhe.lat..."

# Variables
DOMAIN="apizhe.lat"
PROJECT_DIR="/var/www/apizhe.lat"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# 1. Construir el frontend
print_status "Construyendo frontend..."
cd frontend
npm install
npm run build
print_status "Frontend construido exitosamente"

# 2. Preparar el backend
print_status "Preparando backend..."
cd ../backend

# Activar entorno virtual si existe
if [ -d "checksystem" ]; then
    print_status "Activando entorno virtual..."
    source checksystem/Scripts/activate
fi

# Instalar dependencias si es necesario
if [ -f "requirements.txt" ]; then
    print_status "Instalando dependencias de Python..."
    pip install -r requirements.txt
fi

# 3. Crear directorio de producción si no existe
print_status "Creando estructura de directorios..."
sudo mkdir -p $PROJECT_DIR
sudo mkdir -p $PROJECT_DIR/backend
sudo mkdir -p $PROJECT_DIR/frontend
sudo mkdir -p $PROJECT_DIR/logs

# 4. Copiar archivos
print_status "Copiando archivos..."
sudo cp -r backend/* $BACKEND_DIR/
sudo cp -r frontend/dist/* $FRONTEND_DIR/

# 5. Configurar permisos
print_status "Configurando permisos..."
sudo chown -R www-data:www-data $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR
sudo chmod -R 777 $BACKEND_DIR/uploads

# 6. Configurar Nginx
print_status "Configurando Nginx..."
sudo cp etc/nginx/sites-available/apizhe.lat /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/apizhe.lat /etc/nginx/sites-enabled/

# 7. Verificar configuración de Nginx
print_status "Verificando configuración de Nginx..."
sudo nginx -t

# 8. Crear servicio systemd para el backend
print_status "Configurando servicio systemd..."
sudo tee /etc/systemd/system/controlasist.service > /dev/null <<EOF
[Unit]
Description=ControlAsist FastAPI Backend
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$BACKEND_DIR/checksystem/Scripts
ExecStart=$BACKEND_DIR/checksystem/Scripts/python.exe run_production.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 9. Recargar systemd y habilitar servicio
sudo systemctl daemon-reload
sudo systemctl enable controlasist
sudo systemctl restart controlasist

# 10. Reiniciar Nginx
print_status "Reiniciando Nginx..."
sudo systemctl restart nginx

# 11. Verificar estado de los servicios
print_status "Verificando estado de los servicios..."
sudo systemctl status controlasist --no-pager
sudo systemctl status nginx --no-pager

# 12. Verificar conectividad
print_status "Verificando conectividad..."
sleep 5
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    print_status "✅ Sitio web accesible en https://$DOMAIN"
else
    print_warning "⚠️  El sitio web no responde correctamente. Verifica la configuración."
fi

print_status "🎉 Despliegue completado exitosamente!"
print_status "🌐 Frontend: https://$DOMAIN"
print_status "🔧 API: https://$DOMAIN/api"
print_status "📊 Health check: https://$DOMAIN/health"

echo ""
print_status "Comandos útiles:"
echo "  - Ver logs del backend: sudo journalctl -u controlasist -f"
echo "  - Ver logs de Nginx: sudo tail -f /var/log/nginx/apizhe.lat.error.log"
echo "  - Reiniciar backend: sudo systemctl restart controlasist"
echo "  - Reiniciar Nginx: sudo systemctl restart nginx" 