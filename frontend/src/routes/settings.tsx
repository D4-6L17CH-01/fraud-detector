import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../shared/components/ui/card';
import { Button } from '../shared/components/ui/button';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración del Motor</h2>
        <p className="text-muted-foreground">
          Ajustes del modelo de IA y conexión con el software contable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sensibilidad del Modelo</CardTitle>
          <CardDescription>
            Ajusta qué tan paranoica es la IA al momento de clasificar un fraude.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm text-center text-muted-foreground">
              (Aquí pondrás tus controles deslizantes en el futuro para ajustar el umbral de detección)
            </p>
          </div>
          <Button variant="default">Guardar Cambios</Button>
        </CardContent>
      </Card>
    </div>
  );
}