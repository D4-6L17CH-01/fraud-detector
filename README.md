# Sistema de Prevención de Fraudes Financieros (Detector 3000)

## 1. Descripción General del Proyecto

Este sistema es una solución de auditoría contable y detección de anomalías financieras orientada al ecosistema empresarial colombiano. El software se integra de manera no invasiva con sistemas contables de terceros (ERP), capturando registros estructurados según el Plan Único de Cuentas (PUC) de Colombia.

A través de un motor local de Inteligencia Artificial fundamentado en modelos de Gradient Boosting (XGBoost), el sistema evalúa en tiempo real el riesgo de fraude de cada transacción, emitiendo un veredicto binario de alerta y una clasificación multiclase del tipo de anomalía detectada.

### 1.1 Arquitectura del Sistema

El aplicativo implementa una **arquitectura local desacoplada mediante el patrón Sidecar**, garantizando la soberanía absoluta de los datos financieros al ejecutar todo el procesamiento en el entorno local (`localhost`) del cliente, eliminando dependencias de red externa y vulnerabilidades en la nube.

* **Capa de Presentación (Frontend):** Construida sobre React, TypeScript y Tailwind CSS, utilizando componentes de alta fidelidad de Shadcn UI. La navegación interna está gobernada por `TanStack Router`, mientras que la sincronización asíncrona del flujo de datos contables se gestiona mediante `TanStack Query`.
* **Capa Core de Orquestación (Tauri):** Desarrollada en Rust, actúa como el anfitrión del sistema operativo. Gobierna el ciclo de vida del subproceso secundario y aplica interceptores nativos para asegurar el cierre coordinado de la infraestructura.
* **Capa de Inferencia (Backend Sidecar):** Una API REST de alta disponibilidad construida con FastAPI (Python 3.13). Carga en memoria RAM los estimadores matemáticos serializados y ejecuta un pipeline automático de *Feature Engineering* para expandir el payload crudo a las 177 características requeridas por los modelos.
* **Capa de Persistencia:** Base de datos embebida SQLite configurada en modo WAL (Write-Ahead Logging). Almacena de forma híbrida los metadatos indexables de la auditoría junto con el payload original en formato JSON.

---

## 2. Requisitos Previos del Sistema

Para compilar de extremo a extremo el proyecto, la estación de trabajo debe contar con los siguientes componentes globales:

* **Entorno Node.js:** Versión LTS activa (v20 o superior) y gestor de paquetes **`pnpm`**.
* **Entorno Python:** Versión 3.13.x con el gestor de entornos virtuales `venv`.
* **Entorno Rust:** Herramientas de compilación de Cargo y el compilador de Rust (`rustc`) instalados mediante `rustup`.
* **Herramientas de Windows:** Visual Studio Build Tools con soporte para C++ (requerido para los enlaces nativos de XGBoost).

---

## 3. Guía Paso a Paso para la Compilación del Proyecto

Siga estrictamente el orden secuencial descrito a continuación para asegurar el correcto acoplamiento de los componentes binarios.

### Paso 3.1: Configuración y Preparación del Entorno Backend

1. Ingrese al directorio del backend y cree un entorno virtual aislado:

```bash
cd backend
python -m venv venv

```

2. Active el entorno virtual (En Windows PowerShell):

```powershell
.\venv\Scripts\Activate.ps1

```

3. Instale las dependencias base de manipulación de datos, el framework de servicios y los motores de Machine Learning necesarios:

```bash
pip install pandas xgboost scikit-learn joblib fastapi uvicorn pyinstaller

```

4. Coloque los dos archivos de modelos serializados (`PRODUCCION_CAMPEON_binario.joblib` y `PRODUCCION_CAMPEON_multiclase.joblib`) directamente en la raíz de la carpeta `backend/`.

### Paso 3.2: Compilación Estática del Motor de IA en Python

Dado que XGBoost interactúa con librerías nativas dinámicas en C++, se debe ejecutar un empaquetado de recolección profunda utilizando PyInstaller.

Ejecute la compilación desde la raíz del entorno virtual del backend:

```powershell
pyinstaller --name motor_ia --onefile --noconsole --collect-all xgboost --copy-metadata xgboost --hidden-import="sklearn" --hidden-import="pandas" --hidden-import="joblib" --add-data "PRODUCCION_CAMPEON_binario.joblib;." --add-data "PRODUCCION_CAMPEON_multiclase.joblib;." main.py

```

* **Ubicación de Salida:** Tras finalizar el proceso, el binario independiente se generará en el directorio `backend/dist/motor_ia.exe`.

### Paso 3.3: Integración del Binario Sidecar en el Ecosistema Tauri

Tauri requiere un esquema de nomenclatura estricto basado en la arquitectura del sistema operativo para inyectar el subproceso secundario.

1. Navegue al directorio del frontend y asegúrese de que exista la ruta de destino:

```bash
cd ../frontend
mkdir -p src-tauri/binaries

```

2. Copie el archivo ejecutable hacia la carpeta interna de Tauri y renómbrelo de forma exacta (ejemplo para Windows 64-bit):

```powershell
copy ..\backend\dist\motor_ia.exe .\src-tauri\binaries\motor_ia-x86_64-pc-windows-msvc.exe

```

3. Verifique que el archivo `src-tauri/tauri.conf.json` declare de manera explícita el Sidecar dentro de su bloque de empaquetado:

```json
{
  "tauri": {
    "bundle": {
      "active": true,
      "targets": "all",
      "externalBin": [
        "binaries/motor_ia"
      ]
    }
  }
}

```

### Paso 3.4: Compilación de la Aplicación de Escritorio de Tauri

1. Estando en el directorio del frontend, instale las dependencias necesarias utilizando **`pnpm`**:

```bash
pnpm install

```

2. Inicie el empaquetado definitivo de la aplicación de escritorio:

```bash
pnpm tauri build

```

* **Ubicación del Instalador:** El instalador empaquetado en formato Microsoft Installer (`.msi`) se almacenará en:
`frontend/src-tauri/target/release/bundle/msi/Detector_de_Fraudes_3000_x64_en-US.msi`

---

## 4. Ejemplos de Transacciones para Pruebas (API REST)

Una vez desplegada la aplicación, el software contable externo puede interactuar mediante peticiones **POST** dirigidas al endpoint expuesto en la dirección: `http://127.0.0.1:8000/detect`.

### Ejemplo 4.1: Transacción Regular (Diagnóstico: Limpio)

Movimiento estándar de caja menor sin comportamiento anómalo.

```json
{
  "tipo": "C18",
  "numero": 1001,
  "ano": 2026,
  "mes": 5,
  "dia": 21,
  "c1105": 150000.0,
  "c1110": 0.0,
  "c1305": 0.0,
  "c2335": 150000.0,
  "c4135": 0.0,
  "c5105": 0.0
}

```

### Ejemplo 4.2: Alerta de Anomalía Crítica (Diagnóstico: Fraude)

Inyecta un volumen monetario desproporcionado en fechas de corte e incluye comas tipográficas para forzar la activación del pipeline de limpieza.

```json
{
  "tipo": "E22",
  "numero": 666,
  "ano": 2026,
  "mes": 12,
  "dia": 31,
  "c1105": "15000000,99",
  "c1110": "0,00",
  "c1524": 0.0,
  "c2105": 0.0,
  "c4135": "15000000,99",
  "c5105": 0.0,
  "c5220": "0,00"
}

```

### Ejemplo 4.3: Registro Híbrido Multicuenta (Prueba de Robustez)

Prueba la tolerancia estructural del backend y la expansión matricial a las características requeridas por XGBoost.

```json
{
  "tipo": "N01",
  "numero": 9999,
  "ano": 2026,
  "mes": 1,
  "dia": 1,
  "c1105": 0.0,
  "c1110": 5000.0,
  "c1305": "2000,50",
  "c1435": 3000.0,
  "c1524": 4000.0,
  "c2105": 10000.0,
  "c5105": 4000.0
}

```

---

## 5. Consideraciones Operativas de Seguridad

Para garantizar la estabilidad en entornos de producción, se deben vigilar estrictamente las siguientes directrices:

### 5.1 Contexto de Directorio de Trabajo (CWD) y SQLite

SQLite resuelve de forma relativa la base de datos local (`sqlite3.connect('fraudes.db')`). Al ejecutar la aplicación compilada, el proceso padre (Tauri) forzará al proceso Sidecar a inicializar su CWD en la carpeta del sistema de archivos de ejecución nativa.

* **Riesgo:** Archivos remanentes de bases de datos desactualizadas en los directorios de Tauri provocarán fallos de esquema al ejecutar inserciones.
* **Solución:** Purgar de manera integral cualquier instancia preexistente de `fraudes.db` en el árbol de directorios antes de levantar el entorno.

### 5.2 Ciclo de Vida del Proceso Hijo (Zombis del Sidecar)

* Para evitar que el servidor de FastAPI quede huérfano bloqueando el puerto `8000`, el frontend de Tauri intercepta de forma obligatoria el evento nativo de cierre (`onCloseRequested`).
* Esto fuerza una llamada al endpoint `/suicidio`, el cual ejecuta un comando de interrupción (`os._exit(0)`), garantizando la muerte inmediata del backend antes de que Tauri destruya el hilo gráfico principal.

### 5.3 Latencia de Arranque y Descompresión en RAM

Debido a la arquitectura `--onefile` de PyInstaller y las librerías C++ de XGBoost, el archivo `motor_ia.exe` se descomprime físicamente en tiempo de ejecución dentro de los directorios temporales.

* Esto introduce un retraso técnico latente (2 a 4 segundos) al iniciar la aplicación. La UI del frontend gestiona este retardo mostrando un estado asíncrono de suspensión controlado mediante TanStack Query ("*Despertando motor de IA...*") para mitigar la fricción en la experiencia del usuario.