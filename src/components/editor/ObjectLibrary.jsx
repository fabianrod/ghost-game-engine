import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Box, Cylinder } from 'lucide-react';

/**
 * Panel lateral que muestra los objetos disponibles para agregar al nivel
 * Incluye modelos 3D y colliders invisibles
 */
export const ObjectLibrary = ({ models, onAddObject, onAddCollider }) => {
  // Colliders disponibles
  const colliders = [
    { type: 'cylinder', name: 'Collider Cilíndrico', icon: Cylinder },
    { type: 'box', name: 'Collider de Caja', icon: Box },
  ];

  return (
    <div className="w-[240px] border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Objetos Disponibles</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Sección de Colliders */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Colliders (Invisibles)
            </h4>
            <div className="space-y-2">
              {colliders.map((collider, index) => {
                const Icon = collider.icon;
                return (
                  <TooltipProvider key={`collider-${index}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card
                          className="cursor-pointer transition-all hover:border-primary hover:bg-accent/50 border-l-4 border-l-orange-500"
                          onClick={() => onAddCollider && onAddCollider(collider.type)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-orange-500" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {collider.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Invisible en juego
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click para agregar {collider.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Sección de Modelos 3D */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Modelos 3D
            </h4>
            {models.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay objetos disponibles.
                    <br />
                    <span className="text-xs">Agrega modelos GLB en src/assets/models/</span>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {models.map((model, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card
                          className="cursor-pointer transition-all hover:border-primary hover:bg-accent/50"
                          onClick={() => onAddObject(model.path)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-lg">
                                📦
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {model.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {model.path.split('/').pop()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs break-all">{model.path}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
