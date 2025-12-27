import { useLoader } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping } from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import grassTexture from '../../assets/textures/grass-min.jpg';

/**
 * Componente de terreno básico para el juego
 * Crea un plano grande que sirve como suelo del escenario con colisiones
 */
export const Terrain = () => {
  const texture = useLoader(TextureLoader, grassTexture);
  
  // Repetir la textura para que cubra todo el terreno
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 10);

  return (
    <>
      {/* Terreno visual con textura de pasto */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      {/* Colisión del terreno usando CuboidCollider */}
      {/* args son half-extents: [halfX, halfY, halfZ] */}
      {/* El collider está centrado en Y=0, con halfY=0.1, así que va de -0.1 a 0.1 */}
      {/* La parte superior del collider está en Y=0.1, que es donde el jugador debería tocar */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <CuboidCollider 
          args={[50, 0.1, 50]} 
          position={[0, 0, 0]} 
        />
      </RigidBody>
    </>
  );
};

