import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import {
  generateProceduralTerrain,
  generateHillsTerrain,
  generateMountainTerrain,
  generateFlatTerrain,
  generateValleyTerrain,
} from '../../utils/noise/TerrainGenerator';
import {
  smoothHeightmap,
  normalizeHeightmap,
} from '../../utils/heightmapUtils';

/**
 * Modal del editor de terreno
 * UI para configurar y generar terrenos
 * 
 * @param {Object} props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {Function} props.onOpenChange - Callback cuando cambia el estado de apertura
 * @param {Float32Array} props.heightmap - Heightmap actual
 * @param {number} props.segments - Número de segmentos
 * @param {Function} props.onHeightmapChange - Callback cuando cambia el heightmap
 * @param {Function} props.onPaintSettingsChange - Callback cuando cambian los ajustes de pintura
 */
export const TerrainEditorModal = ({
  open,
  onOpenChange,
  heightmap,
  segments = TERRAIN_CONFIG.SEGMENTS,
  onHeightmapChange,
  onPaintSettingsChange,
}) => {
  const [brushSize, setBrushSize] = useState(5);
  const [brushIntensity, setBrushIntensity] = useState(1);
  const [paintMode, setPaintMode] = useState('raise'); // 'raise', 'lower', 'smooth', 'flatten'

  // Notificar cambios en los ajustes de pintura cuando cambian
  useEffect(() => {
    if (onPaintSettingsChange) {
      onPaintSettingsChange({
        brushSize,
        brushIntensity,
        paintMode,
      });
    }
  }, [brushSize, brushIntensity, paintMode, onPaintSettingsChange]);

  // Generar terreno procedural
  const handleGenerateTerrain = useCallback((type) => {
    let newHeightmap;
    
    switch (type) {
      case 'hills':
        newHeightmap = generateHillsTerrain({ segments });
        break;
      case 'mountains':
        newHeightmap = generateMountainTerrain({ segments });
        break;
      case 'flat':
        newHeightmap = generateFlatTerrain({ segments });
        break;
      case 'valley':
        newHeightmap = generateValleyTerrain({ segments });
        break;
      default:
        newHeightmap = generateProceduralTerrain({ segments });
    }

    if (onHeightmapChange) {
      onHeightmapChange(newHeightmap);
    }
  }, [segments, onHeightmapChange]);

  // Normalizar terreno
  const handleNormalize = useCallback(() => {
    if (!heightmap) return;
    
    const normalized = normalizeHeightmap(
      heightmap,
      TERRAIN_CONFIG.MIN_HEIGHT,
      TERRAIN_CONFIG.MAX_HEIGHT
    );
    
    if (onHeightmapChange) {
      onHeightmapChange(normalized);
    }
  }, [heightmap, onHeightmapChange]);

  // Suavizar todo el terreno
  const handleSmoothAll = useCallback(() => {
    if (!heightmap) return;
    
    const smoothed = smoothHeightmap(
      heightmap,
      segments,
      segments,
      3
    );
    
    if (onHeightmapChange) {
      onHeightmapChange(smoothed);
    }
  }, [heightmap, segments, onHeightmapChange]);

  // Manejar cambios en los controles
  const handleBrushSizeChange = (value) => {
    setBrushSize(value);
    if (onPaintSettingsChange) {
      onPaintSettingsChange({
        brushSize: value,
        brushIntensity,
        paintMode,
      });
    }
  };

  const handleBrushIntensityChange = (value) => {
    setBrushIntensity(value);
    if (onPaintSettingsChange) {
      onPaintSettingsChange({
        brushSize,
        brushIntensity: value,
        paintMode,
      });
    }
  };

  const handlePaintModeChange = (value) => {
    setPaintMode(value);
    if (onPaintSettingsChange) {
      onPaintSettingsChange({
        brushSize,
        brushIntensity,
        paintMode: value,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Terreno</DialogTitle>
          <DialogDescription>
            Genera y modifica el terreno usando herramientas procedurales o pintando directamente sobre el terreno en el canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Modo de pintura */}
          <Card className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Herramientas de Pintura</h3>
            
            <div className="space-y-2">
              <Label>Modo de Pintura</Label>
              <Select value={paintMode} onValueChange={handlePaintModeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raise">Elevar</SelectItem>
                  <SelectItem value="lower">Bajar</SelectItem>
                  <SelectItem value="smooth">Suavizar</SelectItem>
                  <SelectItem value="flatten">Aplanar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tamaño del Pincel: {brushSize.toFixed(1)}</Label>
              <Slider
                value={[brushSize]}
                onValueChange={([value]) => handleBrushSizeChange(value)}
                min={1}
                max={20}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Intensidad: {brushIntensity.toFixed(1)}</Label>
              <Slider
                value={[brushIntensity]}
                onValueChange={([value]) => handleBrushIntensityChange(value)}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Click y arrastra sobre el terreno en el canvas para modificarlo
            </p>
          </Card>

          {/* Generadores procedurales */}
          <Card className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Generar Terreno Procedural</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => handleGenerateTerrain('hills')}>
                Colinas
              </Button>
              <Button size="sm" onClick={() => handleGenerateTerrain('mountains')}>
                Montañas
              </Button>
              <Button size="sm" onClick={() => handleGenerateTerrain('flat')}>
                Plano
              </Button>
              <Button size="sm" onClick={() => handleGenerateTerrain('valley')}>
                Valle
              </Button>
            </div>
          </Card>

          {/* Herramientas */}
          <Card className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Herramientas</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={handleNormalize}>
                Normalizar
              </Button>
              <Button size="sm" variant="outline" onClick={handleSmoothAll}>
                Suavizar Todo
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

