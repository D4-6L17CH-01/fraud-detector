import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, AlertTriangle, CheckCircle2, 
  Activity, DollarSign, ShieldCheck, FileWarning, 
  ServerCrash
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../shared/components/ui/table';
import { Button } from '../shared/components/ui/button';
import { Badge } from '../shared/components/ui/badge';

export const Route = createFileRoute('/')({
  component: DashboardPrincipal,
});

// Tipos estrictos para que el compilador no sufra
interface Deteccion {
  id: number;
  numero: number;
  es_fraude: number;
  fecha: string;
  payload: Record<string, any>;
}

function DashboardPrincipal() {
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Centro de Mando Antifraude</h2>
        <p className="text-muted-foreground">
          Monitoreo automatizado de los estados financieros.
        </p>
      </div>

      {/* --- LAS TARJETAS DE MÉTRICAS (KPIs) --- */}
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
                  <TableHead className="w-[120px]">Comprobante</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado de Auditoría</TableHead>
                  <TableHead className="text-right">Monto (PUC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial?.map((row) => (
                  <TableRow key={row.id}>
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