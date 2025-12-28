import { useState, useEffect } from 'react';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import { generateProceduralTerrain } from '../../utils/noise/TerrainGenerator';
import { loadLevelFromStorage } from '../../utils/storageUtils';

/**
 * Componente de terreno para el juego
 * Usa el nuevo sistema de heightmap con elevaciones
 * @param {boolean} hasPhysics - Si es false, no incluye física (útil para editor)
 * @param {string} levelFilename - Nombre del archivo del nivel para cargar heightmap guardado
 */
export const Terrain = ({ hasPhysics = true, levelFilename = 'level1.json' }) => {
  const [heightmap, setHeightmap] = useState(null);

  // Cargar heightmap del nivel o generar uno por defecto
  useEffect(() => {
    // Intentar cargar heightmap guardado del nivel
    try {
      const levelData = loadLevelFromStorage(levelFilename);
      if (levelData && levelData.terrain && levelData.terrain.heightmap) {
        // Convertir array normal a Float32Array
        const savedHeightmap = new Float32Array(levelData.terrain.heightmap);
        setHeightmap(savedHeightmap);
        return;
      }
    } catch (e) {
      console.log('No se encontró heightmap guardado, generando uno por defecto');
    }

    // Generar terreno procedural por defecto
    const defaultHeightmap = generateProceduralTerrain({
      segments: TERRAIN_CONFIG.SEGMENTS,
      scale: TERRAIN_CONFIG.NOISE_SCALE,
      octaves: TERRAIN_CONFIG.NOISE_OCTAVES,
      persistence: TERRAIN_CONFIG.NOISE_PERSISTENCE,
      height: TERRAIN_CONFIG.MAX_HEIGHT,
      smoothIterations: TERRAIN_CONFIG.SMOOTH_ITERATIONS,
    });
    
    setHeightmap(defaultHeightmap);
  }, [levelFilename]);

  if (!heightmap) {
    return null; // Esperar a que se cargue el heightmap
  }

  return (
    <TerrainGenerator
      heightmap={heightmap}
      hasPhysics={hasPhysics}
      size={TERRAIN_CONFIG.SIZE}
      segments={TERRAIN_CONFIG.SEGMENTS}
      maxHeight={TERRAIN_CONFIG.MAX_HEIGHT}
    />
  );
};

