import { RigidBody, CapsuleCollider, CuboidCollider, BallCollider } from '@react-three/rapier';
import { useMemo, useEffect, useRef } from 'react';
import { OBJECT_CONFIG, COLLIDER_CONFIG } from '../../constants/gameConstants';
import { calculateCylinderCollider } from '../../utils/colliderUtils';
import { degreesToRadians, validateVector } from '../../utils/mathUtils';
import { ColliderVisual } from './ColliderVisual';
import { PlayerController } from './PlayerController';
import * as THREE from 'three';

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
 * @param {boolean} props.visibleInGame - Si el collider debe ser visible en modo juego
 * @param {string} props.objectId - ID del objeto para identificación (para cámaras que siguen colliders)
 * @param {Array<string>} props.components - Lista de componentes activos (ej: ['playerController'])
 * @param {Object} props.componentProps - Props de los componentes (ej: { playerController: { speed: 5 } })
 */
export const ColliderObject = ({
  colliderType = COLLIDER_CONFIG.DEFAULT_TYPE,
  position = OBJECT_CONFIG.DEFAULT_POSITION,
  scale = OBJECT_CONFIG.DEFAULT_SCALE,
  rotation = OBJECT_CONFIG.DEFAULT_ROTATION,
  isTrigger = false,
  isSensor = false,
  physicsMaterial = COLLIDER_CONFIG.DEFAULT_PHYSICS_MATERIAL,
  visibleInGame = false,
  objectId = null,
  components = [],
  componentProps = {},
}) => {
  const rigidBodyRef = useRef(null);
  const colliderGroupRef = useRef(null);
  
  // Verificar si tiene PlayerController
  const hasPlayerController = components && components.includes('playerController');
  const playerControllerProps = componentProps.playerController || {};
  
  // Calcular bounding box aproximado para el collider (para PlayerController)
  const boundingBox = useMemo(() => {
    if (colliderType === 'cylinder' || colliderType === 'capsule') {
      const colliderParams = calculateCylinderCollider({
        type: colliderType === 'capsule' ? 'cylinder' : 'cylinder',
        position: [0, 0, 0],
        scale,
        rotation: [0, 0, 0],
      });
      if (colliderParams) {
        const { radius, height } = colliderParams;
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
          new THREE.Vector3(0, height / 2, 0),
          new THREE.Vector3(radius * 2, height, radius * 2)
        );
        return box;
      }
    } else if (colliderType === 'box') {
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(0, scale[1] / 2, 0),
        new THREE.Vector3(scale[0], scale[1], scale[2])
      );
      return box;
    } else if (colliderType === 'sphere') {
      const radius = (scale[0] + scale[1] + scale[2]) / 6;
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(0, radius, 0),
        new THREE.Vector3(radius * 2, radius * 2, radius * 2)
      );
      return box;
    }
    // Fallback
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(2, 2, 2)
    );
  }, [colliderType, scale]);
  
  // Validar y normalizar inputs
  const validPosition = useMemo(() => {
    const pos = validateVector(position, OBJECT_CONFIG.DEFAULT_POSITION);
    // Validar que todos los valores sean finitos
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    if (!isValidNumber(pos[0]) || !isValidNumber(pos[1]) || !isValidNumber(pos[2])) {
      return OBJECT_CONFIG.DEFAULT_POSITION;
    }
    return pos;
  }, [position]);
  
  const validScale = useMemo(() => {
    const scl = validateVector(scale, OBJECT_CONFIG.DEFAULT_SCALE);
    // Validar que todos los valores sean finitos y positivos
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0;
    if (!isValidNumber(scl[0]) || !isValidNumber(scl[1]) || !isValidNumber(scl[2])) {
      return OBJECT_CONFIG.DEFAULT_SCALE;
    }
    return scl;
  }, [scale]);
  
  const validRotation = useMemo(() => validateVector(rotation, OBJECT_CONFIG.DEFAULT_ROTATION), [rotation]);
  
  // Convertir rotación de grados a radianes
  // IMPORTANTE: Para colliders con PlayerController, asegurar rotación inicial en [0, 0, 0]
  const rotationInRadians = useMemo(() => {
    if (hasPlayerController) {
      // Si tiene PlayerController, forzar rotación inicial en 0 para evitar volteos
      return [0, 0, 0];
    }
    const radians = degreesToRadians(validRotation);
    // Validar que todos los valores sean finitos
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    if (!Array.isArray(radians) || radians.length < 3 || 
        !isValidNumber(radians[0]) || !isValidNumber(radians[1]) || !isValidNumber(radians[2])) {
      return [0, 0, 0];
    }
    return radians;
  }, [validRotation, hasPlayerController]);

  // Material físico
  const materialProps = useMemo(() => {
    const material = physicsMaterial || COLLIDER_CONFIG.DEFAULT_PHYSICS_MATERIAL;
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    
    // Validar y limitar friction (0 a 10 es un rango razonable)
    const friction = isValidNumber(material.friction) 
      ? Math.max(0, Math.min(10, material.friction))
      : 0.7;
    
    // Validar y limitar restitution (0 a 1 es el rango estándar)
    const restitution = isValidNumber(material.restitution)
      ? Math.max(0, Math.min(1, material.restitution))
      : 0.0;
    
    return {
      friction,
      restitution,
    };
  }, [physicsMaterial]);

  // Tipo de RigidBody: si tiene PlayerController, debe ser dinámico
  // Si es trigger o sensor, usar 'kinematicPositionBased'
  const rigidBodyType = useMemo(() => {
    if (hasPlayerController) {
      return 'dynamic'; // PlayerController requiere RigidBody dinámico
    }
    if (isTrigger || isSensor) {
      return 'kinematicPositionBased'; // No afecta físicamente pero detecta colisiones
    }
    return 'fixed'; // Collider estático
  }, [hasPlayerController, isTrigger, isSensor]);

  // Configurar userData para identificación (para cámaras que siguen colliders)
  useEffect(() => {
    if (objectId) {
      // Usar un pequeño delay para asegurar que el RigidBody esté montado
      const timer = setTimeout(() => {
        if (rigidBodyRef.current) {
          // Asegurar que userData existe antes de asignar
          if (!rigidBodyRef.current.userData) {
            rigidBodyRef.current.userData = {};
          }
          rigidBodyRef.current.userData.objectId = objectId;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [objectId]);

  // Establecer posición inmediatamente cuando el RigidBody esté montado (para evitar flotación inicial)
  useEffect(() => {
    if (hasPlayerController && rigidBodyRef.current) {
      // Establecer posición y velocidad inmediatamente para evitar que la gravedad lo mueva
      const timer = setTimeout(() => {
        if (rigidBodyRef.current) {
          const pos = new THREE.Vector3(...validPosition);
          rigidBodyRef.current.setTranslation(pos);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
        }
      }, 0); // Ejecutar en el siguiente tick
      
      return () => clearTimeout(timer);
    }
  }, [hasPlayerController, validPosition]);

  // Renderizar collider cilíndrico
  if (colliderType === 'cylinder') {
    const colliderParams = calculateCylinderCollider({
      type: 'cylinder',
      position: [0, 0, 0], // Posición relativa al RigidBody
      scale: validScale,
      rotation: [0, 0, 0], // Rotación relativa al RigidBody
    });

    if (!colliderParams) {
      return null;
    }

    const { radius, halfHeight, height, rotation: colliderRotation } = colliderParams;

    // Validar que todos los valores sean números finitos y válidos
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    
    if (!isValidNumber(radius) || !isValidNumber(halfHeight) || !isValidNumber(height)) {
      return null;
    }

    // CapsuleCollider en Rapier: args={[halfHeight, radius]}
    // La altura total de la cápsula es: halfHeight * 2 + radius * 2
    // Para un collider cilíndrico, interpretamos scale[1] como la altura total deseada
    // y scale[0]/scale[2] como el radio
    
    // Si la altura deseada es menor que el diámetro (2*radius), ajustamos el radio
    let adjustedRadius = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, radius));
    let adjustedHalfHeight = Math.max(0, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, halfHeight));
    
    // Si height < 2*radius, reducimos el radio para que quepa
    if (height < adjustedRadius * 2) {
      adjustedRadius = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, height / 2));
      adjustedHalfHeight = 0; // Solo semiesferas, sin cilindro
    } else {
      // Ajustar halfHeight para que la altura total sea aproximadamente height
      // height = halfHeight * 2 + adjustedRadius * 2
      // halfHeight = (height - adjustedRadius * 2) / 2
      adjustedHalfHeight = Math.max(0, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, (height - adjustedRadius * 2) / 2));
    }

    // Validar valores finales antes de pasarlos a Rapier
    if (!isValidNumber(adjustedRadius) || adjustedRadius <= 0 || adjustedRadius > COLLIDER_CONFIG.MAX_DIMENSION) {
      return null;
    }
    
    if (!isValidNumber(adjustedHalfHeight) || adjustedHalfHeight < 0 || adjustedHalfHeight > COLLIDER_CONFIG.MAX_DIMENSION) {
      return null;
    }

    // Combinar rotación del objeto con rotación del collider
    const combinedRotation = [
      rotationInRadians[0] + (colliderRotation[0] || 0),
      rotationInRadians[1] + (colliderRotation[1] || 0),
      rotationInRadians[2] + (colliderRotation[2] || 0),
    ];

    // Validar rotación
    const validCombinedRotation = combinedRotation.map(r => 
      isValidNumber(r) ? r : 0
    );

    // Si el collider tiene rotación significativa en X o Z, necesitamos un RigidBody separado
    const needsSeparateRigidBody = Math.abs(colliderRotation[0] || 0) > 0.01 || Math.abs(colliderRotation[2] || 0) > 0.01;

    return (
      <RigidBody
        ref={rigidBodyRef}
        type={rigidBodyType}
        position={validPosition}
        rotation={needsSeparateRigidBody ? validCombinedRotation : rotationInRadians}
        lockRotations={hasPlayerController ? [true, false, true] : false}
        gravityScale={hasPlayerController ? 0 : 1} // Desactivar gravedad inicialmente para PlayerController
        linearDamping={hasPlayerController ? 0 : undefined}
        angularDamping={hasPlayerController ? 0 : undefined}
        canSleep={false}
      >
        <group ref={colliderGroupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <CapsuleCollider
            args={[adjustedHalfHeight, adjustedRadius]}
            position={[0, 0, 0]}
            sensor={isSensor}
            {...materialProps}
          />
          {visibleInGame && (
            <ColliderVisual
              colliderType="cylinder"
              position={[0, 0, 0]}
              scale={validScale}
              rotation={rotation}
            />
          )}
        </group>
        {hasPlayerController && (
          <PlayerController
            objectRef={colliderGroupRef}
            initialPosition={validPosition}
            speed={playerControllerProps.speed || 5}
            enabled={playerControllerProps.enabled !== false}
            usePhysics={true}
            rigidBodyRef={rigidBodyRef}
            boundingBox={boundingBox}
            scale={validScale}
          />
        )}
      </RigidBody>
    );
  }

  // Renderizar collider de caja
  if (colliderType === 'box') {
    // Validar y limitar dimensiones de la caja
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    
    const halfX = validScale[0] / 2;
    const halfY = validScale[1] / 2;
    const halfZ = validScale[2] / 2;
    
    // Validar que todos los valores sean válidos
    if (!isValidNumber(halfX) || !isValidNumber(halfY) || !isValidNumber(halfZ)) {
      return null;
    }
    
    // Limitar dimensiones a valores razonables
    const safeHalfX = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION / 2, halfX));
    const safeHalfY = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION / 2, halfY));
    const safeHalfZ = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION / 2, halfZ));
    
    return (
      <RigidBody
        ref={rigidBodyRef}
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
        lockRotations={hasPlayerController ? [true, false, true] : false}
        gravityScale={hasPlayerController ? 0 : 1} // Desactivar gravedad inicialmente para PlayerController
        linearDamping={hasPlayerController ? 0 : undefined}
        angularDamping={hasPlayerController ? 0 : undefined}
        canSleep={false}
      >
        <group ref={colliderGroupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <CuboidCollider
            args={[safeHalfX, safeHalfY, safeHalfZ]}
            position={[0, 0, 0]}
            sensor={isSensor}
            {...materialProps}
          />
          {visibleInGame && (
            <ColliderVisual
              colliderType="box"
              position={[0, 0, 0]}
              scale={validScale}
              rotation={rotation}
            />
          )}
        </group>
        {hasPlayerController && (
          <PlayerController
            objectRef={colliderGroupRef}
            initialPosition={validPosition}
            speed={playerControllerProps.speed || 5}
            enabled={playerControllerProps.enabled !== false}
            usePhysics={true}
            rigidBodyRef={rigidBodyRef}
            boundingBox={boundingBox}
            scale={validScale}
          />
        )}
      </RigidBody>
    );
  }

  // Renderizar collider esférico
  if (colliderType === 'sphere') {
    // Para sphere, usar el promedio de las escalas como radio
    const radius = (validScale[0] + validScale[1] + validScale[2]) / 6; // Promedio / 2
    
    // Validar que el radio sea válido
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    
    if (!isValidNumber(radius) || radius <= 0) {
      return null;
    }
    
    // Limitar radio a valores razonables
    const safeRadius = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, radius));
    
    return (
      <RigidBody
        ref={rigidBodyRef}
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
        lockRotations={hasPlayerController ? [true, false, true] : false}
        gravityScale={hasPlayerController ? 0 : 1} // Desactivar gravedad inicialmente para PlayerController
        linearDamping={hasPlayerController ? 0 : undefined}
        angularDamping={hasPlayerController ? 0 : undefined}
        canSleep={false}
      >
        <group ref={colliderGroupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <BallCollider
            args={[safeRadius]}
            position={[0, 0, 0]}
            sensor={isSensor}
            {...materialProps}
          />
          {visibleInGame && (
            <ColliderVisual
              colliderType="sphere"
              position={[0, 0, 0]}
              scale={validScale}
              rotation={rotation}
            />
          )}
        </group>
        {hasPlayerController && (
          <PlayerController
            objectRef={colliderGroupRef}
            initialPosition={validPosition}
            speed={playerControllerProps.speed || 5}
            enabled={playerControllerProps.enabled !== false}
            usePhysics={true}
            rigidBodyRef={rigidBodyRef}
            boundingBox={boundingBox}
            scale={validScale}
          />
        )}
      </RigidBody>
    );
  }

  // Renderizar collider cápsula (similar a cylinder pero con semiesferas)
  if (colliderType === 'capsule') {
    // Para capsule, scale[0] y scale[2] son el radio, scale[1] es la altura
    const radius = (validScale[0] + validScale[2]) / 2;
    const height = validScale[1];
    
    // Validar valores
    const isValidNumber = (val) => typeof val === 'number' && isFinite(val) && !isNaN(val);
    
    if (!isValidNumber(radius) || !isValidNumber(height)) {
      return null;
    }
    
    // Limitar valores a rangos válidos
    const safeRadius = Math.max(COLLIDER_CONFIG.MIN_RADIUS, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, radius));
    const safeHeight = Math.max(COLLIDER_CONFIG.MIN_HEIGHT, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, height));
    
    // Calcular halfHeight de forma segura
    const halfHeight = Math.max(0, Math.min(COLLIDER_CONFIG.MAX_DIMENSION, (safeHeight - safeRadius * 2) / 2));
    
    // Validar valores finales
    if (!isValidNumber(halfHeight) || halfHeight < 0 || !isValidNumber(safeRadius) || safeRadius <= 0) {
      return null;
    }
    
    return (
      <RigidBody
        ref={rigidBodyRef}
        type={rigidBodyType}
        position={validPosition}
        rotation={rotationInRadians}
        lockRotations={hasPlayerController ? [true, false, true] : false}
        gravityScale={hasPlayerController ? 0 : 1} // Desactivar gravedad inicialmente para PlayerController
        linearDamping={hasPlayerController ? 0 : undefined}
        angularDamping={hasPlayerController ? 0 : undefined}
        canSleep={false}
      >
        <group ref={colliderGroupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <CapsuleCollider
            args={[halfHeight, safeRadius]}
            position={[0, 0, 0]}
            sensor={isSensor}
            {...materialProps}
          />
          {visibleInGame && (
            <ColliderVisual
              colliderType="capsule"
              position={[0, 0, 0]}
              scale={validScale}
              rotation={rotation}
            />
          )}
        </group>
        {hasPlayerController && (
          <PlayerController
            objectRef={colliderGroupRef}
            initialPosition={validPosition}
            speed={playerControllerProps.speed || 5}
            enabled={playerControllerProps.enabled !== false}
            usePhysics={true}
            rigidBodyRef={rigidBodyRef}
            boundingBox={boundingBox}
            scale={validScale}
          />
        )}
      </RigidBody>
    );
  }

  return null;
};

