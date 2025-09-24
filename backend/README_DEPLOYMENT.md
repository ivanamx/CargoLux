# Guía de Despliegue - ControlAsist

## Requisitos Previos

- Ubuntu 20.04+ o similar
- Python 3.8+
- PostgreSQL 12+
- Nginx
- Certbot (para SSL)

## Pasos de Despliegue

### 1. Preparación del Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Crear usuario para la aplicación
sudo useradd -r -s /bin/false www-data
```

### 2. Configuración de PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE controlasist;
CREATE USER postgres WITH PASSWORD 'Montufar87$';
GRANT ALL PRIVILEGES ON DATABASE controlasist TO postgres;
\q

# Restaurar backup (si existe)
psql -U postgres -d controlasist -f backup_final.sql
```

### 3. Configuración del Entorno Virtual

```bash
# Navegar al directorio del backend
cd /var/www/apizhe/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.production.txt
```

### 4. Configuración de la Aplicación

```bash
# Ejecutar script de configuración
bash setup_production.sh

# Editar archivo .env con configuraciones correctas
nano .env
```

### 5. Configuración de SSL

```bash
# Obtener certificado SSL
sudo certbot --nginx -d apizhe.lat -d www.apizhe.lat

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Despliegue Automático

```bash
# Ejecutar script de despliegue
bash deploy_production.sh
```

## Configuración Manual (si es necesario)

### Servicio Systemd

```bash
# Copiar archivo de servicio
sudo cp controlasist.service /etc/systemd/system/

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar y iniciar servicio
sudo systemctl enable controlasist
sudo systemctl start controlasist
```

### Nginx

```bash
# Crear configuración de sitio
sudo nano /etc/nginx/sites-available/apizhe.lat

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/apizhe.lat /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## Verificación

### Verificar Servicios

```bash
# Estado del servicio
sudo systemctl status controlasist

# Logs del servicio
sudo journalctl -u controlasist -f

# Estado de Nginx
sudo systemctl status nginx

# Verificar puerto
sudo netstat -tlnp | grep :8000
```

### Verificar Aplicación

```bash
# Health check
curl http://localhost:8000/health

# Verificar desde el navegador
https://apizhe.lat/health
```

## Mantenimiento

### Actualizaciones

```bash
# Detener servicio
sudo systemctl stop controlasist

# Actualizar código
git pull origin main

# Actualizar dependencias
source venv/bin/activate
pip install -r requirements.production.txt

# Reiniciar servicio
sudo systemctl start controlasist
```

### Logs

```bash
# Logs de la aplicación
sudo journalctl -u controlasist -f

# Logs de Nginx
sudo tail -f /var/log/nginx/apizhe.lat.access.log
sudo tail -f /var/log/nginx/apizhe.lat.error.log
```

### Backup

```bash
# Backup de base de datos
pg_dump -U postgres controlasist > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

## Solución de Problemas

### Error de Conexión a Base de Datos

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -U postgres -d controlasist -c "SELECT 1;"
```

### Error de Permisos

```bash
# Corregir permisos
sudo chown -R www-data:www-data /var/www/apizhe/backend
sudo chmod -R 755 /var/www/apizhe/backend/uploads
```

### Error de Puerto

```bash
# Verificar puerto en uso
sudo netstat -tlnp | grep :8000

# Matar proceso si es necesario
sudo kill -9 <PID>
```

## Variables de Entorno Importantes

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `SECRET_KEY`: Clave secreta para JWT (cambiar en producción)
- `VAPID_PRIVATE_KEY`: Clave privada para notificaciones push
- `VAPID_PUBLIC_KEY`: Clave pública para notificaciones push

## Contacto

Para soporte técnico, contactar al administrador del sistema. 