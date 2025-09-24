from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Dict, List
import httpx
import os
from dotenv import load_dotenv
from database import get_db
from models import Project  # Asegúrate de que este import existe
from pydantic import BaseModel
import pandas as pd
import io
import logging
import json
import numpy as np
from sqlalchemy import text

load_dotenv()

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

NEXUS_USERNAME = os.getenv("NEXUS_USERNAME")
NEXUS_PASSWORD = os.getenv("NEXUS_PASSWORD")
NEXUS_BASE_URL = os.getenv("NEXUS_BASE_URL")

class SearchProjectRequest(BaseModel):
    project_name: str

class ViewReportRequest(BaseModel):
    project_name: str

@router.post("/nexus-login")
async def nexus_login():
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Login inicial
            form_data = {
                "Username": NEXUS_USERNAME,
                "Password": NEXUS_PASSWORD
            }

            login_response = await client.post(
                f"{NEXUS_BASE_URL}/global/home/login",
                data=form_data,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            )

            if login_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al acceder a Nexus: {login_response.status_code}"
                )

            # Cerrar el banner de 2FA
            await client.post(
                f"{NEXUS_BASE_URL}/profile/close-2fa-warning",
                cookies=login_response.cookies,
                headers={"X-Requested-With": "XMLHttpRequest"}
            )

            # Navegar al dashboard
            dashboard_response = await client.get(
                f"{NEXUS_BASE_URL}/reporting/dashboard",
                cookies=login_response.cookies
            )

            if dashboard_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al acceder al dashboard: {dashboard_response.status_code}"
                )

            return {
                "status": "success",
                "message": "Acceso al dashboard exitoso",
                "cookies": dict(dashboard_response.cookies)
            }

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión con Nexus: {str(e)}"
        )

@router.get("/fetch-active-projects")
async def fetch_active_projects(db: Session = Depends(get_db)):
    try:
        # Obtener todos los proyectos activos
        active_projects = db.query(Project).filter(Project.status == 'activo').all()
        
        # Convertir a diccionario para la respuesta
        projects_data = [{
            "id": project.id,
            "name": project.name,
            "client": project.client,
            "project_type": project.project_type,
            "progress": float(project.progress) if project.progress else 0,
            "total_parts": project.total_parts,
            "completed_parts": project.completed_parts
        } for project in active_projects]

        return {
            "status": "success",
            "count": len(projects_data),
            "projects": projects_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener proyectos activos: {str(e)}"
        )

@router.post("/search-project")
async def search_project(request: SearchProjectRequest):
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Primero hacer login y obtener cookies
            login_result = await nexus_login()
            cookies = login_result["cookies"]

            # Realizar la búsqueda usando el formulario completo
            form_data = {
                "searchTerm": request.project_name,
                "status": "1"  # 1 = In Progress
            }

            search_response = await client.post(
                f"{NEXUS_BASE_URL}/reporting/dashboard/search",
                data=form_data,
                cookies=cookies,
                headers={
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )

            if search_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al buscar proyecto: {search_response.status_code}"
                )

            # Manejar la respuesta de manera más segura
            try:
                search_data = search_response.json()
            except:
                # Si no es JSON, devolver el texto de la respuesta
                return {
                    "status": "success",
                    "message": f"Búsqueda realizada para: {request.project_name}",
                    "search_results": search_response.text
                }

            return {
                "status": "success",
                "message": f"Búsqueda realizada para: {request.project_name}",
                "search_results": search_data
            }

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión con Nexus: {str(e)}"
        )

@router.post("/click-view-report")
async def click_view_report(request: ViewReportRequest):
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # Primero hacer login y obtener cookies
            login_result = await nexus_login()
            cookies = login_result["cookies"]

            # Buscar el proyecto para obtener su reportId
            form_data = {
                "searchTerm": request.project_name,
                "status": "1"  # 1 = In Progress
            }

            search_response = await client.post(
                f"{NEXUS_BASE_URL}/reporting/dashboard/search",
                data=form_data,
                cookies=cookies,
                headers={
                    "Accept": "text/html",
                    "X-Requested-With": "XMLHttpRequest"
                }
            )

            if search_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al buscar proyecto: {search_response.status_code}"
                )

            # Extraer el reportId del HTML de respuesta
            # Aquí asumimos que el reportId está en la URL como en el ejemplo
            report_url = "/reporting/dashboard/view?reportId=9837"

            # Hacer clic en View Report (navegar a la URL del reporte)
            report_response = await client.get(
                f"{NEXUS_BASE_URL}{report_url}",
                cookies=cookies,
                headers={
                    "Accept": "text/html",
                    "Referer": f"{NEXUS_BASE_URL}/reporting/dashboard"
                }
            )

            if report_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error al acceder al reporte: {report_response.status_code}"
                )

            return {
                "status": "success",
                "message": "Reporte accedido correctamente",
                "report_id": "9837"  # Este ID lo extraeremos dinámicamente
            }

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión con Nexus: {str(e)}"
        )

@router.post("/download-excel-report")
async def download_excel_report(report_id: str = "9837", db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            # 1. Login
            form_data = {
                "Username": NEXUS_USERNAME,
                "Password": NEXUS_PASSWORD
            }
            
            login_response = await client.post(
                f"{NEXUS_BASE_URL}/global/home/login",
                data=form_data,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
                }
            )
            
            cookies = dict(login_response.cookies)
            
            # 2. Generar el reporte Excel
            report_response = await client.post(
                f"{NEXUS_BASE_URL}/reporting/dashboard/report/{report_id}",
                cookies=cookies,
                headers={
                    "Accept": "*/*",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": f"{NEXUS_BASE_URL}/reporting/modules/dashboard?reportId={report_id}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
                }
            )

            print(f"Report Response Status: {report_response.status_code}")
            print(f"Report Response Content: {report_response.text[:200]}")

            try:
                report_data = report_response.json()
                download_url = report_data.get('redirectUrl')
                
                if not download_url:
                    print("No redirectUrl found in response")
                    print(f"Full response data: {report_data}")
                    raise HTTPException(
                        status_code=400,
                        detail="URL de descarga no encontrada en la respuesta"
                    )

                print(f"Download URL: {download_url}")

                # 3. Descargar el Excel
                excel_response = await client.get(
                    download_url,
                    cookies=cookies,
                    headers={
                        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
                    }
                )

                print(f"Excel Response Status: {excel_response.status_code}")
                print(f"Excel Content Type: {excel_response.headers.get('content-type')}")
                print(f"Excel Content Length: {len(excel_response.content)}")

                # 4. Procesar el Excel
                print("📥 Iniciando procesamiento del Excel...")
                excel_content = io.BytesIO(excel_response.content)
                
                # 1. Leer el Excel y verificar la pestaña "All"
                print("📋 Buscando pestaña 'All' en el Excel...")
                df = pd.read_excel(
                    excel_content,
                    sheet_name="All",
                    engine='openpyxl'
                )
                print("✅ Pestaña 'All' encontrada")

                # 2. Verificar las columnas requeridas
                required_columns = [
                    "Traceability",
                    "Flash Status",
                    "Ending Part Identifier",
                    "Date Completed",
                    "Username",
                    "Project Name"
                ]
                
                print("\n📋 Verificando columnas requeridas:")
                for col in required_columns:
                    if col in df.columns:
                        print(f"✅ Columna encontrada: {col}")
                    else:
                        print(f"❌ Columna faltante: {col}")
                        raise ValueError(f"Columna requerida no encontrada: {col}")

                # 3. Preparar datos para la base de datos
                print("\n🔄 Preparando datos para la base de datos...")
                records_to_insert = []
                for _, row in df.iterrows():
                    record = {
                        "traceability": row["Traceability"],
                        "flash_status": row["Flash Status"],
                        "ending_part_identifier": row["Ending Part Identifier"],
                        "date_completed": pd.to_datetime(row["Date Completed"]),
                        "username": row["Username"],
                        "project_name": row["Project Name"]
                    }
                    records_to_insert.append(record)

                print(f"✅ {len(records_to_insert)} registros preparados")

                # 4. Insertar en la base de datos
                print("\n💾 Insertando registros en la base de datos...")
                try:
                    for record in records_to_insert:
                        db.execute(
                            text("""
                            INSERT INTO project_updates 
                            (traceability, flash_status, ending_part_identifier, 
                             date_completed, username, project_name)
                            VALUES 
                            (:traceability, :flash_status, :ending_part_identifier,
                             :date_completed, :username, :project_name)
                            """),
                            record
                        )
                    db.commit()
                    print(f"✅ {len(records_to_insert)} registros insertados exitosamente")

                    # Primero, veamos los datos detallados
                    print("\n🔍 Analizando registros únicos...")
                    detailed_count = db.execute(
                        text("""
                        WITH LatestUpdates AS (
                            SELECT 
                                project_name,
                                traceability,
                                flash_status,
                                date_completed,
                                ROW_NUMBER() OVER (
                                    PARTITION BY traceability 
                                    ORDER BY date_completed DESC
                                ) as rn
                            FROM project_updates
                            WHERE flash_status = 'Updated'
                        )
                        SELECT 
                            project_name,
                            traceability,
                            date_completed,
                            rn
                        FROM LatestUpdates
                        ORDER BY project_name, traceability, date_completed DESC
                        """)
                    ).fetchall()

                    # Imprimir detalles para debugging
                    print("\n📊 Detalles de registros:")
                    for record in detailed_count:
                        print(f"Proyecto: {record[0]} | Traceability: {record[1]} | Fecha: {record[2]} | RN: {record[3]}")

                    # Ahora sí, hacer el conteo final
                    print("\n🔄 Actualizando completed_parts en proyectos...")

                    # Usar la consulta que sabemos que funciona
                    updated_parts_count = db.execute(
                        text("""
                        SELECT project_name, COUNT(DISTINCT traceability) as updated_count
                        FROM project_updates
                        WHERE flash_status = 'Updated'
                        GROUP BY project_name
                        """)
                    ).fetchall()

                    # Actualizar cada proyecto
                    for project_data in updated_parts_count:
                        project_name = project_data[0]
                        updated_count = project_data[1]
                        
                        print(f"📊 Proyecto: {project_name} - Partes únicas actualizadas: {updated_count}")
                        
                        db.execute(
                            text("""
                            UPDATE projects
                            SET completed_parts = :updated_count
                            WHERE name = :project_name
                            """),
                            {
                                "updated_count": updated_count,
                                "project_name": project_name
                            }
                        )
                    
                    db.commit()
                    print("✅ Proyectos actualizados correctamente con conteo de partes únicas")

                    # Incluir la información de actualización en la respuesta
                    return {
                        "status": "success",
                        "message": f"Excel procesado y {len(records_to_insert)} registros guardados",
                        "data": {
                            "total_records": len(records_to_insert),
                            "projects_updated": [
                                {
                                    "project_name": p[0],
                                    "completed_parts": p[1]
                                } for p in updated_parts_count
                            ]
                        }
                    }

                except Exception as db_error:
                    db.rollback()
                    print(f"❌ Error en la base de datos: {str(db_error)}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Error al guardar en la base de datos: {str(db_error)}"
                    )

            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {str(e)}")
                print(f"Raw response: {report_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Respuesta inválida del servidor"
                )

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        ) 