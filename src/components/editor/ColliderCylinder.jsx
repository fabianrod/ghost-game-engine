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
  
  // Validar que todos los valores sean números válidos y finitos
  const validRadius = typeof radius === 'number' && isFinite(radius) && radius > 0 ? radius : 1;
  const validHalfHeight = typeof halfHeight === 'number' && isFinite(halfHeight) && halfHeight > 0 ? halfHeight : 0.5;
  const validHeight = typeof height === 'number' && isFinite(height) && height > 0 ? height : 1;
  
  // Validar que no sean valores extremos que puedan causar problemas de renderizado
  const safeRadius = Math.max(0.01, Math.min(1000, validRadius));
  const safeHalfHeight = Math.max(0.01, Math.min(1000, validHalfHeight));
  const safeHeight = Math.max(0.01, Math.min(1000, validHeight));
  
  const opacity = isSelected ? 0.4 : 0.2;

  // Renderizar como cilindro wireframe (simplificado para el editor)
  // Para cápsula, mostramos la altura total que incluye las semiesferas
  const displayHeight = showCapsuleShape ? (safeHalfHeight * 2 + safeRadius * 2) : safeHeight;
  
  // Validar que displayHeight sea válido
  const safeDisplayHeight = Math.max(0.01, Math.min(2000, displayHeight));
  
  try {
    return (
      <group position={position} rotation={rotationInRadians}>
        <mesh>
          <cylinderGeometry args={[safeRadius, safeRadius, safeDisplayHeight, 32]} />
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
  } catch (error) {
    console.error('[ColliderCylinder] Error renderizando cilindro:', error);
    // Retornar un cilindro por defecto seguro en caso de error
    return (
      <group position={position} rotation={rotationInRadians}>
        <mesh>
          <cylinderGeometry args={[1, 1, 2, 32]} />
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
  }
};
