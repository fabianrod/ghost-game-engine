import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, ChevronRight, ChevronDown, Box, Camera, Cylinder, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Panel de jerarquía (Hierarchy) similar a Unity
 * Muestra todos los objetos del nivel en una lista organizada
 */
export const HierarchyPanel = ({ 
  objects = [], 
  selectedObject, 
  onSelectObject,
  searchQuery = '',
  onSearchChange,
}) => {
  const [expandedTypes, setExpandedTypes] = useState({
    objects: true,
    colliders: true,
    cameras: true,
  });

  // Filtrar objetos según búsqueda
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects;
    
    const query = searchQuery.toLowerCase();
    return objects.filter(obj => {
      const name = obj.name || obj.id || '';
      const type = obj.type || '';
      const tag = obj.tag || '';
      return (
        name.toLowerCase().includes(query) ||
        type.toLowerCase().includes(query) ||
        tag.toLowerCase().includes(query) ||
        obj.id?.toLowerCase().includes(query)
      );
    });
  }, [objects, searchQuery]);

  // Agrupar objetos por tipo
  const groupedObjects = useMemo(() => {
    const groups = {
      objects: [],
      colliders: [],
      cameras: [],
    };

    filteredObjects.forEach(obj => {
      if (obj.type === 'camera') {
        groups.cameras.push(obj);
      } else if (obj.type === 'collider') {
        groups.colliders.push(obj);
      } else {
        groups.objects.push(obj);
      }
    });

    return groups;
  }, [filteredObjects]);

  const toggleType = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const getObjectIcon = (obj) => {
    if (obj.type === 'camera') return Camera;
    if (obj.type === 'collider') {
      if (obj.colliderType === 'sphere') return Circle;
      if (obj.colliderType === 'cylinder' || obj.colliderType === 'capsule') return Cylinder;
      return Box;
    }
    return Box;
  };

  const getObjectDisplayName = (obj) => {
    if (obj.name) return obj.name;
    if (obj.type === 'camera') {
      return `Camera (${obj.mode || 'firstPerson'})`;
    }
    if (obj.type === 'collider') {
      return `Collider (${obj.colliderType || 'cylinder'})`;
    }
    if (obj.model) {
      const modelName = obj.model.split('/').pop().replace('.glb', '');
      return modelName || 'Object';
    }
    return `Object_${obj.id.slice(-6)}`;
  };

  const renderObjectItem = (obj) => {
    const Icon = getObjectIcon(obj);
    const isSelected = selectedObject === obj.id;
    const displayName = getObjectDisplayName(obj);

    return (
      <div
        key={obj.id}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          isSelected 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-accent hover:text-accent-foreground"
        )}
        onClick={() => onSelectObject(obj.id)}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-sm truncate">{displayName}</span>
        {obj.tag && obj.tag !== 'Untagged' && (
          <span className="text-xs opacity-70 px-1.5 py-0.5 bg-background/50 rounded">
            {obj.tag}
          </span>
        )}
      </div>
    );
  };

  const renderGroup = (type, items, label, icon) => {
    const Icon = icon;
    const isExpanded = expandedTypes[type];
    const count = items.length;

    if (count === 0) return null;

    return (
      <div key={type} className="space-y-1">
        <button
          onClick={() => toggleType(type)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </button>
        {isExpanded && (
          <div className="ml-6 space-y-0.5">
            {items.map(renderObjectItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[240px] border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Jerarquía</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {renderGroup('objects', groupedObjects.objects, 'Objetos', Box)}
          {renderGroup('colliders', groupedObjects.colliders, 'Colliders', Cylinder)}
          {renderGroup('cameras', groupedObjects.cameras, 'Cámaras', Camera)}
          
          {filteredObjects.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No se encontraron objetos' : 'No hay objetos en el nivel'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Total: {objects.length} objeto{objects.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

