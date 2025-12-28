import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Raycaster, Vector3 } from 'three';
import * as THREE from 'three';

/**
 * Componente que muestra un indicador visual del cursor cuando el editor de terreno está activo
 * Muestra un círculo/disco que representa el área de influencia del pincel
 * 
 * @param {Object} props
 * @param {Object} props.paintSettings - Ajustes de pintura (brushSize, brushIntensity, paintMode)
 * @param {boolean} props.enabled - Si el indicador está habilitado
 */
export const TerrainBrushIndicator = ({
  paintSettings = null,
  enabled = false,
}) => {
  const { camera, scene, gl } = useThree();
  const [indicatorPosition, setIndicatorPosition] = useState(null);
  const raycaster = useRef(new Raycaster());
  const groupRef = useRef();

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

  // Manejar movimiento del mouse para actualizar la posición del indicador
  const handleMouseMove = useCallback((event) => {
    if (!enabled || !paintSettings) {
      setIndicatorPosition(null);
      return;
    }

    const terrainPos = getTerrainPosition(event);
    if (terrainPos) {
      setIndicatorPosition(terrainPos);
    } else {
      setIndicatorPosition(null);
    }
  }, [enabled, paintSettings, getTerrainPosition]);

  // Event listeners para el mouse
  useEffect(() => {
    if (!enabled) {
      setIndicatorPosition(null);
      return;
    }

    const canvas = gl.domElement;
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', () => setIndicatorPosition(null));

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', () => setIndicatorPosition(null));
    };
  }, [gl, handleMouseMove, enabled]);

  // Actualizar posición del grupo en cada frame para suavidad
  useFrame(() => {
    if (groupRef.current && indicatorPosition) {
      // Ajustar ligeramente la posición Y para que el indicador esté ligeramente sobre el terreno
      // Esto evita z-fighting
      groupRef.current.position.set(
        indicatorPosition.x,
        indicatorPosition.y + 0.1, // 10cm sobre el terreno
        indicatorPosition.z
      );
    }
  });

  // Calcular propiedades del indicador basadas en paintSettings
  const indicatorProps = useMemo(() => {
    if (!paintSettings) return null;

    const brushSize = paintSettings.brushSize || 5;
    const paintMode = paintSettings.paintMode || 'raise';

    // Color según el modo de pintura
    const getColor = () => {
      switch (paintMode) {
        case 'raise':
          return '#00ff00'; // Verde para elevar
        case 'lower':
          return '#ff0000'; // Rojo para bajar
        case 'smooth':
          return '#00aaff'; // Azul para suavizar
        case 'flatten':
          return '#ffff00'; // Amarillo para aplanar
        default:
          return '#00ff00';
      }
    };

    return {
      brushSize,
      color: getColor(),
    };
  }, [paintSettings]);

  // No renderizar si no está habilitado o no hay posición
  if (!enabled || !paintSettings || !indicatorPosition || !indicatorProps) {
    return null;
  }

  const { brushSize, color } = indicatorProps;

  return (
    <group ref={groupRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Círculo exterior del indicador - borde principal */}
      <mesh>
        <ringGeometry args={[brushSize * 0.95, brushSize, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Círculo medio para mejor visibilidad */}
      <mesh>
        <ringGeometry args={[brushSize * 0.5, brushSize * 0.7, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Círculo interior más opaco */}
      <mesh>
        <ringGeometry args={[0, brushSize * 0.3, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Punto central para indicar el centro exacto */}
      <mesh>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

