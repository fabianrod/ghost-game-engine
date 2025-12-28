import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Trash2, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Panel de propiedades para editar el objeto seleccionado
 */
export const PropertiesPanel = ({ object, onUpdate, onDelete, onDuplicate, onToggleControls }) => {
  if (!object) {
    return (
      <div className="w-[320px] border-l border-border bg-card flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Propiedades</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">
            Selecciona un objeto para editar sus propiedades
          </p>
        </div>
        {onToggleControls && (
          <div className="p-6 border-t border-border">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full" onClick={onToggleControls}>
                    <Settings className="h-4 w-4 mr-2" />
                    Controles
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mostrar controles del editor</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  }

  // Si es un collider, mostrar propiedades específicas de collider
  if (object.type === 'collider') {
    return (
      <div className="w-[320px] border-l border-border bg-card flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Propiedades del Collider</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Este collider es invisible en el modo juego pero tiene colisión física
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Tipo de Collider</Label>
              <Select
                value={object.colliderType || 'cylinder'}
                onValueChange={(value) => onUpdate({ colliderType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cylinder">Cilíndrico</SelectItem>
                  <SelectItem value="box">Caja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Posición</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={object.position[0]}
                    onChange={(e) => {
                      const newPos = [...object.position];
                      newPos[0] = parseFloat(e.target.value) || 0;
                      onUpdate({ position: newPos });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={object.position[1]}
                    onChange={(e) => {
                      const newPos = [...object.position];
                      newPos[1] = parseFloat(e.target.value) || 0;
                      onUpdate({ position: newPos });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={object.position[2]}
                    onChange={(e) => {
                      const newPos = [...object.position];
                      newPos[2] = parseFloat(e.target.value) || 0;
                      onUpdate({ position: newPos });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {object.colliderType === 'cylinder' 
                  ? 'Escala (Radio X/Z, Altura Y)' 
                  : 'Dimensiones (X, Y, Z)'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {object.colliderType === 'cylinder' ? 'Radio X' : 'X'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.scale[0]}
                    onChange={(e) => {
                      const newScale = [...object.scale];
                      newScale[0] = parseFloat(e.target.value) || 1;
                      onUpdate({ scale: newScale });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {object.colliderType === 'cylinder' ? 'Altura Y' : 'Y'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.scale[1]}
                    onChange={(e) => {
                      const newScale = [...object.scale];
                      newScale[1] = parseFloat(e.target.value) || 1;
                      onUpdate({ scale: newScale });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {object.colliderType === 'cylinder' ? 'Radio Z' : 'Z'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.scale[2]}
                    onChange={(e) => {
                      const newScale = [...object.scale];
                      newScale[2] = parseFloat(e.target.value) || 1;
                      onUpdate({ scale: newScale });
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {object.colliderType === 'cylinder' 
                  ? 'Radio en X/Z, altura en Y' 
                  : 'Dimensiones del collider de caja'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rotación (grados)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">X</Label>
                  <Input
                    type="number"
                    step="1"
                    value={object.rotation[0]}
                    onChange={(e) => {
                      const newRot = [...object.rotation];
                      newRot[0] = parseFloat(e.target.value) || 0;
                      onUpdate({ rotation: newRot });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Y</Label>
                  <Input
                    type="number"
                    step="1"
                    value={object.rotation[1]}
                    onChange={(e) => {
                      const newRot = [...object.rotation];
                      newRot[1] = parseFloat(e.target.value) || 0;
                      onUpdate({ rotation: newRot });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Z</Label>
                  <Input
                    type="number"
                    step="1"
                    value={object.rotation[2]}
                    onChange={(e) => {
                      const newRot = [...object.rotation];
                      newRot[2] = parseFloat(e.target.value) || 0;
                      onUpdate({ rotation: newRot });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-6 border-t border-border space-y-2">
          <Button variant="default" className="w-full" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Collider
          </Button>
          <Button variant="destructive" className="w-full" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Collider
          </Button>
          {onToggleControls && (
            <Button variant="outline" className="w-full" onClick={onToggleControls}>
              <Settings className="h-4 w-4 mr-2" />
              Controles
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleChange = (property, value, index = null) => {
    if (index !== null) {
      const newArray = [...object[property]];
      newArray[index] = parseFloat(value) || 0;
      onUpdate({ [property]: newArray });
    } else {
      onUpdate({ [property]: value });
    }
  };

  return (
    <div className="w-[320px] border-l border-border bg-card flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Propiedades</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input 
              type="text" 
              value={object.model} 
              disabled 
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Posición</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={object.position[0]}
                  onChange={(e) => handleChange('position', e.target.value, 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={object.position[1]}
                  onChange={(e) => handleChange('position', e.target.value, 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Z</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={object.position[2]}
                  onChange={(e) => handleChange('position', e.target.value, 2)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Escala</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={object.scale[0]}
                  onChange={(e) => handleChange('scale', e.target.value, 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={object.scale[1]}
                  onChange={(e) => handleChange('scale', e.target.value, 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Z</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={object.scale[2]}
                  onChange={(e) => handleChange('scale', e.target.value, 2)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rotación (grados)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  step="1"
                  value={object.rotation[0]}
                  onChange={(e) => handleChange('rotation', e.target.value, 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  step="1"
                  value={object.rotation[1]}
                  onChange={(e) => handleChange('rotation', e.target.value, 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Z</Label>
                <Input
                  type="number"
                  step="1"
                  value={object.rotation[2]}
                  onChange={(e) => handleChange('rotation', e.target.value, 2)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="castShadow"
                checked={object.castShadow}
                onCheckedChange={(checked) => handleChange('castShadow', checked)}
              />
              <Label htmlFor="castShadow" className="cursor-pointer">
                Proyectar sombras
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="receiveShadow"
                checked={object.receiveShadow}
                onCheckedChange={(checked) => handleChange('receiveShadow', checked)}
              />
              <Label htmlFor="receiveShadow" className="cursor-pointer">
                Recibir sombras
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCollider"
                checked={object.hasCollider}
                onCheckedChange={(checked) => {
                  handleChange('hasCollider', checked);
                  if (!checked && object.customCollider) {
                    onUpdate({ customCollider: null });
                  }
                }}
                disabled={!!object.customCollider}
              />
              <Label htmlFor="hasCollider" className="cursor-pointer">
                Tiene colisión
                {object.customCollider && (
                  <span className="ml-2 text-xs text-muted-foreground italic">
                    (Activado por collider personalizado)
                  </span>
                )}
              </Label>
            </div>
          </div>

          {object.hasCollider && !object.customCollider && (
            <div className="space-y-2">
              <Label>Escala del Collider</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.colliderScale ? object.colliderScale[0] : 0.8}
                    onChange={(e) => {
                      const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                      handleChange('colliderScale', [
                        parseFloat(e.target.value) || 1,
                        currentScale[1],
                        currentScale[2],
                      ]);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.colliderScale ? object.colliderScale[1] : 0.8}
                    onChange={(e) => {
                      const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                      handleChange('colliderScale', [
                        currentScale[0],
                        parseFloat(e.target.value) || 1,
                        currentScale[2],
                      ]);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.colliderScale ? object.colliderScale[2] : 0.8}
                    onChange={(e) => {
                      const currentScale = object.colliderScale || [0.8, 0.8, 0.8];
                      handleChange('colliderScale', [
                        currentScale[0],
                        currentScale[1],
                        parseFloat(e.target.value) || 1,
                      ]);
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Multiplicador del tamaño base del collider (solo para collider automático)
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-6 border-t border-border space-y-2">
        <Button variant="default" className="w-full" onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar Objeto
        </Button>
        <Button variant="destructive" className="w-full" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar Objeto
        </Button>
        {onToggleControls && (
          <Button variant="outline" className="w-full" onClick={onToggleControls}>
            <Settings className="h-4 w-4 mr-2" />
            Controles
          </Button>
        )}
      </div>
    </div>
  );
};
