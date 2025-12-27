import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo } from 'react';
import * as THREE from 'three';

// Ruta al modelo GLB - desde la carpeta public
const TREE_ROOT_MODEL = '/models/raiz-arbol.glb';

/**
 * Componente para cargar y mostrar la raíz del árbol
 * Escala por defecto ajustada para proporción correcta con personaje de 1.80m
 * @param {Object} props - Props del componente
 * @param {Array} props.position - Posición [x, y, z] del modelo
 * @param {Array} props.scale - Escala del modelo (opcional, por defecto 0.6)
 * @param {Array} props.rotation - Rotación del modelo (opcional)
 */
export const TreeRoot = ({ 
  position = [5, 0, 5], 
  scale = [0.6, 0.6, 0.6],
  rotation = [0, 0, 0]
}) => {
  const { scene } = useGLTF(TREE_ROOT_MODEL);

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
  // Si minY es negativo, necesitamos elevar el modelo
  const adjustedPosition = [position[0], position[1] - minY * scale[1], position[2]];

  // Calcular el tamaño del collider basado en el bounding box
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  return (
    <RigidBody type="fixed" position={adjustedPosition}>
      <primitive 
        object={clonedScene} 
        scale={scale}
        rotation={rotation}
        castShadow
        receiveShadow
      />
      {/* Collider basado en el tamaño del modelo */}
      <CuboidCollider 
        args={[size.x * scale[0] / 2, size.y * scale[1] / 2, size.z * scale[2] / 2]}
        position={[center.x * scale[0], center.y * scale[1], center.z * scale[2]]}
      />
    </RigidBody>
  );
};

// Precargar el modelo para mejor rendimiento (fuera del componente)
useGLTF.preload(TREE_ROOT_MODEL);

