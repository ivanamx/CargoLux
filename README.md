# ControlAsist - Sistema de Control de Asistencia

Sistema profesional de control de asistencia y gestión de proyectos para empresas.

## Características

- ✅ Control de asistencia con geolocalización
- ✅ Gestión de proyectos y equipos
- ✅ Notificaciones push
- ✅ Reportes y estadísticas
- ✅ Gestión de usuarios y roles
- ✅ API REST con FastAPI
- ✅ Frontend React con TypeScript

## Tecnologías

### Backend
- **FastAPI** - Framework web moderno y rápido
- **PostgreSQL** - Base de datos relacional
- **SQLAlchemy** - ORM para Python
- **Alembic** - Migraciones de base de datos
- **Python-JOSE** - Autenticación JWT
- **PyMuPDF** - Procesamiento de documentos PDF

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - JavaScript con tipado estático
- **Vite** - Herramienta de construcción rápida
- **Tailwind CSS** - Framework de CSS utilitario

## Instalación y Configuración

### Prerrequisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 17+
- Git

### Backend

1. Clonar el repositorio:
```bash
git clone <tu-repositorio>
cd controlasist/backend
```

2. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
cp .env.production .env
# Editar .env con tus configuraciones
```

5. Configurar base de datos:
```bash
# Crear base de datos PostgreSQL
createdb controlasist

# Ejecutar migraciones
alembic upgrade head
```

6. Ejecutar servidor:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

1. Navegar al directorio frontend:
```bash
cd ../frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.production .env
# Editar .env con tu URL de API
```

4. Ejecutar en desarrollo:
```bash
npm run dev
```

5. Construir para producción:
```bash
npm run build
```

## Despliegue en Producción

### Servidor VPS

1. **Configurar servidor**:
   - Instalar Python 3.11+, Node.js 18+, PostgreSQL 17+
   - Configurar Nginx como proxy reverso
   - Configurar SSL con Let's Encrypt

2. **Clonar repositorio**:
```bash
git clone <tu-repositorio>
cd controlasist
```

3. **Configurar backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.production .env
# Configurar .env con datos de producción
alembic upgrade head
```

4. **Configurar frontend**:
```bash
cd ../frontend
npm install
npm run build
cp .env.production .env
# Configurar .env con URL de producción
```

5. **Configurar servicio systemd**:
```bash
# Crear servicio para el backend
sudo systemctl enable controlasist-backend
sudo systemctl start controlasist-backend
```

## Estructura del Proyecto

```
controlasist/
├── backend/                 # API FastAPI
│   ├── app/                # Aplicación principal
│   ├── alembic/            # Migraciones de BD
│   ├── uploads/            # Archivos subidos
│   ├── main.py             # Punto de entrada
│   ├── models.py           # Modelos de BD
│   ├── database.py         # Configuración de BD
│   ├── requirements.txt    # Dependencias Python
│   └── .env.production     # Variables de entorno
├── frontend/               # Aplicación React
│   ├── src/               # Código fuente
│   ├── public/            # Archivos públicos
│   ├── package.json       # Dependencias Node.js
│   └── .env.production    # Variables de entorno
└── README.md              # Este archivo
```

## Variables de Entorno

### Backend (.env)
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/controlasist
SECRET_KEY=tu_clave_secreta_muy_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=https://cargolux.lat
VAPID_PRIVATE_KEY=tu_clave_privada_vapid
VAPID_PUBLIC_KEY=tu_clave_publica_vapid
```

### Frontend (.env)
```env
VITE_API_URL=https://cargolux.lat
VITE_APP_NAME=CargoLux
```

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para soporte técnico, contacta a: [tu-email@ejemplo.com]
