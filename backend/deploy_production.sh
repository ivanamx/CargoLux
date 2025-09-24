#!/bin/bash

# Script de despliegue completo para producción
set -e

echo "=== Despliegue de ControlAsist en Producción ==="

# Variables
APP_DIR="/var/www/apizhe/backend"
SERVICE_NAME="controlasist"
NGINX_SITE="apizhe.lat"

# Verificar que estamos en el directorio correcto
if [ ! -f "main.py" ]; then
    echo "Error: No se encontró main.py. Ejecuta este script desde el directorio backend/"
    exit 1
fi

echo "1. Configurando entorno..."
bash setup_production.sh

echo "2. Configurando servicio systemd..."
sudo cp controlasist.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

echo "3. Configurando Nginx..."
sudo cp /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-available/$NGINX_SITE.backup
sudo tee /etc/nginx/sites-available/$NGINX_SITE > /dev/null <<EOF
server {
    listen 80;
    server_name apizhe.lat www.apizhe.lat;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name apizhe.lat www.apizhe.lat;

    ssl_certificate /etc/letsencrypt/live/apizhe.lat/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apizhe.lat/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        root /var/www/apizhe/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }

    access_log /var/log/nginx/apizhe.lat.access.log;
    error_log /var/log/nginx/apizhe.lat.error.log;
}
EOF

echo "4. Verificando configuración de Nginx..."
sudo nginx -t

echo "5. Reiniciando servicios..."
sudo systemctl restart nginx
sudo systemctl start $SERVICE_NAME

echo "6. Verificando estado de servicios..."
sudo systemctl status $SERVICE_NAME --no-pager

echo "7. Verificando conectividad..."
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
echo "La aplicación está disponible en: https://apizhe.lat" 