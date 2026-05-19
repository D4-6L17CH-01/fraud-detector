import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useEffect, useState } from 'react';
import { Command } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
      } catch (e) {}
      await appWindow.destroy(); 
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Tu barra de navegación empresarial */}
      <header className="border-b px-6 py-3 flex justify-between items-center bg-card">
        <h1 className="font-bold text-xl">Detector de Fraudes 3000</h1>
        <div className="flex gap-4 items-center">
          <nav className="flex gap-4 mr-4 text-sm font-medium">
            <Link to="/" className="[&.active]:text-primary text-muted-foreground hover:text-primary">
              Panel
            </Link>
            {/* Aquí agregarás tus futuras rutas, como /configuracion */}
          </nav>
          <span className="text-xs bg-secondary px-2 py-1 rounded-md">
            Motor: {backendStatus}
          </span>
        </div>
      </header>

      {/* Aquí es donde TanStack inyectará las demás páginas */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>

      {/* Quita esto en producción para que el tribunal no vea tus trampas */}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}