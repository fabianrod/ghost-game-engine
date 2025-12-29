import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Trash2, Settings, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { TAGS_AND_LAYERS } from '../../constants/gameConstants';

/**
 * Componente de sección expandible/colapsable
 */
const CollapsibleSection = ({ title, defaultOpen = true, children, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </button>
      {isOpen && <div className="pl-6 space-y-4">{children}</div>}
    </div>
  );
};

/**
 * Panel de propiedades para editar el objeto seleccionado
 */
export const PropertiesPanel = ({ 
  object, 
  onUpdate, 
  onDelete, 
  onDuplicate, 
  onToggleControls,
  toolsPanelCollapsed = false,
  onToggleToolsPanel = null,
  allObjects = [], // Lista de todos los objetos para el selector de targetId
}) => {
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
        <div className="p-6 border-t border-border space-y-2">
          {onToggleControls && (
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
          )}
          {onToggleToolsPanel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={toolsPanelCollapsed ? "outline" : "default"} 
                    className="w-full" 
                    onClick={onToggleToolsPanel}
                  >
                    🗻 {toolsPanelCollapsed ? 'Expandir' : 'Colapsar'} Panel de Herramientas
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{toolsPanelCollapsed ? 'Expandir' : 'Colapsar'} el panel de herramientas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  // Si es una cámara, mostrar propiedades específicas de cámara
  if (object.type === 'camera') {
    return (
      <div className="w-[320px] border-l border-border bg-card flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Propiedades de la Cámara</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Información básica */}
            <CollapsibleSection title="Información" defaultOpen={true}>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  type="text"
                  value={object.name || ''}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Nombre del objeto"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={object.tag || 'MainCamera'}
                  onValueChange={(value) => onUpdate({ tag: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS_AND_LAYERS.TAGS.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Layer</Label>
                <Select
                  value={String(object.layer !== undefined ? object.layer : 0)}
                  onValueChange={(value) => onUpdate({ layer: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS_AND_LAYERS.LAYERS.map(layer => (
                      <SelectItem key={layer.id} value={String(layer.id)}>
                        {layer.id}: {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleSection>

            <Separator />

            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  📹 Componente de cámara configurable (similar a Unity)
                </p>
              </CardContent>
            </Card>

            {/* Transform */}
            <CollapsibleSection title="Transform" defaultOpen={true}>
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
            </CollapsibleSection>

            <Separator />

            {/* Camera Component */}
            <CollapsibleSection title="Camera Component" defaultOpen={true}>
              <div className="space-y-2">
                <Label>Modo de Cámara</Label>
              <Select
                value={object.mode || 'firstPerson'}
                onValueChange={(value) => onUpdate({ mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firstPerson">Primera Persona</SelectItem>
                  <SelectItem value="thirdPerson">Tercera Persona</SelectItem>
                  <SelectItem value="free">Libre</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground italic">
                {object.mode === 'firstPerson' && 'Cámara fija en posición con altura configurable'}
                {object.mode === 'thirdPerson' && 'Cámara sigue a un objetivo desde distancia'}
                {object.mode === 'free' && 'Cámara libre con posición y rotación fijas'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Campo de Visión (FOV)</Label>
              <Input
                type="number"
                step="1"
                min="10"
                max="180"
                value={object.fov || 75}
                onChange={(e) => {
                  const fov = parseFloat(e.target.value) || 75;
                  onUpdate({ fov: Math.max(10, Math.min(180, fov)) });
                }}
              />
              <p className="text-xs text-muted-foreground italic">
                Ángulo de visión en grados (10-180)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Altura</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={object.height || 1.65}
                onChange={(e) => {
                  const height = parseFloat(e.target.value) || 1.65;
                  onUpdate({ height: Math.max(0, height) });
                }}
              />
              <p className="text-xs text-muted-foreground italic">
                Altura de la cámara desde la posición base (metros)
              </p>
            </div>

            {object.mode === 'thirdPerson' && (
              <>
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select
                    value={object.targetId || 'none'}
                    onValueChange={(value) => {
                      onUpdate({ targetId: value === 'none' ? null : value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar objeto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {allObjects
                        .filter(obj => obj.type === 'object' && obj.id !== object.id) // Solo objetos normales, excluir esta cámara
                        .map(obj => (
                          <SelectItem key={obj.id} value={obj.id}>
                            {obj.name || `Objeto_${obj.id.slice(-6)}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground italic">
                    Objeto que la cámara seguirá
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Distancia</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={object.distance || 5}
                    onChange={(e) => {
                      const distance = parseFloat(e.target.value) || 5;
                      onUpdate({ distance: Math.max(0.1, distance) });
                    }}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Distancia desde el objetivo (metros)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Offset</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">X</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={object.offset ? object.offset[0] : 0}
                        onChange={(e) => {
                          const newOffset = [...(object.offset || [0, 0, 0])];
                          newOffset[0] = parseFloat(e.target.value) || 0;
                          onUpdate({ offset: newOffset });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Y</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={object.offset ? object.offset[1] : 0}
                        onChange={(e) => {
                          const newOffset = [...(object.offset || [0, 0, 0])];
                          newOffset[1] = parseFloat(e.target.value) || 0;
                          onUpdate({ offset: newOffset });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Z</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={object.offset ? object.offset[2] : 0}
                        onChange={(e) => {
                          const newOffset = [...(object.offset || [0, 0, 0])];
                          newOffset[2] = parseFloat(e.target.value) || 0;
                          onUpdate({ offset: newOffset });
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Offset desde el objetivo (solo tercera persona)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Plano Cercano (Near)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.01"
                value={object.near || 0.1}
                onChange={(e) => {
                  const near = parseFloat(e.target.value) || 0.1;
                  onUpdate({ near: Math.max(0.01, near) });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Plano Lejano (Far)</Label>
              <Input
                type="number"
                step="10"
                min="1"
                value={object.far || 1000}
                onChange={(e) => {
                  const far = parseFloat(e.target.value) || 1000;
                  onUpdate({ far: Math.max(1, far) });
                }}
              />
            </div>


            <div className="flex items-center space-x-2">
              <Checkbox
                id="cameraActive"
                checked={object.active || false}
                onCheckedChange={(checked) => onUpdate({ active: checked })}
              />
              <Label htmlFor="cameraActive" className="cursor-pointer">
                Cámara Activa
              </Label>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Solo una cámara puede estar activa a la vez
            </p>
            </CollapsibleSection>
          </div>
        </ScrollArea>
        <div className="p-6 border-t border-border space-y-2">
          <Button variant="default" className="w-full" onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Cámara
          </Button>
          <Button variant="destructive" className="w-full" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Cámara
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

  // Si es un collider, mostrar propiedades específicas de collider
  if (object.type === 'collider') {
    return (
      <div className="w-[320px] border-l border-border bg-card flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Propiedades del Collider</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Información básica */}
            <CollapsibleSection title="Información" defaultOpen={true}>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  type="text"
                  value={object.name || ''}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Nombre del collider"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={object.tag || 'Untagged'}
                  onValueChange={(value) => onUpdate({ tag: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS_AND_LAYERS.TAGS.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Layer</Label>
                <Select
                  value={String(object.layer !== undefined ? object.layer : 0)}
                  onValueChange={(value) => onUpdate({ layer: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS_AND_LAYERS.LAYERS.map(layer => (
                      <SelectItem key={layer.id} value={String(layer.id)}>
                        {layer.id}: {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleSection>

            <Separator />

            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Este collider es invisible en el modo juego pero tiene colisión física
                </p>
              </CardContent>
            </Card>

            {/* Collider Component */}
            <CollapsibleSection title="Collider Component" defaultOpen={true}>
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
                  <SelectItem value="sphere">Esfera</SelectItem>
                  <SelectItem value="capsule">Cápsula</SelectItem>
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
                  : object.colliderType === 'sphere'
                  ? 'Radio (X, Y, Z se promedian)'
                  : object.colliderType === 'capsule'
                  ? 'Escala (Radio X/Z, Altura Y)'
                  : 'Dimensiones (X, Y, Z)'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {object.colliderType === 'cylinder' || object.colliderType === 'capsule' ? 'Radio X' : object.colliderType === 'sphere' ? 'Radio X' : 'X'}
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
                    {object.colliderType === 'cylinder' || object.colliderType === 'capsule' ? 'Altura Y' : object.colliderType === 'sphere' ? 'Radio Y' : 'Y'}
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
                    {object.colliderType === 'cylinder' || object.colliderType === 'capsule' ? 'Radio Z' : object.colliderType === 'sphere' ? 'Radio Z' : 'Z'}
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
                  : object.colliderType === 'sphere'
                  ? 'Radio promedio de X, Y, Z'
                  : object.colliderType === 'capsule'
                  ? 'Radio en X/Z, altura en Y (con semiesferas)'
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

            </CollapsibleSection>

            <Separator />

            {/* Physics Material */}
            <CollapsibleSection title="Physics Material" defaultOpen={false}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Fricción</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={object.physicsMaterial?.friction ?? 0.7}
                    onChange={(e) => {
                      const friction = parseFloat(e.target.value) || 0.7;
                      const currentMaterial = object.physicsMaterial || { friction: 0.7, restitution: 0.0 };
                      onUpdate({ 
                        physicsMaterial: { 
                          ...currentMaterial, 
                          friction: Math.max(0, Math.min(10, friction)) 
                        } 
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Resistencia al deslizamiento (0-10)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Restitución (Rebote)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={object.physicsMaterial?.restitution ?? 0.0}
                    onChange={(e) => {
                      const restitution = parseFloat(e.target.value) || 0.0;
                      const currentMaterial = object.physicsMaterial || { friction: 0.7, restitution: 0.0 };
                      onUpdate({ 
                        physicsMaterial: { 
                          ...currentMaterial, 
                          restitution: Math.max(0, Math.min(1, restitution)) 
                        } 
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Coeficiente de rebote (0 = sin rebote, 1 = rebote perfecto)
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            <Separator />

            {/* Physics Settings */}
            <CollapsibleSection title="Physics Settings" defaultOpen={false}>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isTrigger"
                    checked={object.isTrigger || false}
                    onCheckedChange={(checked) => onUpdate({ isTrigger: checked })}
                  />
                  <Label htmlFor="isTrigger" className="cursor-pointer">
                    Es Trigger
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Un trigger detecta colisiones pero no bloquea físicamente
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isSensor"
                    checked={object.isSensor || false}
                    onCheckedChange={(checked) => onUpdate({ isSensor: checked })}
                  />
                  <Label htmlFor="isSensor" className="cursor-pointer">
                    Es Sensor
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Un sensor detecta colisiones sin respuesta física
                </p>
              </div>
            </CollapsibleSection>
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
          {/* Información básica */}
          <CollapsibleSection title="Información" defaultOpen={true}>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                type="text"
                value={object.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Nombre del objeto"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select
                value={object.tag || 'Untagged'}
                onValueChange={(value) => onUpdate({ tag: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAGS_AND_LAYERS.TAGS.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Layer</Label>
              <Select
                value={String(object.layer !== undefined ? object.layer : 0)}
                onValueChange={(value) => onUpdate({ layer: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAGS_AND_LAYERS.LAYERS.map(layer => (
                    <SelectItem key={layer.id} value={String(layer.id)}>
                      {layer.id}: {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input 
                type="text" 
                value={object.model} 
                disabled 
                className="font-mono text-xs"
              />
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Transform */}
          <CollapsibleSection title="Transform" defaultOpen={true}>
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
          </CollapsibleSection>

          <Separator />

          {/* Mesh Renderer Component */}
          <CollapsibleSection title="Mesh Renderer" defaultOpen={false}>
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
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Collider Component */}
          <CollapsibleSection title="Collider" defaultOpen={false}>
            <div className="space-y-4">
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
          </CollapsibleSection>

          <Separator />

          {/* Componentes */}
          <CollapsibleSection title="Componentes" defaultOpen={false}>
            <div className="space-y-4">
              {/* Player Controller */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="playerController"
                      checked={object.components?.includes('playerController') || false}
                      onCheckedChange={(checked) => {
                        const currentComponents = object.components || [];
                        if (checked) {
                          // Agregar componente
                          if (!currentComponents.includes('playerController')) {
                            onUpdate({ 
                              components: [...currentComponents, 'playerController'],
                              componentProps: {
                                ...(object.componentProps || {}),
                                playerController: {
                                  speed: 5,
                                  enabled: true,
                                }
                              }
                            });
                          }
                        } else {
                          // Remover componente
                          const newComponents = currentComponents.filter(c => c !== 'playerController');
                          const newComponentProps = { ...(object.componentProps || {}) };
                          delete newComponentProps.playerController;
                          onUpdate({ 
                            components: newComponents,
                            componentProps: newComponentProps
                          });
                        }
                      }}
                    />
                    <Label htmlFor="playerController" className="cursor-pointer">
                      Player Controller
                    </Label>
                  </div>
                </div>
                {object.components?.includes('playerController') && (
                  <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Velocidad</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="20"
                        value={object.componentProps?.playerController?.speed || 5}
                        onChange={(e) => {
                          const speed = parseFloat(e.target.value) || 5;
                          onUpdate({
                            componentProps: {
                              ...(object.componentProps || {}),
                              playerController: {
                                ...(object.componentProps?.playerController || {}),
                                speed: Math.max(0.1, Math.min(20, speed))
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Permite movimiento con WASD y rotación con mouse
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        // Acomodar el objeto sobre el terreno
                        // Si la posición Y es < 2, ponerla en 0 (sobre el terreno)
                        // El cálculo de offset se hará automáticamente en SceneObject
                        const newPosition = [...object.position];
                        if (newPosition[1] < 2) {
                          newPosition[1] = 0;
                        }
                        // También asegurar que la rotación sea [0, 0, 0] para evitar volteos
                        const newRotation = [0, 0, 0];
                        onUpdate({ 
                          position: newPosition,
                          rotation: newRotation
                        });
                      }}
                    >
                      Acomodar sobre el terreno
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

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
