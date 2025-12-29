import { useMemo } from 'react';
import * as THREE from 'three';
import { calculateCylinderCollider } from '../../utils/colliderUtils';
import { degreesToRadians } from '../../utils/mathUtils';
import { COLLIDER_CONFIG } from '../../constants/gameConstants';

/**
 * Color blanquecino para colliders visibles en modo juego
 */
const COLLIDER_VISUAL_COLOR = '#f5f5f5';
const COLLIDER_VISUAL_OPACITY = 0.3;

/**
 * Componente visual para collider cilíndrico en modo juego
 */
const CylinderColliderVisual = ({ position, scale, rotation }) => {
  const colliderParams = useMemo(() => {
    return calculateCylinderCollider({
      type: 'cylinder',
      position: [0, 0, 0],
      scale,
      rotation: [0, 0, 0],
    });
  }, [scale]);

  const rotationInRadians = useMemo(() => {
    return degreesToRadians(rotation);
  }, [rotation]);

  if (!colliderParams) return null;

  const { radius, halfHeight, height } = colliderParams;
  
  const validRadius = typeof radius === 'number' && isFinite(radius) && radius > 0 ? radius : 1;
  const validHalfHeight = typeof halfHeight === 'number' && isFinite(halfHeight) && halfHeight >= 0 ? halfHeight : 0.5;
  const validHeight = typeof height === 'number' && isFinite(height) && height > 0 ? height : 1;
  
  const safeRadius = Math.max(0.01, Math.min(1000, validRadius));
  const safeHalfHeight = Math.max(0, Math.min(1000, validHalfHeight));
  const safeHeight = Math.max(0.01, Math.min(1000, validHeight));
  
  // Para cápsula, mostrar altura total
  const displayHeight = safeHalfHeight * 2 + safeRadius * 2;
  const safeDisplayHeight = Math.max(0.01, Math.min(2000, displayHeight));

  return (
    <group position={position} rotation={rotationInRadians}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[safeRadius, safeRadius, safeDisplayHeight, 32]} />
        <meshStandardMaterial
          color={COLLIDER_VISUAL_COLOR}
          transparent
          opacity={COLLIDER_VISUAL_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

/**
 * Componente visual para collider de caja en modo juego
 */
const BoxColliderVisual = ({ position, scale, rotation }) => {
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(rotation);
  }, [rotation]);

  const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0;
  
  const safeScale = [
    isValidNumber(scale[0]) ? Math.max(0.01, Math.min(1000, scale[0])) : 1,
    isValidNumber(scale[1]) ? Math.max(0.01, Math.min(1000, scale[1])) : 1,
    isValidNumber(scale[2]) ? Math.max(0.01, Math.min(1000, scale[2])) : 1,
  ];

  return (
    <group position={position} rotation={rotationInRadians}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={safeScale} />
        <meshStandardMaterial
          color={COLLIDER_VISUAL_COLOR}
          transparent
          opacity={COLLIDER_VISUAL_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

/**
 * Componente visual para collider esférico en modo juego
 */
const SphereColliderVisual = ({ position, scale, rotation }) => {
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(rotation);
  }, [rotation]);

  // Calcular radio promedio
  const radius = (scale[0] + scale[1] + scale[2]) / 6;
  const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0;
  const safeRadius = isValidNumber(radius) ? Math.max(0.01, Math.min(1000, radius)) : 1;

  return (
    <group position={position} rotation={rotationInRadians}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[safeRadius, 32, 32]} />
        <meshStandardMaterial
          color={COLLIDER_VISUAL_COLOR}
          transparent
          opacity={COLLIDER_VISUAL_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

/**
 * Componente visual para collider cápsula en modo juego
 */
const CapsuleColliderVisual = ({ position, scale, rotation }) => {
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(rotation);
  }, [rotation]);

  const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0;
  
  const radius = (scale[0] + scale[2]) / 2;
  const height = scale[1];
  
  const safeRadius = isValidNumber(radius) ? Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, radius)) : 1;
  const safeHeight = isValidNumber(height) ? Math.max(COLLIDER_CONFIG.MIN_HEIGHT, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, height)) : 2;
  
  const halfHeight = Math.max(0, (safeHeight - safeRadius * 2) / 2);
  const displayHeight = halfHeight * 2 + safeRadius * 2;

  return (
    <group position={position} rotation={rotationInRadians}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[safeRadius, safeRadius, displayHeight, 32]} />
        <meshStandardMaterial
          color={COLLIDER_VISUAL_COLOR}
          transparent
          opacity={COLLIDER_VISUAL_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

/**
 * Componente principal que renderiza la visualización del collider según su tipo
 */
export const ColliderVisual = ({ colliderType, position, scale, rotation }) => {
  if (colliderType === 'cylinder') {
    return <CylinderColliderVisual position={position} scale={scale} rotation={rotation} />;
  }
  
  if (colliderType === 'box') {
    return <BoxColliderVisual position={position} scale={scale} rotation={rotation} />;
  }
  
  if (colliderType === 'sphere') {
    return <SphereColliderVisual position={position} scale={scale} rotation={rotation} />;
  }
  
  if (colliderType === 'capsule') {
    return <CapsuleColliderVisual position={position} scale={scale} rotation={rotation} />;
  }
  
  return null;
};

