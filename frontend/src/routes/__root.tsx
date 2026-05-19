import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Command } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LayoutDashboard, Settings, ShieldAlert, Activity, ServerCrash } from 'lucide-react';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [backendStatus, setBackendStatus] = useState('Durmiendo');

  // Toda la nigromancia del proceso hijo que teníamos en App.tsx viene a vivir aquí
  useEffect(() => {
    let iaCommand: Command<any>;

    const arrancarMotor = async () => {
      try {
        setBackendStatus('Despertando IA...');
        iaCommand = Command.sidecar('binaries/motor_ia');

        iaCommand.on('close', () => setBackendStatus('Muerto'));
        iaCommand.on('error', () => setBackendStatus('Error fatal'));

        await iaCommand.spawn();
        setBackendStatus('En línea');
      } catch (e) {
        console.error("Fallo al iniciar el sidecar", e);
      }
    };

    arrancarMotor();

    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      setBackendStatus('Asesinando backend...');
      try {
        await fetch('http://127.0.0.1:8000/suicidio', { method: 'POST' });
      } catch (e) { }
      await appWindow.destroy();
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  // Clases de Tailwind para los links inactivos y activos
  const navLinkClasses = "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-muted-foreground hover:text-primary hover:bg-muted";
  const activeLinkClasses = "bg-primary/10 text-primary hover:bg-primary/20";

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* --- LA BARRA LATERAL (SIDEBAR) --- */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          {/* Título y Logo */}
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <span className="">Detector 3000</span>
            </Link>
          </div>

          {/* Navegación principal */}
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-4 space-y-1">
              <Link to="/" className={navLinkClasses} activeProps={{ className: activeLinkClasses }}>
                <LayoutDashboard className="h-4 w-4" />
                Panel de Control
              </Link>
              <Link to="/settings" className={navLinkClasses} activeProps={{ className: activeLinkClasses }}>
                <Settings className="h-4 w-4" />
                Configuración
              </Link>
            </nav>
          </div>

          {/* Tarjeta de estado del servidor en la parte inferior */}
          <div className="mt-auto p-4">
            <div className={`flex items-center gap-3 rounded-lg border p-3 text-sm shadow-sm ${backendStatus === 'En línea' ? 'bg-background' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
              {backendStatus === 'En línea' ? (
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              ) : (
                <ServerCrash className="h-4 w-4" />
              )}
              <div className="grid flex-1">
                <span className="font-medium">Motor de IA</span>
                <span className="text-xs text-muted-foreground">{backendStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- EL CONTENIDO PRINCIPAL --- */}
      <div className="flex flex-col">
        {/* Encabezado superior (Header) para pantallas pequeñas o breadcrumbs */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1">
            <h1 className="text-sm font-medium text-muted-foreground">Sistema de Prevención de Fraudes Contables</h1>
          </div>
        </header>

        {/* Aquí es donde TanStack inyectará Index o Settings según la URL */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}