import { useState, useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Raycaster, Vector3 } from 'three';
import { modifyHeightmap, smoothHeightmap } from '../../utils/heightmapUtils';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';

/**
 * Componente que maneja la pintura del terreno dentro del Canvas
 * Se comunica con el modal del editor para aplicar modificaciones
 * 
 * @param {Object} props
 * @param {Float32Array} props.heightmap - Heightmap actual
 * @param {number} props.segments - Número de segmentos
 * @param {number} props.terrainSize - Tamaño del terreno
 * @param {Function} props.onHeightmapChange - Callback cuando cambia el heightmap
 * @param {Object} props.paintSettings - Ajustes de pintura desde el modal
 * @param {boolean} props.enabled - Si la pintura está habilitada
 */
export const TerrainPainter = ({
  heightmap,
  segments = TERRAIN_CONFIG.SEGMENTS,
  terrainSize = TERRAIN_CONFIG.SIZE,
  onHeightmapChange,
  paintSettings = null,
  enabled = false,
}) => {
  const { camera, scene, gl } = useThree();
  const [isPainting, setIsPainting] = useState(false);
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
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse, camera);
    
    // Buscar intersección con el terreno
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const terrainMesh = intersects.find(
      obj => obj.object.name === 'terrain' || 
             obj.object.parent?.name === 'terrain' ||
             obj.object.type === 'Mesh'
    );
    
    if (terrainMesh) {
      return terrainMesh.point;
    }
    
    return null;
  }, [camera, scene, gl]);

  // Modificar terreno en una posición
  const modifyTerrainAt = useCallback((worldPos, intensity) => {
    if (!currentHeightmap.current || !paintSettings) return;

    const { brushSize, brushIntensity, paintMode } = paintSettings;

    if (paintMode === 'smooth') {
      // Suavizar requiere un enfoque diferente
      const smoothed = smoothHeightmap(
        currentHeightmap.current,
        segments,
        segments,
        1
      );
      currentHeightmap.current = smoothed;
      if (onHeightmapChange) {
        onHeightmapChange(new Float32Array(smoothed));
      }
      return;
    }

    let finalIntensity = intensity;
    if (paintMode === 'raise') {
      finalIntensity = 1;
    } else if (paintMode === 'lower') {
      finalIntensity = -1;
    } else if (paintMode === 'flatten') {
      finalIntensity = 0; // Aplanar a altura 0
    }

    const newHeightmap = modifyHeightmap(
      currentHeightmap.current,
      segments,
      segments,
      worldPos.x,
      worldPos.z,
      brushSize,
      finalIntensity * brushIntensity,
      terrainSize
    );

    currentHeightmap.current = newHeightmap;
    if (onHeightmapChange) {
      onHeightmapChange(new Float32Array(newHeightmap));
    }
  }, [segments, terrainSize, paintSettings, onHeightmapChange]);

  // Manejar pintura del terreno
  const handleMouseMove = useCallback((event) => {
    if (!isPainting || !enabled || !paintSettings) return;

    const terrainPos = getTerrainPosition(event);
    if (!terrainPos) return;

    // Evitar pintar en el mismo lugar repetidamente
    if (lastPaintPosition) {
      const dist = terrainPos.distanceTo(lastPaintPosition);
      if (dist < paintSettings.brushSize * 0.3) return;
    }

    modifyTerrainAt(terrainPos, 1);
    setLastPaintPosition(terrainPos);
  }, [isPainting, enabled, paintSettings, getTerrainPosition, modifyTerrainAt, lastPaintPosition]);

  // Event listeners para pintura
  useEffect(() => {
    if (!enabled) return;

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
  }, [gl, handleMouseMove, getTerrainPosition, enabled]);

  // Este componente no renderiza nada visual
  return null;
};

