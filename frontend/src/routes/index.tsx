import { createFileRoute } from '@tanstack/react-router';
// Asumo que moviste el componente PanelControl a un archivo separado, 
// o simplemente pega todo el código del PanelControl de Shadcn aquí.
// import { PanelControl } from '@/components/PanelControl'; 

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight mb-4">Dashboard Principal</h2>
      {/* <PanelControl /> */}
    </div>
  );
}