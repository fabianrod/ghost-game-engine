import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente selector de niveles
 * Permite seleccionar, crear y gestionar niveles
 */
export const LevelSelector = ({
  levels,
  currentLevel,
  onSelectLevel,
  onCreateNew,
  onDeleteLevel,
  loading,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState(null);
  const { toast } = useToast();

  const handleDeleteClick = (level) => {
    setLevelToDelete(level);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (levelToDelete) {
      onDeleteLevel(levelToDelete.filename);
      setDeleteDialogOpen(false);
      setLevelToDelete(null);
      toast({
        title: "Nivel eliminado",
        description: `Se ha eliminado ${levelToDelete.filename}`,
      });
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {currentLevel
              ? currentLevel.filename || 'Nuevo Nivel'
              : 'Nivel'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[300px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Niveles</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {levels.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No hay niveles guardados
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer nivel
                </Button>
              </div>
            ) : (
              <div className="p-1">
                {levels.map((level) => (
                  <div
                    key={level.filename}
                    className={`group flex items-center justify-between rounded-md p-2 mb-1 transition-colors ${
                      currentLevel?.filename === level.filename
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <DropdownMenuItem
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        onSelectLevel(level.filename);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {level.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {level.filename}
                        </div>
                        {level.description && (
                          <div className="text-xs text-muted-foreground mt-1 italic truncate">
                            {level.description}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                    {currentLevel?.filename === level.filename && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteClick(level)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar nivel</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar "{levelToDelete?.filename}"? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
