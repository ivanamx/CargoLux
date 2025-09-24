# 🚀 Guía de Despliegue - ControlAsist para apizhe.lat

## 📋 Requisitos Previos

### Servidor
- Ubuntu 20.04+ o Debian 11+
- Nginx
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Certbot (para SSL)

### Dominio
- Dominio configurado: `apizhe.lat`
- DNS apuntando al servidor
- Certificado SSL (Let's Encrypt)

## 🔧 Configuración del Servidor

### 1. Instalar dependencias del sistema
```bash
sudo apt update
sudo apt install -y nginx python3 python3-pip python3-venv nodejs npm postgresql postgresql-contrib certbot python3-certbot-nginx
```

### 2. Configurar PostgreSQL
```bash
sudo -u postgres createuser --interactive
sudo -u postgres createdb controlasist
```

### 3. Configurar Nginx
```bash
# Copiar configuración
sudo cp etc/nginx/sites-available/apizhe.lat /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/apizhe.lat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Obtener certificado SSL
```bash
sudo certbot --nginx -d apizhe.lat -d www.apizhe.lat
```

## 🚀 Despliegue Automatizado

### Opción 1: Script automático
```bash
chmod +x deploy.sh
./deploy.sh
```

### Opción 2: Despliegue manual

#### Frontend
```bash
cd frontend
npm install
npm run build
```

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_production.py
```

## 📁 Estructura de Directorios

```
/var/www/apizhe.lat/
├── backend/           # API FastAPI
├── frontend/          # React app (dist)
├── logs/             # Logs de la aplicación
└── uploads/          # Archivos subidos
```

## 🔧 Configuración de Entorno

### Variables de entorno del frontend
```bash
# frontend/.env.production
VITE_API_URL=https://api.apizhe.lat
VITE_APP_NAME=ControlAsist
VITE_APP_VERSION=1.0.0
```

### Variables de entorno del backend
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost/controlasist
SECRET_KEY=your-secret-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

## 🛠️ Comandos de Mantenimiento

### Verificar estado de servicios
```bash
sudo systemctl status controlasist
sudo systemctl status nginx
```

### Ver logs
```bash
# Backend
sudo journalctl -u controlasist -f

# Nginx
sudo tail -f /var/log/nginx/apizhe.lat.error.log
sudo tail -f /var/log/nginx/apizhe.lat.access.log
```

### Reiniciar servicios
```bash
sudo systemctl restart controlasist
sudo systemctl restart nginx
```

### Actualizar aplicación
```bash
# Detener servicios
sudo systemctl stop controlasist

# Actualizar código
git pull origin main

# Reconstruir frontend
cd frontend && npm run build

# Reiniciar servicios
sudo systemctl start controlasist
```

## 🔒 Seguridad

### Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Certificados SSL
```bash
# Renovar automáticamente
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoreo

### Health Check
- Frontend: `https://apizhe.lat`
- API: `https://apizhe.lat/health`
- Base de datos: `https://apizhe.lat/api/test-db`

### Métricas
- Logs de acceso: `/var/log/nginx/apizhe.lat.access.log`
- Logs de error: `/var/log/nginx/apizhe.lat.error.log`
- Logs de aplicación: `sudo journalctl -u controlasist`

## 🆘 Solución de Problemas

### Error 502 Bad Gateway
```bash
# Verificar si el backend está corriendo
sudo systemctl status controlasist

# Verificar puerto
sudo netstat -tlnp | grep :8000

# Reiniciar backend
sudo systemctl restart controlasist
```

### Error de base de datos
```bash
# Verificar conexión
sudo -u postgres psql -d controlasist

# Verificar logs
sudo journalctl -u controlasist | grep -i database
```

### Error de SSL
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew
```

## 📞 Contacto

Para soporte técnico:
- Email: admin@apizhe.lat
- Documentación: https://apizhe.lat/docs 