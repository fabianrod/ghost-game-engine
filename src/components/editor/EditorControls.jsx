import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Move, RotateCw, Scale } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Componente para mostrar controles del editor y manejar atajos de teclado
 */
export const EditorControls = ({
  transformMode,
  onModeChange,
  snapEnabled,
  onSnapToggle,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Manejar arrastre del panel
  useEffect(() => {
    const handleMouseDown = (e) => {
      // Solo arrastrar desde el header
      if (!e.target.closest('.panel-header') || e.target.closest('.close-btn')) {
        return;
      }
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Limitar dentro de la ventana
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 320);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const header = panelRef.current?.querySelector('.panel-header');
    if (header) {
      header.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (header) {
        header.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [isDragging, dragOffset]);

  return (
    <Card
      ref={panelRef}
      className={`fixed z-[1000] w-[320px] max-h-[calc(100vh-40px)] backdrop-blur-lg bg-background/95 border shadow-lg ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <CardHeader className="panel-header cursor-grab active:cursor-grabbing border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Controles del Editor</CardTitle>
          {onClose && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 close-btn"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="max-h-[calc(100vh-200px)]">
        <CardContent className="p-4 space-y-4">
          {/* Modo de Transformación */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modo de Transformación
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={transformMode === 'translate' ? 'default' : 'outline'}
                      size="sm"
                      className="flex flex-col h-auto py-3"
                      onClick={() => onModeChange('translate')}
                    >
                      <Move className="h-4 w-4 mb-1" />
                      <span className="text-xs">Mover</span>
                      <kbd className="mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">
                        M
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mover objeto (M)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={transformMode === 'rotate' ? 'default' : 'outline'}
                      size="sm"
                      className="flex flex-col h-auto py-3"
                      onClick={() => onModeChange('rotate')}
                    >
                      <RotateCw className="h-4 w-4 mb-1" />
                      <span className="text-xs">Rotar</span>
                      <kbd className="mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">
                        R
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rotar objeto (R)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={transformMode === 'scale' ? 'default' : 'outline'}
                      size="sm"
                      className="flex flex-col h-auto py-3"
                      onClick={() => onModeChange('scale')}
                    >
                      <Scale className="h-4 w-4 mb-1" />
                      <span className="text-xs">Escalar</span>
                      <kbd className="mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">
                        S
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Escalar objeto (S)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <Separator />

          {/* Snap Control */}
          {onSnapToggle && (
            <div className="flex items-center justify-between">
              <Label htmlFor="snap-toggle" className="cursor-pointer">
                Snap a Grid
              </Label>
              <Switch
                id="snap-toggle"
                checked={snapEnabled}
                onCheckedChange={onSnapToggle}
              />
            </div>
          )}

          <Separator />

          {/* Atajos de Teclado */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Atajos de Teclado
            </Label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seleccionar objeto</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Click</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duplicar</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Ctrl</kbd>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">D</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Eliminar</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Del</kbd>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navegación */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navegación
            </Label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rotar cámara</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Orbit</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mover cámara</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Pan</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Zoom</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Rueda</kbd>
              </div>
            </div>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
