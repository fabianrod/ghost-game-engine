import { useState } from 'react';
import { LevelSelector } from './LevelSelector';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Copy, Download, Gamepad2, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Barra de herramientas del editor
 */
export const Toolbar = ({
  objects,
  onSave,
  onExport,
  onCopy,
  currentLevel,
  loading,
  mode,
  onModeChange,
  levels,
  onSelectLevel,
  onCreateNew,
  onDeleteLevel,
  levelLoading,
}) => {
  const [saveStatus, setSaveStatus] = useState(null);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('success');
      toast({
        title: "Guardado exitoso",
        description: "El nivel se ha guardado correctamente.",
      });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      setSaveStatus('error');
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo guardar el nivel.",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleExportJSON = () => {
    const levelData = {
      name: currentLevel?.data?.name || 'Nivel Editado',
      description: currentLevel?.data?.description || 'Nivel creado en el editor',
      objects: objects.map(({ id, ...obj }) => obj),
    };
    onExport(levelData);
    toast({
      title: "Exportado",
      description: "El JSON se ha descargado correctamente.",
    });
  };

  const handleCopyJSON = async () => {
    const levelData = {
      name: currentLevel?.data?.name || 'Nivel Editado',
      description: currentLevel?.data?.description || 'Nivel creado en el editor',
      objects: objects.map(({ id, ...obj }) => obj),
    };
    try {
      await onCopy(levelData);
      toast({
        title: "Copiado",
        description: "El JSON se ha copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-semibold text-foreground">Editor de Niveles</h2>
        <span className="text-sm text-muted-foreground">
          {objects.length} objeto{objects.length !== 1 ? 's' : ''}
        </span>
        {currentLevel && (
          <span className="text-sm font-medium text-primary">
            • {currentLevel.data?.name || 'Sin nombre'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {mode && onModeChange && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === 'game' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onModeChange('game')}
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span className="ml-2">Modo Juego</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambiar al modo juego</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === 'editor' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onModeChange('editor')}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="ml-2">Modo Edición</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambiar al modo edición</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {levels && onSelectLevel && (
            <LevelSelector
              levels={levels}
              currentLevel={currentLevel}
              onSelectLevel={onSelectLevel}
              onCreateNew={onCreateNew}
              onDeleteLevel={onDeleteLevel}
              loading={levelLoading}
            />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={loading}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copiar JSON</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={loading}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exportar JSON</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={loading || saveStatus === 'saving'}
              >
                <Save className="h-4 w-4" />
                <span className="ml-2">
                  {saveStatus === 'saving' && 'Guardando...'}
                  {saveStatus === 'success' && 'Guardado'}
                  {saveStatus === 'error' && 'Error'}
                  {!saveStatus && 'Guardar'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Guardar nivel</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
