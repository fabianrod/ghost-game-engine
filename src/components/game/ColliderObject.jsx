import { RigidBody, CapsuleCollider, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import { calculateCylinderCollider } from '../../utils/colliderUtils';

/**
 * Componente para colliders invisibles que funcionan como límites
 * Similar a los colliders de Unity 3D
 * @param {Object} props
 * @param {string} props.colliderType - Tipo de collider: 'cylinder' o 'box'
 * @param {Array} props.position - Posición [x, y, z]
 * @param {Array} props.scale - Escala [x, y, z] (radio X/Z y altura Y para cylinder, dimensiones para box)
 * @param {Array} props.rotation - Rotación [x, y, z] en grados
 */
export const ColliderObject = ({
  colliderType = 'cylinder',
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
}) => {
  // Convertir rotación de grados a radianes
  const rotationInRadians = useMemo(() => {
    return rotation.map(angle => (angle * Math.PI) / 180);
  }, [rotation]);

  // Renderizar collider cilíndrico
  if (colliderType === 'cylinder') {
    const colliderParams = calculateCylinderCollider({
      type: 'cylinder',
      position: [0, 0, 0], // Posición relativa al RigidBody
      scale,
      rotation: [0, 0, 0], // Rotación relativa al RigidBody
    });

    if (!colliderParams) {
      console.warn('[ColliderObject] Error calculando collider cilíndrico');
      return null;
    }

    const { radius, halfHeight, rotation: colliderRotation } = colliderParams;

    // Combinar rotación del objeto con rotación del collider
    const combinedRotation = [
      rotationInRadians[0] + colliderRotation[0],
      rotationInRadians[1] + colliderRotation[1],
      rotationInRadians[2] + colliderRotation[2],
    ];

    // Si el collider tiene rotación significativa en X o Z, necesitamos un RigidBody separado
    const needsSeparateRigidBody = Math.abs(colliderRotation[0]) > 0.01 || Math.abs(colliderRotation[2]) > 0.01;

    if (needsSeparateRigidBody) {
      return (
        <RigidBody
          type="fixed"
          position={position}
          rotation={combinedRotation}
        >
          <CapsuleCollider
            args={[halfHeight, radius]}
            position={[0, 0, 0]}
          />
        </RigidBody>
      );
    } else {
      return (
        <RigidBody
          type="fixed"
          position={position}
          rotation={rotationInRadians}
        >
          <CapsuleCollider
            args={[halfHeight, radius]}
            position={[0, 0, 0]}
          />
        </RigidBody>
      );
    }
  }

  // Renderizar collider de caja
  if (colliderType === 'box') {
    return (
      <RigidBody
        type="fixed"
        position={position}
        rotation={rotationInRadians}
      >
        <CuboidCollider
          args={[scale[0] / 2, scale[1] / 2, scale[2] / 2]}
          position={[0, 0, 0]}
        />
      </RigidBody>
    );
  }

  return null;
};

