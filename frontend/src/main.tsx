import "./index.css"
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// 1. Configuramos el Router
const router = createRouter({ routeTree });

// Registramos el router para que TypeScript te dé autocompletado en los <Link>
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// 2. Configuramos el Query Client
const queryClient = new QueryClient();

// 3. Renderizamos
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);