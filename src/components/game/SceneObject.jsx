import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo, useEffect } from 'react';
import { OBJECT_CONFIG } from '../../constants/gameConstants';
import { degreesToRadians } from '../../utils/mathUtils';
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
  colliderScale = OBJECT_CONFIG.DEFAULT_COLLIDER_SCALE
}) => {
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
  // Ajustar la posición Y para que el modelo esté sobre el terreno (Y=0)
  // IMPORTANTE: La posición guardada es la "base", y aquí aplicamos el mismo offset que en el editor
  // En el editor: visualY = position[1] + (-minY * scale[1])
  // En el juego: adjustedY = position[1] - minY * scale[1]
  // Ambos deben dar el mismo resultado visual
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
  const rotationInRadians = useMemo(() => {
    return degreesToRadians(rotation);
  }, [rotation]);

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

  // Si tiene colisión, envolver en RigidBody
  if (hasCollider) {
    return (
      <RigidBody type="fixed" position={adjustedPosition}>
        {objectContent}
        {/* Collider basado en el tamaño del modelo con escala personalizada */}
        <CuboidCollider 
          args={[colliderSize.x / 2, colliderSize.y / 2, colliderSize.z / 2]}
          position={[center.x * scale[0], center.y * scale[1], center.z * scale[2]]}
        />
      </RigidBody>
    );
  }

  // Si no tiene colisión, solo renderizar el objeto
  return (
    <group position={adjustedPosition} rotation={rotationInRadians}>
      {objectContent}
    </group>
  );
};

// Precargar modelos comunes (se puede expandir)
// useGLTF.preload('/models/raiz-arbol.glb');

