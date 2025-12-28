import { useState, useCallback, useEffect } from 'react';
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
 * Pestaña del editor de terreno dentro del panel de herramientas
 * 
 * @param {Object} props
 * @param {Float32Array} props.heightmap - Heightmap actual
 * @param {number} props.segments - Número de segmentos
 * @param {Function} props.onHeightmapChange - Callback cuando cambia el heightmap
 * @param {Function} props.onPaintSettingsChange - Callback cuando cambian los ajustes de pintura
 */
export const TerrainEditorTab = ({
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
  };

  const handleBrushIntensityChange = (value) => {
    setBrushIntensity(value);
  };

  const handlePaintModeChange = (value) => {
    setPaintMode(value);
  };

  return (
    <div className="terrain-editor-tab">
      <div className="grid grid-cols-3 gap-4">
        {/* Columna 1: Herramientas de Pintura */}
        <Card className="p-4 space-y-3 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="text-sm font-semibold">Pincel</h3>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Modo</Label>
              <Select value={paintMode} onValueChange={handlePaintModeChange}>
                <SelectTrigger className="h-8 text-xs">
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tamaño</Label>
                <span className="text-xs text-muted-foreground">{brushSize.toFixed(1)}</span>
              </div>
              <Slider
                value={[brushSize]}
                onValueChange={([value]) => handleBrushSizeChange(value)}
                min={1}
                max={20}
                step={0.5}
                className="h-2"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Intensidad</Label>
                <span className="text-xs text-muted-foreground">{brushIntensity.toFixed(1)}</span>
              </div>
              <Slider
                value={[brushIntensity]}
                onValueChange={([value]) => handleBrushIntensityChange(value)}
                min={0.1}
                max={5}
                step={0.1}
                className="h-2"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Click y arrastra sobre el terreno para pintar
          </p>
        </Card>

        {/* Columna 2: Generadores Procedurales */}
        <Card className="p-4 space-y-3 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="text-sm font-semibold">Generar Terreno</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              onClick={() => handleGenerateTerrain('hills')}
              className="h-9 text-xs"
            >
              🏔️ Colinas
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleGenerateTerrain('mountains')}
              className="h-9 text-xs"
            >
              ⛰️ Montañas
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleGenerateTerrain('flat')}
              className="h-9 text-xs"
            >
              🟩 Plano
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleGenerateTerrain('valley')}
              className="h-9 text-xs"
            >
              🏞️ Valle
            </Button>
          </div>
          
          <div className="pt-2 border-t border-border">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleGenerateTerrain('default')}
              className="w-full h-9 text-xs"
            >
              🎲 Aleatorio
            </Button>
          </div>
        </Card>

        {/* Columna 3: Herramientas de Edición */}
        <Card className="p-4 space-y-3 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="text-sm font-semibold">Edición</h3>
          </div>
          
          <div className="space-y-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleNormalize}
              className="w-full h-9 text-xs justify-start"
            >
              📏 Normalizar Alturas
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSmoothAll}
              className="w-full h-9 text-xs justify-start"
            >
              ✨ Suavizar Todo
            </Button>
          </div>
          
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usa las herramientas para ajustar y refinar el terreno generado
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

