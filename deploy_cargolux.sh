#!/bin/bash

# Script de despliegue completo para cargolux.lat
set -e

echo "=== Despliegue de ControlAsist en cargolux.lat ==="

# Variables
APP_DIR="/var/www/cargolux"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVICE_NAME="controlasist"
NGINX_SITE="cargolux.lat"

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/main.py" ]; then
    echo "Error: No se encontró backend/main.py. Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

echo "1. Preparando directorios..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKEND_DIR
sudo mkdir -p $FRONTEND_DIR

echo "2. Copiando archivos del backend..."
sudo cp -r backend/* $BACKEND_DIR/
sudo chown -R controlasist:www-data $BACKEND_DIR

echo "3. Copiando archivos del frontend..."
sudo cp -r frontend/* $FRONTEND_DIR/
sudo chown -R controlasist:www-data $FRONTEND_DIR

echo "4. Configurando entorno del backend..."
cd $BACKEND_DIR
bash setup_cargolux.sh

echo "5. Instalando dependencias del frontend..."
cd $FRONTEND_DIR
npm install --production
npm run build

echo "6. Configurando servicio systemd..."
sudo cp controlasist_cargolux.service /etc/systemd/system/controlasist.service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

echo "7. Configurando Nginx..."
sudo cp nginx_cargolux.conf /etc/nginx/sites-available/$NGINX_SITE
sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "8. Verificando configuración de Nginx..."
sudo nginx -t

echo "9. Configurando SSL con Let's Encrypt..."
echo "IMPORTANTE: Asegúrate de que el dominio cargolux.lat apunte a este servidor"
read -p "¿El dominio cargolux.lat ya apunta a este servidor? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d cargolux.lat -d www.cargolux.lat --non-interactive --agree-tos --email admin@cargolux.lat
else
    echo "Configurando SSL manualmente después..."
fi

echo "10. Reiniciando servicios..."
sudo systemctl restart nginx
sudo systemctl start $SERVICE_NAME

echo "11. Verificando estado de servicios..."
sudo systemctl status $SERVICE_NAME --no-pager
sudo systemctl status nginx --no-pager

echo "12. Verificando conectividad..."
sleep 5
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ API backend funcionando correctamente"
else
    echo "✗ Error: API backend no responde"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 20
    exit 1
fi

echo ""
echo "=== Despliegue completado exitosamente ==="
echo "La aplicación está disponible en: https://cargolux.lat"
echo ""
echo "Próximos pasos:"
echo "1. Verificar que el dominio cargolux.lat apunte a este servidor"
echo "2. Configurar SSL si no se hizo automáticamente"
echo "3. Configurar backup automático"
echo "4. Monitorear logs: sudo journalctl -u controlasist -f"
