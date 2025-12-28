import { useState, useEffect } from 'react';
import { TerrainGenerator } from './TerrainGenerator';
import { TerrainPainter } from './TerrainPainter';
import { TerrainBrushIndicator } from './TerrainBrushIndicator';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import { generateProceduralTerrain } from '../../utils/noise/TerrainGenerator';

/**
 * Componente que combina TerrainGenerator con TerrainEditor
 * Permite editar el terreno en tiempo real en el editor
 */
export const TerrainWithEditor = ({
  hasPhysics = false,
  heightmap = null,
  onHeightmapChange = null,
  showEditor = false,
  levelFilename = 'level1.json',
  paintSettings = null,
}) => {
  const [currentHeightmap, setCurrentHeightmap] = useState(null);

  // Inicializar heightmap
  useEffect(() => {
    if (heightmap && heightmap.length > 0) {
      // Si se proporciona un heightmap, usarlo
      if (heightmap instanceof Float32Array) {
        setCurrentHeightmap(heightmap);
      } else if (Array.isArray(heightmap)) {
        setCurrentHeightmap(new Float32Array(heightmap));
      }
    } else {
      // Generar uno por defecto
      const defaultHeightmap = generateProceduralTerrain({
        segments: TERRAIN_CONFIG.SEGMENTS,
        scale: TERRAIN_CONFIG.NOISE_SCALE,
        octaves: TERRAIN_CONFIG.NOISE_OCTAVES,
        persistence: TERRAIN_CONFIG.NOISE_PERSISTENCE,
        height: TERRAIN_CONFIG.MAX_HEIGHT,
        smoothIterations: TERRAIN_CONFIG.SMOOTH_ITERATIONS,
      });
      setCurrentHeightmap(defaultHeightmap);
    }
  }, [heightmap]);

  // Manejar cambios en el heightmap
  const handleHeightmapChange = (newHeightmap) => {
    setCurrentHeightmap(newHeightmap);
    if (onHeightmapChange) {
      onHeightmapChange(newHeightmap);
    }
  };

  if (!currentHeightmap) {
    return null;
  }

  return (
    <>
      <TerrainGenerator
        heightmap={currentHeightmap}
        hasPhysics={hasPhysics}
        size={TERRAIN_CONFIG.SIZE}
        segments={TERRAIN_CONFIG.SEGMENTS}
        maxHeight={TERRAIN_CONFIG.MAX_HEIGHT}
        onHeightmapChange={handleHeightmapChange}
      />
      {showEditor && (
        <>
          <TerrainPainter
            heightmap={currentHeightmap}
            segments={TERRAIN_CONFIG.SEGMENTS}
            terrainSize={TERRAIN_CONFIG.SIZE}
            onHeightmapChange={handleHeightmapChange}
            paintSettings={paintSettings}
            enabled={showEditor && paintSettings !== null}
          />
          <TerrainBrushIndicator
            paintSettings={paintSettings}
            enabled={showEditor && paintSettings !== null}
          />
        </>
      )}
    </>
  );
};

