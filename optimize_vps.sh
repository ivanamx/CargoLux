#!/bin/bash

# Script de optimización para VPS de 2GB RAM
echo "=== Optimizando VPS para ControlAsist ==="

# 1. Optimizaciones del sistema
echo "1. Aplicando optimizaciones del sistema..."

# Configurar swap
echo "Configurando swap..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimizaciones de memoria
echo "Aplicando optimizaciones de memoria..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# Optimizaciones para 2GB RAM
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_ratio=15
vm.dirty_background_ratio=5
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 65536 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
EOF

# Aplicar cambios inmediatamente
sudo sysctl -p

# 2. Optimizaciones de PostgreSQL
echo "2. Optimizando PostgreSQL..."
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
max_wal_size = 1GB
min_wal_size = 80MB
checkpoint_timeout = 5min
EOF

# 3. Optimizaciones de Nginx
echo "3. Optimizando Nginx..."
sudo tee -a /etc/nginx/nginx.conf > /dev/null <<EOF

# Optimizaciones para 2GB RAM
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Optimizaciones de memoria
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# 4. Configurar logrotate
echo "4. Configurando rotación de logs..."
sudo tee /etc/logrotate.d/controlasist > /dev/null <<EOF
/var/log/nginx/cargolux.lat.*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# 5. Configurar monitoreo básico
echo "5. Configurando monitoreo básico..."
sudo apt install -y htop iotop nethogs

# 6. Configurar backup automático
echo "6. Configurando backup automático..."
sudo tee /usr/local/bin/backup_controlasist.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/controlasist"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U controlasist controlasist > $BACKUP_DIR/db_backup_$DATE.sql

# Backup de archivos
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /var/www/cargolux/backend/uploads/

# Limpiar backups antiguos (mantener 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup_controlasist.sh

# Agregar al crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup_controlasist.sh") | crontab -

# 7. Configurar firewall
echo "7. Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 8. Reiniciar servicios
echo "8. Reiniciando servicios..."
sudo systemctl restart postgresql
sudo systemctl restart nginx

echo ""
echo "=== Optimización completada ==="
echo "Optimizaciones aplicadas:"
echo "✓ Swap de 2GB configurado"
echo "✓ Optimizaciones de memoria aplicadas"
echo "✓ PostgreSQL optimizado para 2GB RAM"
echo "✓ Nginx optimizado"
echo "✓ Logrotate configurado"
echo "✓ Backup automático configurado"
echo "✓ Firewall configurado"
echo ""
echo "Reinicia el servidor para aplicar todas las optimizaciones:"
echo "sudo reboot"
