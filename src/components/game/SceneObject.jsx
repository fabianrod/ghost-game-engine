import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo, useEffect, useRef } from 'react';
import { OBJECT_CONFIG } from '../../constants/gameConstants';
import { degreesToRadians } from '../../utils/mathUtils';
import { PlayerController } from './PlayerController';
import * as THREE from 'three';

/**
 * Componente genérico para cargar y mostrar cualquier modelo GLB
 * @param {Object} props - Props del componente
 * @param {string} props.model - Ruta al archivo GLB (ej: '/models/raiz-arbol.glb')
 * @param {Array} props.position - Posición [x, y, z] del modelo
 * @param {Array} props.scale - Escala del modelo (opcional, por defecto [1, 1, 1])
 * @param {Array} props.rotation - Rotación del modelo (opcional, por defecto [0, 0, 0])
 * @param {boolean} props.castShadow - Si el objeto proyecta sombras (opcional, por defecto true)
 * @param {boolean} props.receiveShadow - Si el objeto recibe sombras (opcional, por defecto true)
 * @param {boolean} props.hasCollider - Si el objeto tiene colisión física (opcional, por defecto true)
 * @param {boolean} props.autoAdjustY - Si ajusta automáticamente la posición Y (opcional, por defecto true)
 * @param {Array} props.colliderScale - Escala del collider [x, y, z] como multiplicador del tamaño base (opcional, por defecto [0.8, 0.8, 0.8])
 * @param {Array<string>} props.components - Lista de componentes activos (ej: ['playerController']) (opcional)
 * @param {Object} props.componentProps - Propiedades de los componentes (opcional)
 * @param {string} props.objectId - ID del objeto para identificación (opcional)
 */
export const SceneObject = ({ 
  model,
  position = OBJECT_CONFIG.DEFAULT_POSITION, 
  scale = OBJECT_CONFIG.DEFAULT_SCALE,
  rotation = OBJECT_CONFIG.DEFAULT_ROTATION,
  castShadow = true,
  receiveShadow = true,
  hasCollider = true,
  autoAdjustY = true,
  colliderScale = OBJECT_CONFIG.DEFAULT_COLLIDER_SCALE,
  components = [],
  componentProps = {},
  objectId = null
}) => {
  const objectGroupRef = useRef(null);
  const rigidBodyRef = useRef(null);
  
  // Verificar si tiene PlayerController
  const hasPlayerController = components && components.includes('playerController');
  const playerControllerProps = componentProps.playerController || {};
  // Cargar el modelo GLB
  const { scene } = useGLTF(model);

  // Clonar la escena para evitar problemas con múltiples instancias
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Calcular el bounding box del modelo para posicionarlo correctamente
  const boundingBox = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    return box;
  }, [clonedScene]);

  // Calcular la altura mínima del modelo (desde el origen)
  const minY = boundingBox.min.y;
  
  // IMPORTANTE: El cálculo debe ser EXACTAMENTE igual en editor y juego
  // En el editor: visualY = position[1] + offset, donde offset = -minY * scale[1]
  // En el juego: adjustedY = position[1] - minY * scale[1]
  // Ambos dan el mismo resultado: position[1] - minY * scale[1]
  const adjustedPosition = autoAdjustY 
    ? [position[0], position[1] - minY * scale[1], position[2]]
    : position;

  // Calcular el tamaño del collider basado en el bounding box
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());
  
  // Aplicar la escala personalizada del collider
  const colliderSize = new THREE.Vector3(
    size.x * scale[0] * colliderScale[0],
    size.y * scale[1] * colliderScale[1],
    size.z * scale[2] * colliderScale[2]
  );

  // Convertir rotación de grados a radianes si es necesario
  // IMPORTANTE: Para objetos con PlayerController, asegurar rotación inicial en [0, 0, 0]
  const rotationInRadians = useMemo(() => {
    if (hasPlayerController) {
      // Si tiene PlayerController, forzar rotación inicial en 0 para evitar volteos
      return [0, 0, 0];
    }
    return degreesToRadians(rotation);
  }, [rotation, hasPlayerController]);

  // Asegurar que todos los meshes sean raycastables
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Asegurar que el mesh sea raycastable
        child.raycast = THREE.Mesh.prototype.raycast;
        // Asegurar que la geometría esté actualizada
        if (child.geometry) {
          child.geometry.computeBoundingBox();
        }
      }
    });
  }, [clonedScene]);

  const objectContent = (
    <primitive 
      object={clonedScene} 
      scale={scale}
      rotation={rotationInRadians}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );

  // Si tiene PlayerController, el RigidBody debe ser dinámico
  const rigidBodyType = hasPlayerController ? 'dynamic' : 'fixed';

  // Configurar userData para identificación (para cámaras que siguen objetos)
  useEffect(() => {
    if (objectId) {
      // Usar un pequeño delay para asegurar que el RigidBody esté montado
      const timer = setTimeout(() => {
        // Marcar el RigidBody si existe y tiene userData
        if (rigidBodyRef.current) {
          // Asegurar que userData existe antes de asignar
          if (!rigidBodyRef.current.userData) {
            rigidBodyRef.current.userData = {};
          }
          rigidBodyRef.current.userData.objectId = objectId;
          rigidBodyRef.current.userData.hasPhysics = true;
        }
        // Marcar el grupo también
        if (objectGroupRef.current) {
          // Asegurar que userData existe antes de asignar
          if (!objectGroupRef.current.userData) {
            objectGroupRef.current.userData = {};
          }
          objectGroupRef.current.userData.objectId = objectId;
          objectGroupRef.current.userData.hasPhysics = hasCollider;
          objectGroupRef.current.userData.rigidBodyRef = rigidBodyRef;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [objectId, hasCollider]);

  // Establecer posición inmediatamente cuando el RigidBody esté montado (para evitar flotación inicial)
  useEffect(() => {
    if (hasPlayerController && rigidBodyRef.current) {
      // Establecer posición y velocidad inmediatamente para evitar que la gravedad lo mueva
      const timer = setTimeout(() => {
        if (rigidBodyRef.current) {
          const pos = new THREE.Vector3(...adjustedPosition);
          rigidBodyRef.current.setTranslation(pos);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
        }
      }, 0); // Ejecutar en el siguiente tick
      
      return () => clearTimeout(timer);
    }
  }, [hasPlayerController, adjustedPosition]);

  // Si tiene colisión, envolver en RigidBody
  if (hasCollider) {
    return (
      <RigidBody 
        ref={rigidBodyRef}
        type={rigidBodyType} 
        position={adjustedPosition}
        rotation={hasPlayerController ? [0, 0, 0] : rotationInRadians} // Rotación inicial en 0 para PlayerController
        lockRotations={hasPlayerController ? [true, false, true] : false} // Bloquear rotación X y Z si tiene PlayerController
        gravityScale={hasPlayerController ? 0 : 1} // Desactivar gravedad inicialmente para PlayerController (se activará después)
        linearDamping={hasPlayerController ? 0 : undefined} // Sin damping lineal para PlayerController (movimiento más responsivo)
        angularDamping={hasPlayerController ? 0 : undefined} // Sin damping angular para PlayerController
        canSleep={false} // Evitar que el cuerpo se duerma (importante para PlayerController)
      >
        <group ref={objectGroupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
          {objectContent}
        </group>
        {/* Collider basado en el tamaño del modelo con escala personalizada */}
        <CuboidCollider 
          args={[colliderSize.x / 2, colliderSize.y / 2, colliderSize.z / 2]}
          position={[center.x * scale[0], center.y * scale[1], center.z * scale[2]]}
        />
        
        {/* PlayerController si está activo - debe estar dentro del RigidBody */}
        {hasPlayerController && (
          <PlayerController
            objectRef={objectGroupRef}
            initialPosition={adjustedPosition} // Usar posición absoluta ajustada
            speed={playerControllerProps.speed || 5}
            enabled={playerControllerProps.enabled !== false}
            usePhysics={true}
            rigidBodyRef={rigidBodyRef}
            boundingBox={boundingBox}
            scale={scale}
          />
        )}
      </RigidBody>
    );
  }

  // Si no tiene colisión pero tiene PlayerController, usar movimiento directo
  if (hasPlayerController) {
    return (
      <group ref={objectGroupRef} position={adjustedPosition} rotation={rotationInRadians}>
        {objectContent}
        <PlayerController
          objectRef={objectGroupRef}
          initialPosition={adjustedPosition}
          speed={playerControllerProps.speed || 5}
          enabled={playerControllerProps.enabled !== false}
          usePhysics={false}
        />
      </group>
    );
  }

  // Si no tiene colisión ni PlayerController, solo renderizar el objeto
  return (
    <group ref={objectGroupRef} position={adjustedPosition} rotation={rotationInRadians}>
      {objectContent}
    </group>
  );
};

// Precargar modelos comunes (se puede expandir)
// useGLTF.preload('/models/raiz-arbol.glb');

