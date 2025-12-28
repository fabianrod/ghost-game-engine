import { useMemo } from 'react';
import * as THREE from 'three';
import { calculateCylinderCollider } from '../../utils/colliderUtils';

/**
 * Componente visual para mostrar un collider cilíndrico en el editor
 * @param {Array<number>} position - Posición [x, y, z]
 * @param {Array<number>} scale - Escala [radioX, alturaY, radioZ]
 * @param {Array<number>} rotation - Rotación [x, y, z] en grados
 * @param {boolean} isSelected - Si el collider está seleccionado
 * @param {string} color - Color del collider (por defecto "#ff6b00")
 * @param {boolean} showCapsuleShape - Si mostrar como cápsula (por defecto true)
 */
export const ColliderCylinder = ({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  isSelected = false,
  color = "#ff6b00",
  showCapsuleShape = true,
}) => {
  // Calcular parámetros del collider
  const colliderParams = useMemo(() => {
    return calculateCylinderCollider({
      type: 'cylinder',
      position: [0, 0, 0],
      scale,
      rotation: [0, 0, 0],
    });
  }, [scale]);

  // Convertir rotación de grados a radianes
  const rotationInRadians = useMemo(() => {
    return rotation.map(angle => (angle * Math.PI) / 180);
  }, [rotation]);

  if (!colliderParams) {
    console.warn('[ColliderCylinder] Error calculando parámetros del collider');
    return null;
  }

  const { radius, halfHeight, height } = colliderParams;
  const opacity = isSelected ? 0.4 : 0.2;

  // Renderizar como cilindro wireframe (simplificado para el editor)
  // Para cápsula, mostramos la altura total que incluye las semiesferas
  const displayHeight = showCapsuleShape ? (halfHeight * 2 + radius * 2) : height;
  
  return (
    <group position={position} rotation={rotationInRadians}>
      <mesh>
        <cylinderGeometry args={[radius, radius, displayHeight, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe={true}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
