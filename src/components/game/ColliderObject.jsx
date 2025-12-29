import { RigidBody, CapsuleCollider, CuboidCollider, BallCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import { OBJECT_CONFIG, COLLIDER_CONFIG } from '../../constants/gameConstants';
import { calculateCylinderCollider } from '../../utils/colliderUtils';
import { degreesToRadians, validateVector } from '../../utils/mathUtils';

/**
 * Componente para colliders invisibles que funcionan como límites
 * Similar a los colliders de Unity 3D
 * @param {Object} props
 * @param {string} props.colliderType - Tipo de collider: 'cylinder', 'box', 'sphere', 'capsule'
 * @param {Array} props.position - Posición [x, y, z]
 * @param {Array} props.scale - Escala [x, y, z] (dimensiones según el tipo)
 * @param {Array} props.rotation - Rotación [x, y, z] en grados
 * @param {boolean} props.isTrigger - Si es un trigger (no bloquea físicamente)
 * @param {boolean} props.isSensor - Si es un sensor (detecta colisiones sin física)
 * @param {Object} props.physicsMaterial - Material físico { friction, restitution }
 */
export const ColliderObject = ({
  colliderType = COLLIDER_CONFIG.DEFAULT_TYPE,
  position = OBJECT_CONFIG.DEFAULT_POSITION,
  scale = OBJECT_CONFIG.DEFAULT_SCALE,
  rotation = OBJECT_CONFIG.DEFAULT_ROTATION,
  isTrigger = false,
  isSensor = false,
  physicsMaterial = COLLIDER_CONFIG.DEFAULT_PHYSICS_MATERIAL,
}) => {
  // Validar y normalizar inputs
  const validPosition = useMemo(() => validateVector(position, OBJECT_CONFIG.DEFAULT_POSITION), [position]);
  const validScale = useMemo(() => validateVector(scale, OBJECT_CONFIG.DEFAULT_SCALE), [scale]);
  const validRotation = useMemo(() => validateVector(rotation, OBJECT_CONFIG.DEFAULT_ROTATION), [rotation]);
  
  // Convertir rotación de grados a radianes
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(validRotation);
  }, [validRotation]);

  // Material físico
  const materialProps = useMemo(() => {
    const material = physicsMaterial || COLLIDER_CONFIG.DEFAULT_PHYSICS_MATERIAL;
    return {
      friction: material.friction ?? 0.7,
      restitution: material.restitution ?? 0.0,
    };
  }, [physicsMaterial]);

  // Tipo de RigidBody: si es trigger o sensor, usar 'kinematicPositionBased'
  const rigidBodyType = useMemo(() => {
    if (isTrigger || isSensor) {
      return 'kinematicPositionBased'; // No afecta físicamente pero detecta colisiones
    }
    return 'fixed'; // Collider estático
  }, [isTrigger, isSensor]);

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
        type={rigidBodyType}
        position={validPosition}
        rotation={needsSeparateRigidBody ? combinedRotation : rotationInRadians}
      >
        <CapsuleCollider
          args={[adjustedHalfHeight, adjustedRadius]}
          position={[0, 0, 0]}
          sensor={isSensor}
          {...materialProps}
        />
      </RigidBody>
    );
  }

  // Renderizar collider de caja
  if (colliderType === 'box') {
    return (
      <RigidBody
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
      >
        <CuboidCollider
          args={[validScale[0] / 2, validScale[1] / 2, validScale[2] / 2]}
          position={[0, 0, 0]}
          sensor={isSensor}
          {...materialProps}
        />
      </RigidBody>
    );
  }

  // Renderizar collider esférico
  if (colliderType === 'sphere') {
    // Para sphere, usar el promedio de las escalas como radio
    const radius = (validScale[0] + validScale[1] + validScale[2]) / 6; // Promedio / 2
    
    return (
      <RigidBody
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
      >
        <BallCollider
          args={[radius]}
          position={[0, 0, 0]}
          sensor={isSensor}
          {...materialProps}
        />
      </RigidBody>
    );
  }

  // Renderizar collider cápsula (similar a cylinder pero con semiesferas)
  if (colliderType === 'capsule') {
    // Para capsule, scale[0] y scale[2] son el radio, scale[1] es la altura
    const radius = (validScale[0] + validScale[2]) / 2;
    const height = validScale[1];
    const halfHeight = Math.max(0, (height - radius * 2) / 2);
    
    return (
      <RigidBody
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
      >
        <CapsuleCollider
          args={[halfHeight, radius]}
          position={[0, 0, 0]}
          sensor={isSensor}
          {...materialProps}
        />
      </RigidBody>
    );
  }

  return null;
};

