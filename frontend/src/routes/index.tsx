import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw, AlertTriangle, CheckCircle2,
  Activity, DollarSign, ShieldCheck, FileWarning,
  ServerCrash, FileSpreadsheet, Upload
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../shared/components/ui/table';
import { Button } from '../shared/components/ui/button';
import { Badge } from '../shared/components/ui/badge';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: DashboardPrincipal,
});

// Tipos estrictos para que el compilador no sufra
interface Deteccion {
  tipo_documento: string;
  id: number;
  numero: number;
  es_fraude: number;
  fecha: string;
  payload: Record<string, any>;
}

function DashboardPrincipal() {
  const [isUploading, setIsUploading] = useState(false);

  // El esclavo asíncrono que hace el trabajo sucio por la red
  const { data: historial, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['historial_fraudes'],
    queryFn: async (): Promise<Deteccion[]> => {
      const res = await fetch('http://127.0.0.1:8000/history');
      if (!res.ok) throw new Error('El backend se fue a tomar un café');
      return res.json();
    },
    refetchInterval: 5000, // Actualiza cada 5 segundos para ese efecto "Tiempo Real"
  });

  // --- FUNCIÓN 1: EXPORTAR EXCEL PURAMENTE DESDE REACT ---
  const descargarExcel = () => {
    if (!historial || historial.length === 0) {
      alert("No hay datos para exportar. Felicita al contador.");
      return;
    }

    // Mapeamos el JSON asqueroso de la base de datos a algo que un humano entienda
    const datosFormateados = historial.map((tx: any) => ({
      'Tipo Doc': tx.tipo_documento,
      'Comprobante': tx.numero,
      'Alerta Fraude': tx.es_fraude ? '⚠️ ANOMALÍA' : '✅ VERIFICADO',
      'Tipo Análisis': tx.tipo_fraude,
      'Fecha Auditoría': new Date(tx.fecha).toLocaleString(),
      'Monto Base': parseFloat(tx.payload.c1105 || tx.payload.c1110 || '0')
    }));

    // Magia de SheetJS
    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Auditoría");

    // Esto fuerza la descarga del archivo sin tocar Tauri ni Python
    XLSX.writeFile(libro, "reporte_auditoria_fraudes.xlsx");

    alert("🎉 ¡Reporte exportado con éxito!\n\nEl archivo 'reporte_auditoria_fraudes.xlsx' se ha generado correctamente y ya se encuentra disponible en tu carpeta de 'Descargas' de Windows.");
  }

  // --- FUNCIÓN 2: PARSEAR CSV EN REACT Y MANDAR JSON A PYTHON ---
  const manejarSubidaCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = event.target.files;
    if (!archivos || archivos.length === 0) return;

    const archivoCSV = archivos[0];
    setIsUploading(true);

    Papa.parse(archivoCSV, {
      header: true, // Asume que la primera fila tiene los nombres de columnas (numero, tipo, c1105, etc.)
      skipEmptyLines: true,
      complete: async (resultados) => {
        const transaccionesJSON = resultados.data;

        try {
          // Disparamos el JSON masivo a nuestro nuevo endpoint perezoso
          const respuesta = await fetch('http://127.0.0.1:8000/detect-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaccionesJSON),
          });

          const resultado = await respuesta.json();
          if (resultado.status === 'ok') {
            alert(`Éxito: Se procesaron ${resultado.procesados} transacciones. Anomalías: ${resultado.fraudes}`);
            refetch(); // Refresca la tabla
          } else {
            alert(`El backend entró en pánico: ${resultado.detail}`);
          }
        } catch (error) {
          alert("El Sidecar de Python no responde. O está muerto o el JSON era muy gordo.");
        } finally {
          setIsUploading(false);
          event.target.value = ''; // Limpiar el input para volver a subir el mismo archivo si quieres
        }

      },
      error: (error) => {
        alert("Error leyendo el CSV. Dile al contador que lo guarde bien.");
        console.error('Error info',error)
        setIsUploading(false);
      }
    })
  }

  // Calculamos métricas inútiles pero visualmente impresionantes para los gerentes
  const totalTransacciones = historial?.length || 0;
  const fraudesDetectados = historial?.filter(t => t.es_fraude).length || 0;
  const transaccionesLimpias = totalTransacciones - fraudesDetectados;

  // Sumamos los montos (rezando para que tu PUC tenga el monto en la c1105 o c1110)
  const montoAnalizado = historial?.reduce((acumulador, tx) => {
    const valor = tx.payload.c1105 || tx.payload.c1110 || 0;
    // Parche rápido por si algún monto viene como string
    return acumulador + (typeof valor === 'string' ? parseFloat(valor) || 0 : valor);
  }, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
        <Activity className="mr-2 h-6 w-6 animate-spin" />
        Analizando libros contables...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-destructive">
        <ServerCrash className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Pérdida de conexión con la IA</h2>
        <p className="text-muted-foreground">Revisa si el sidecar de Python sigue vivo.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Centro de Mando Antifraude</h2>
          <p className="text-muted-foreground">Monitoreo automatizado de los estados financieros.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Descargar Excel */}
          <Button variant="outline" onClick={descargarExcel} className="flex items-center gap-2 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Exportar Excel
          </Button>

          {/* Input Oculto y Botón de Carga CSV */}
          <div className="relative">
            {/* El input real está invisible, porque los inputs de tipo file de HTML5 son horribles */}
            <input
              type="file"
              accept=".csv"
              id="csv-uploader"
              className="sr-only"
              onChange={manejarSubidaCSV}
              disabled={isUploading}
            />
            {/* Usamos el label para engañar al usuario y que haga clic en un botón bonito de Shadcn */}
            <label htmlFor="csv-uploader">
              <Button variant="default" asChild disabled={isUploading} className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <Upload className={`h-4 w-4 ${isUploading ? 'animate-bounce' : ''}`} />
                  {isUploading ? 'Procesando masivo...' : 'Cargar CSV'}
                </span>
              </Button>
            </label>
          </div>

        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analizado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransacciones}</div>
            <p className="text-xs text-muted-foreground">Transacciones procesadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Detectado</CardTitle>
            <FileWarning className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fraudesDetectados}</div>
            <p className="text-xs text-muted-foreground">Posibles anomalías</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operaciones Limpias</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{transaccionesLimpias}</div>
            <p className="text-xs text-muted-foreground">Superaron el umbral de confianza</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volumen Monetario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${montoAnalizado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Capital bajo auditoría</p>
          </CardContent>
        </Card>
      </div>

      {/* --- LA TABLA DE RESULTADOS --- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Flujo de Transacciones</CardTitle>
            <CardDescription>
              Últimas {historial?.length} operaciones evaluadas por el modelo.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Tipo Doc</TableHead>
                  <TableHead className="w-[120px]">Comprobante</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado de Auditoría</TableHead>
                  <TableHead className="text-right">Monto (PUC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial?.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{row.tipo_documento}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">
                      #{row.numero.toString().padStart(6, '0')}
                    </TableCell>
                    <TableCell>{new Date(row.fecha).toLocaleString()}</TableCell>
                    <TableCell>
                      {row.es_fraude ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1 shadow-sm">
                          <AlertTriangle className="h-3 w-3" /> Anomalía
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex w-fit items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                          <CheckCircle2 className="h-3 w-3" /> Verificado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {/* Formateamos el dinero para que se vea profesional */}
                      ${parseFloat(row.payload.c1105 || row.payload.c1110 || '0').toLocaleString('es-CO')}
                    </TableCell>
                  </TableRow>
                ))}

                {(!historial || historial.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      Esperando integración. No hay datos en la base local.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}