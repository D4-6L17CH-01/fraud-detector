import sys
import os
import multiprocessing
import sqlite3
import uvicorn
from fastapi import FastAPI
from typing import Any
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

# Tu esquema de datos estricto para que el software contable no te envíe basura
class Transaccion(BaseModel):
    tipo: str
    numero: int
    ano: int
    mes: int
    dia: int
    model_config = ConfigDict(extra='allow')

# 1. El nuevo reemplazo de on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Lo que pasa al arrancar ---
    conn = sqlite3.connect('fraudes.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detecciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero INTEGER NOT NULL,
            es_fraude INTEGER NOT NULL,
            payload TEXT NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()
    conn.close()
    
    yield # Aquí la aplicación se queda corriendo y escuchando peticiones
    # --- Lo que pasa al apagarse (puedes dejarlo vacío) ---
    pass

app = FastAPI(title="Motor de Detección de Fraudes", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # En una API web real poner ["*"] es motivo de despido, 
    # pero como esto es un proceso local anclado a un sidecar de escritorio, nos da exactamente igual.
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/suicidio")
def kill_server():
    os._exit(0)

@app.post("/detect")
def detect_fraud(tx: Transaccion):
    datos_completos = tx.model_dump()

    for key, value in datos_completos.items():
        if isinstance(value, str) and ',' in value:
            # Rezas para que sea un número
            datos_completos[key] = float(value.replace(',', '.'))
            
    # --- Magia de tu Modelo de IA aquí usando 'datos_completos' ---
    es_fraude = True

    import json
    payload_str = json.dumps(datos_completos)

    conn = sqlite3.connect('fraudes.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO detecciones (numero, es_fraude, payload) VALUES (?, ?, ?)", 
        (tx.numero, es_fraude, payload_str)
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "fraud_detected": es_fraude}


@app.get("/history")
def get_historial():
    conn = sqlite3.connect('fraudes.db')
    # Esto le dice a SQLite que devuelva diccionarios en lugar de tuplas primitivas
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    
    # Traemos las últimas 100 detecciones (no vayas a traer toda la base de datos o matarás el navegador)
    cursor.execute("SELECT * FROM detecciones ORDER BY fecha DESC LIMIT 100")
    filas = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Desempaquetamos el basurero JSON para que React reciba un objeto limpio
    for fila in filas:
        try:
            fila['payload'] = json.loads(fila['payload'])
        except Exception:
            # Si alguien metió basura que no es JSON, lo dejamos como string
            pass 
            
    return filas

# El bloque de ejecución sagrado
if __name__ == "__main__":
    # Si no pones esto, PyInstaller y multiprocesamiento de Windows crearán un 
    # bucle infinito de procesos hasta crashear tu PC. De nada.
    multiprocessing.freeze_support()
    
    # El parche de la invisibilidad que necesitamos para --noconsole
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")
    
    # IMPORTANTE: No uses reload=True aquí, o PyInstaller llorará.
    uvicorn.run(app, host="127.0.0.1", port=8000, use_colors=False)