import { useLoader } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping } from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import grassTexture from '../../assets/textures/grass-min.jpg';

/**
 * Componente de terreno básico para el juego
 * Crea un plano grande que sirve como suelo del escenario con colisiones
 * @param {boolean} hasPhysics - Si es false, no incluye física (útil para editor)
 */
export const Terrain = ({ hasPhysics = true }) => {
  const texture = useLoader(TextureLoader, grassTexture);
  
  // Repetir la textura para que cubra todo el terreno
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(TERRAIN_CONFIG.TEXTURE_REPEAT, TERRAIN_CONFIG.TEXTURE_REPEAT);

  const terrainMesh = (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[TERRAIN_CONFIG.SIZE, TERRAIN_CONFIG.SIZE]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );

  // Si no hay física, solo retornar el mesh
  if (!hasPhysics) {
    return terrainMesh;
  }

  return (
    <>
      {terrainMesh}
      
      {/* Colisión del terreno usando CuboidCollider */}
      {/* args son half-extents: [halfX, halfY, halfZ] */}
      {/* El collider está centrado en Y=0, con halfY=0.1, así que va de -0.1 a 0.1 */}
      {/* La parte superior del collider está en Y=0.1, que es donde el jugador debería tocar */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <CuboidCollider 
          args={[TERRAIN_CONFIG.COLLIDER_HALF_X, TERRAIN_CONFIG.COLLIDER_HALF_Y, TERRAIN_CONFIG.COLLIDER_HALF_Z]} 
          position={[0, 0, 0]} 
        />
      </RigidBody>
    </>
  );
};

