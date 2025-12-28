import { RigidBody, CapsuleCollider, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import { OBJECT_CONFIG, COLLIDER_CONFIG } from '../../constants/gameConstants';
import { calculateCylinderCollider } from '../../utils/colliderUtils';
import { degreesToRadians, validateVector } from '../../utils/mathUtils';

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
  colliderType = COLLIDER_CONFIG.DEFAULT_TYPE,
  position = OBJECT_CONFIG.DEFAULT_POSITION,
  scale = OBJECT_CONFIG.DEFAULT_SCALE,
  rotation = OBJECT_CONFIG.DEFAULT_ROTATION,
}) => {
  // Validar y normalizar inputs
  const validPosition = useMemo(() => validateVector(position, OBJECT_CONFIG.DEFAULT_POSITION), [position]);
  const validScale = useMemo(() => validateVector(scale, OBJECT_CONFIG.DEFAULT_SCALE), [scale]);
  const validRotation = useMemo(() => validateVector(rotation, OBJECT_CONFIG.DEFAULT_ROTATION), [rotation]);
  
  // Convertir rotación de grados a radianes
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(validRotation);
  }, [validRotation]);

  // Renderizar collider cilíndrico
  if (colliderType === 'cylinder') {
    const colliderParams = calculateCylinderCollider({
      type: 'cylinder',
      position: [0, 0, 0], // Posición relativa al RigidBody
      scale: validScale,
      rotation: [0, 0, 0], // Rotación relativa al RigidBody
    });

    if (!colliderParams) {
      console.warn('[ColliderObject] Error calculando collider cilíndrico');
      return null;
    }

    const { radius, halfHeight, height, rotation: colliderRotation } = colliderParams;

    // CapsuleCollider en Rapier: args={[halfHeight, radius]}
    // La altura total de la cápsula es: halfHeight * 2 + radius * 2
    // Para un collider cilíndrico, interpretamos scale[1] como la altura total deseada
    // y scale[0]/scale[2] como el radio
    
    // Si la altura deseada es menor que el diámetro (2*radius), ajustamos el radio
    let adjustedRadius = radius;
    let adjustedHalfHeight = halfHeight;
    
    // Si height < 2*radius, reducimos el radio para que quepa
    if (height < radius * 2) {
      adjustedRadius = Math.max(0.1, height / 2);
      adjustedHalfHeight = 0; // Solo semiesferas, sin cilindro
    } else {
      // Ajustar halfHeight para que la altura total sea aproximadamente height
      // height = halfHeight * 2 + adjustedRadius * 2
      // halfHeight = (height - adjustedRadius * 2) / 2
      adjustedHalfHeight = Math.max(0, (height - adjustedRadius * 2) / 2);
    }

    // Combinar rotación del objeto con rotación del collider
    const combinedRotation = [
      rotationInRadians[0] + colliderRotation[0],
      rotationInRadians[1] + colliderRotation[1],
      rotationInRadians[2] + colliderRotation[2],
    ];

    // Si el collider tiene rotación significativa en X o Z, necesitamos un RigidBody separado
    const needsSeparateRigidBody = Math.abs(colliderRotation[0]) > 0.01 || Math.abs(colliderRotation[2]) > 0.01;

    return (
      <RigidBody
        type="fixed"
        position={validPosition}
        rotation={needsSeparateRigidBody ? combinedRotation : rotationInRadians}
      >
        <CapsuleCollider
          args={[adjustedHalfHeight, adjustedRadius]}
          position={[0, 0, 0]}
        />
      </RigidBody>
    );
  }

  // Renderizar collider de caja
  if (colliderType === 'box') {
    return (
      <RigidBody
        type="fixed"
        position={validPosition}
        rotation={rotationInRadians}
      >
        <CuboidCollider
          args={[validScale[0] / 2, validScale[1] / 2, validScale[2] / 2]}
          position={[0, 0, 0]}
        />
      </RigidBody>
    );
  }

  return null;
};

