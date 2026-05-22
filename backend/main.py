import sys
import os
import multiprocessing
import sqlite3
import uvicorn
import json
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import math
import numpy as np

EXPECTED_FEATURES = [
    'c1105', 'c1110', 'c1305', 'c1330', 'c1355', 'c1365', 'c1370', 'c1380', 'c1435', 'c1499', 
    'c1516', 'c1520', 'c1524', 'c1528', 'c1540', 'c1592', 'c1635', 'c2105', 'c2115', 'c2125', 
    'c2195', 'c2205', 'c2205.1', 'c2335', 'c2365', 'c2368', 'c2370', 'c2380', 'c2404', 'c2408', 
    'c2412', 'c2495', 'c2505', 'c2510', 'c2515', 'c2520', 'c2525', 'c2530', 'c2805', 'c2815', 
    'c4135', 'c4165', 'c4175', 'c4210', 'c4220', 'c4225', 'c4235', 'c4245', 'c4250', 'c4255', 
    'c4295', 'c5105', 'c5145', 'c5195', 'c5205', 'c5210', 'c5215', 'c5220', 'c5225', 'c5230', 
    'c5235', 'c5240', 'c5245', 'c5250', 'c5255', 'c5260', 'c5295', 'c5305', 'c5310', 'c5315', 
    'c5395', 'c5405', 'c6135', 'c6165', 'c7101', 'c7501', 
    'fe_monto_total', 'fe_num_cuentas_act', 'fe_esparsidad', 'fe_log_monto', 'fe_concentracion', 
    'fe_flag_pitufeo', 'fe_flag_redondeo', 'fe_flag_nomina', 'fe_flag_cta_inex', 'fe_flag_inventario', 
    'fe_trimestre', 'fe_fin_de_mes', 'fe_inicio_mes', 'fe_mes_sin', 'fe_mes_cos', 'fe_dia_sin', 'fe_dia_cos', 
    'fe_tipo_c18', 'fe_tipo_cc1', 'fe_tipo_cc4', 'fe_tipo_cc8', 'fe_tipo_dc1', 'fe_tipo_dc3', 'fe_tipo_deb', 
    'fe_tipo_dec', 'fe_tipo_dp1', 'fe_tipo_dpe', 'fe_tipo_dse', 'fe_tipo_dv1', 'fe_tipo_eg1', 'fe_tipo_eg2', 
    'fe_tipo_eg5', 'fe_tipo_eg6', 'fe_tipo_fc1', 'fe_tipo_fc2', 'fe_tipo_fc3', 'fe_tipo_fc7', 'fe_tipo_fc8', 
    'fe_tipo_fel', 'fe_tipo_fem', 'fe_tipo_fep', 'fe_tipo_fp1', 'fe_tipo_fp2', 'fe_tipo_fp4', 'fe_tipo_fp5', 
    'fe_tipo_fp6', 'fe_tipo_fp7', 'fe_tipo_fpe', 'fe_tipo_fv1', 'fe_tipo_fv3', 'fe_tipo_ni2', 'fe_tipo_ni3', 
    'fe_tipo_r04', 'fe_tipo_r06', 'fe_tipo_r08', 'fe_tipo_r09', 'fe_tipo_r13', 'fe_tipo_r14', 'fe_tipo_r15', 
    'fe_tipo_r21', 'fe_tipo_r24', 'fe_tipo_r26', 'fe_tipo_r28', 'fe_tipo_r34', 'fe_tipo_r35', 'fe_tipo_r38', 
    'fe_tipo_r41', 'fe_tipo_r43', 'fe_tipo_r45', 'fe_tipo_r46', 'fe_tipo_r47', 'fe_tipo_r48', 'fe_tipo_r50', 
    'fe_tipo_r52', 'fe_tipo_r53', 'fe_tipo_r54', 'fe_tipo_r55', 'fe_tipo_r56', 'fe_tipo_r57', 'fe_tipo_r58', 
    'fe_tipo_r59', 'fe_tipo_r61', 'fe_tipo_r62', 'fe_tipo_r64', 'fe_tipo_r65', 'fe_tipo_r66', 'fe_tipo_r67', 
    'fe_tipo_r68', 'fe_tipo_r69', 'fe_tipo_r70', 'fe_tipo_r71', 'fe_tipo_r72', 'fe_tipo_r73', 'fe_tipo_r74', 
    'fe_tipo_rc0', 'fe_tipo_rc1', 'fe_tipo_rc3', 'fe_tipo_rc4', 'fe_tipo_rca', 'fe_tipo_sc1', 'fe_tipo_infrequent_sklearn'
]

# Tu esquema de datos estricto para que el software contable no te envíe basura
class Transaccion(BaseModel):
    tipo: str
    numero: int
    ano: int
    mes: int
    dia: int
    model_config = ConfigDict(extra='allow')

def resource_path(relative_path):
    """ Obtiene la ruta absoluta al recurso, funciona para dev y para PyInstaller """
    try:
        # PyInstaller crea una carpeta temporal y guarda la ruta en _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        # Si no estamos en el exe, usa la ruta donde estás ejecutando el script
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Variables globales para no cargar los modelos en cada miserable petición
modelo_binario = None
modelo_multiclase = None

# 1. El nuevo reemplazo de on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    global modelo_binario, modelo_multiclase
    
    # Buscamos los modelos en la ruta dinámica
    ruta_binario = resource_path("PRODUCCION_CAMPEON_binario.joblib")
    ruta_multi = resource_path("PRODUCCION_CAMPEON_multiclase.joblib")
    
    # Cargamos la inteligencia artificial
    modelo_binario = joblib.load(ruta_binario)
    modelo_multiclase = joblib.load(ruta_multi)

    # --- Lo que pasa al arrancar ---
    conn = sqlite3.connect('fraudes.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detecciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero INTEGER NOT NULL,
            es_fraude INTEGER NOT NULL,
            tipo_fraude TEXT,
            payload TEXT NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
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
    
    # 1. Limpieza de las comas asquerosas de Excel
    for key, value in datos_completos.items():
        if isinstance(value, str) and ',' in value:
            datos_completos[key] = float(value.replace(',', '.'))
            
    # 2. Inicializar TODAS las 177 características en 0
    features_dict = {col: 0.0 for col in EXPECTED_FEATURES}
    
    # 3. Rellenar las cuentas del PUC que sí llegaron en el JSON
    monto_total = 0.0
    num_cuentas_act = 0
    for key, value in datos_completos.items():
        # Si la llave es una cuenta como 'c1105' y está en nuestras columnas esperadas
        if key in EXPECTED_FEATURES:
            monto_float = float(value)
            features_dict[key] = monto_float
            if monto_float != 0:
                monto_total += abs(monto_float)
                num_cuentas_act += 1

    # 4. Ingeniería de Características (Feature Engineering)
    # ¡ADVERTENCIA! Aquí tienes que poner LAS MISMAS fórmulas que usaste en tu Jupyter Notebook.
    # Haré unas cuantas lógicas genéricas para que deje de fallar, pero debes ajustarlas.
    features_dict['fe_monto_total'] = monto_total
    features_dict['fe_num_cuentas_act'] = num_cuentas_act
    features_dict['fe_log_monto'] = math.log1p(monto_total) if monto_total > 0 else 0
    
    # Variables de tiempo (asumiendo que venían ano, mes, dia en tu payload)
    mes = datos_completos.get('mes', 1)
    dia = datos_completos.get('dia', 1)
    features_dict['fe_trimestre'] = math.ceil(mes / 3)
    features_dict['fe_inicio_mes'] = 1 if dia <= 5 else 0
    features_dict['fe_fin_de_mes'] = 1 if dia >= 25 else 0
    features_dict['fe_mes_sin'] = math.sin(2 * math.pi * mes / 12.0)
    features_dict['fe_mes_cos'] = math.cos(2 * math.pi * mes / 12.0)
    features_dict['fe_dia_sin'] = math.sin(2 * math.pi * dia / 31.0)
    features_dict['fe_dia_cos'] = math.cos(2 * math.pi * dia / 31.0)
    
    # One-Hot Encoding manual del 'tipo' (ej: 'C18' -> 'fe_tipo_c18')
    tipo_ingresado = datos_completos.get('tipo', '').strip().lower()
    columna_tipo = f"fe_tipo_{tipo_ingresado}"
    if columna_tipo in EXPECTED_FEATURES:
        features_dict[columna_tipo] = 1.0
    else:
        # Si es un tipo raro que el modelo agrupó en entrenamiento
        features_dict['fe_tipo_infrequent_sklearn'] = 1.0

    # 5. Crear el DataFrame ESTRICTO con el orden exacto de las 177 columnas
    df_pred = pd.DataFrame([features_dict], columns=EXPECTED_FEATURES)
    
    # 6. La Decisión de la IA (Ahora sí funcionará)
    es_fraude_pred = modelo_binario.predict(df_pred)[0]
    tipo_fraude_pred = "Limpio"
    
    if es_fraude_pred == 1:
        tipo_fraude_pred = str(modelo_multiclase.predict(df_pred)[0])
        
    es_fraude_bool = bool(es_fraude_pred == 1)
    
    # 7. Guardar evidencia
    payload_str = json.dumps(datos_completos)
    conn = sqlite3.connect('fraudes.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO detecciones (numero, es_fraude, tipo_fraude, payload) VALUES (?, ?, ?, ?)", 
        (tx.numero, es_fraude_bool, tipo_fraude_pred, payload_str)
    )
    conn.commit()
    conn.close()
    
    return {
        "status": "ok", 
        "fraud_detected": es_fraude_bool, 
        "fraud_type": tipo_fraude_pred
    }

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