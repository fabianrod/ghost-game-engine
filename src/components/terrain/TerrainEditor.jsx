import { useState, useCallback, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import {
  generateProceduralTerrain,
  generateHillsTerrain,
  generateMountainTerrain,
  generateFlatTerrain,
  generateValleyTerrain,
} from '../../utils/noise/TerrainGenerator';
import {
  modifyHeightmap,
  smoothHeightmap,
  normalizeHeightmap,
} from '../../utils/heightmapUtils';

/**
 * Editor de terreno para modificar heightmaps en tiempo real
 * Permite pintar elevaciones, generar terrenos procedurales y ajustar parámetros
 * 
 * @param {Object} props
 * @param {Float32Array} props.heightmap - Heightmap actual
 * @param {number} props.segments - Número de segmentos
 * @param {number} props.terrainSize - Tamaño del terreno
 * @param {Function} props.onHeightmapChange - Callback cuando cambia el heightmap
 */
export const TerrainEditor = ({
  heightmap,
  segments = TERRAIN_CONFIG.SEGMENTS,
  terrainSize = TERRAIN_CONFIG.SIZE,
  onHeightmapChange,
}) => {
  const { camera, scene, gl } = useThree();
  const [brushSize, setBrushSize] = useState(5);
  const [brushIntensity, setBrushIntensity] = useState(1);
  const [isPainting, setIsPainting] = useState(false);
  const [paintMode, setPaintMode] = useState('raise'); // 'raise', 'lower', 'smooth', 'flatten'
  const [lastPaintPosition, setLastPaintPosition] = useState(null);
  const raycaster = useRef(new Raycaster());
  const currentHeightmap = useRef(heightmap);

  // Actualizar referencia cuando cambia el heightmap
  useEffect(() => {
    currentHeightmap.current = heightmap;
  }, [heightmap]);

  // Obtener posición del terreno bajo el mouse
  const getTerrainPosition = useCallback((event) => {
    const mouse = new Vector3();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.current.setFromCamera(mouse, camera);
    
    // Buscar intersección con el terreno (mesh con nombre 'terrain')
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const terrainMesh = intersects.find(obj => obj.object.name === 'terrain' || obj.object.parent?.name === 'terrain');
    
    if (terrainMesh) {
      return terrainMesh.point;
    }
    
    return null;
  }, [camera, scene]);

  // Modificar terreno en una posición
  const modifyTerrainAt = useCallback((worldPos, intensity) => {
    if (!currentHeightmap.current) return;

    const newHeightmap = modifyHeightmap(
      currentHeightmap.current,
      segments,
      segments,
      worldPos.x,
      worldPos.z,
      brushSize,
      intensity * brushIntensity,
      terrainSize
    );

    currentHeightmap.current = newHeightmap;
    if (onHeightmapChange) {
      onHeightmapChange(new Float32Array(newHeightmap));
    }
  }, [segments, terrainSize, brushSize, brushIntensity, onHeightmapChange]);

  // Manejar pintura del terreno
  const handleMouseMove = useCallback((event) => {
    if (!isPainting) return;

    const terrainPos = getTerrainPosition(event);
    if (!terrainPos) return;

    // Evitar pintar en el mismo lugar repetidamente
    if (lastPaintPosition) {
      const dist = terrainPos.distanceTo(lastPaintPosition);
      if (dist < brushSize * 0.3) return;
    }

    let intensity = 0;
    switch (paintMode) {
      case 'raise':
        intensity = 1;
        break;
      case 'lower':
        intensity = -1;
        break;
      case 'smooth':
        // Suavizar requiere un enfoque diferente
        currentHeightmap.current = smoothHeightmap(
          currentHeightmap.current,
          segments,
          segments,
          1
        );
        if (onHeightmapChange) {
          onHeightmapChange(new Float32Array(currentHeightmap.current));
        }
        setLastPaintPosition(terrainPos);
        return;
      case 'flatten':
        intensity = 0; // Aplanar a altura 0
        break;
      default:
        return;
    }

    modifyTerrainAt(terrainPos, intensity);
    setLastPaintPosition(terrainPos);
  }, [isPainting, paintMode, getTerrainPosition, modifyTerrainAt, brushSize, segments, onHeightmapChange]);

  // Event listeners para pintura
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleMouseDown = (e) => {
      if (e.button === 0) { // Botón izquierdo
        setIsPainting(true);
        const terrainPos = getTerrainPosition(e);
        if (terrainPos) {
          setLastPaintPosition(terrainPos);
          handleMouseMove(e);
        }
      }
    };

    const handleMouseUp = () => {
      setIsPainting(false);
      setLastPaintPosition(null);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [gl, handleMouseMove, getTerrainPosition]);

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
    if (!currentHeightmap.current) return;
    
    const normalized = normalizeHeightmap(
      currentHeightmap.current,
      TERRAIN_CONFIG.MIN_HEIGHT,
      TERRAIN_CONFIG.MAX_HEIGHT
    );
    
    if (onHeightmapChange) {
      onHeightmapChange(normalized);
    }
  }, [onHeightmapChange]);

  // Suavizar todo el terreno
  const handleSmoothAll = useCallback(() => {
    if (!currentHeightmap.current) return;
    
    const smoothed = smoothHeightmap(
      currentHeightmap.current,
      segments,
      segments,
      3
    );
    
    if (onHeightmapChange) {
      onHeightmapChange(smoothed);
    }
  }, [segments, onHeightmapChange]);

  // Renderizar UI fuera del Canvas usando Html de drei
  // El componente se renderiza dentro del Canvas pero la UI aparece como overlay
  return (
    <Html
      position={[0, 20, 0]}
      center
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
      transform
      occlude
    >
      <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-lg w-80 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-foreground">Editor de Terreno</h3>
        
        {/* Modo de pintura */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Modo de Pintura</label>
          <select
            value={paintMode}
            onChange={(e) => setPaintMode(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background text-foreground"
          >
            <option value="raise">Elevar</option>
            <option value="lower">Bajar</option>
            <option value="smooth">Suavizar</option>
            <option value="flatten">Aplanar</option>
          </select>
        </div>

        {/* Tamaño del pincel */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Tamaño del Pincel: {brushSize.toFixed(1)}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={brushSize}
            onChange={(e) => setBrushSize(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Intensidad del pincel */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Intensidad: {brushIntensity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={brushIntensity}
            onChange={(e) => setBrushIntensity(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Generadores procedurales */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Generar Terreno</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => handleGenerateTerrain('hills')}
            >
              Colinas
            </button>
            <button
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => handleGenerateTerrain('mountains')}
            >
              Montañas
            </button>
            <button
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => handleGenerateTerrain('flat')}
            >
              Plano
            </button>
            <button
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => handleGenerateTerrain('valley')}
            >
              Valle
            </button>
          </div>
        </div>

        {/* Herramientas */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Herramientas</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
              onClick={handleNormalize}
            >
              Normalizar
            </button>
            <button
              className="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
              onClick={handleSmoothAll}
            >
              Suavizar Todo
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Click y arrastra sobre el terreno para modificarlo
        </p>
      </div>
    </Html>
  );
};

