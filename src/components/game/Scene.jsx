import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky, KeyboardControls } from '@react-three/drei';
import { Terrain } from './Terrain';
import { Player } from './Player';
import { LevelLoader } from './LevelLoader';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import {
  PHYSICS_CONFIG,
  LIGHTING_CONFIG,
  SKY_CONFIG,
  CAMERA_CONFIG,
  POSTPROCESSING_CONFIG,
  PLAYER_CONFIG,
} from '../../constants/gameConstants';

// Componente que configura la cámara inicial si no hay cámara activa
const DefaultCameraSetup = () => {
  const { camera, scene } = useThree();
  
  useEffect(() => {
    // Esperar un frame para verificar si hay cámaras activas
    const timer = setTimeout(() => {
      // Verificar si hay alguna cámara activa en la escena
      let hasActiveCamera = false;
      scene.traverse((obj) => {
        if (obj.userData?.isActiveCamera) {
          hasActiveCamera = true;
        }
      });
      
      // Si no hay cámara activa, configurar vista del terreno completo
      if (!hasActiveCamera) {
        camera.position.set(0, 40, 60);
        camera.lookAt(0, 0, 0); // Mirar al centro del terreno
        camera.updateProjectionMatrix();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [camera, scene]);
  
  return null;
};

/**
 * Mapa de controles de teclado
 */
const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
];

/**
 * Componente principal de la escena del juego
 * Configura el Canvas, física, iluminación y elementos del juego
 */
export const GameScene = () => {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        camera={{ 
          position: [0, 40, 60], // Vista aérea del terreno completo por defecto (si no hay cámara activa)
          fov: CAMERA_CONFIG.GAME_FOV
        }}
        style={{ width: '100vw', height: '100vh' }}
      >
      {/* Iluminación - sincronizada con la posición del sol */}
      <ambientLight intensity={LIGHTING_CONFIG.AMBIENT_INTENSITY} />
      <directionalLight
        position={LIGHTING_CONFIG.DIRECTIONAL_POSITION}
        intensity={LIGHTING_CONFIG.DIRECTIONAL_INTENSITY}
        castShadow
        shadow-mapSize-width={LIGHTING_CONFIG.SHADOW_MAP_SIZE}
        shadow-mapSize-height={LIGHTING_CONFIG.SHADOW_MAP_SIZE}
        shadow-camera-far={LIGHTING_CONFIG.SHADOW_CAMERA_FAR}
        shadow-camera-left={LIGHTING_CONFIG.SHADOW_CAMERA_LEFT}
        shadow-camera-right={LIGHTING_CONFIG.SHADOW_CAMERA_RIGHT}
        shadow-camera-top={LIGHTING_CONFIG.SHADOW_CAMERA_TOP}
        shadow-camera-bottom={LIGHTING_CONFIG.SHADOW_CAMERA_BOTTOM}
      />

      {/* Cielo estilo GTA San Andreas */}
      <Sky
        sunPosition={SKY_CONFIG.SUN_POSITION}
        inclination={SKY_CONFIG.INCLINATION}
        azimuth={SKY_CONFIG.AZIMUTH}
        turbidity={SKY_CONFIG.TURBIDITY}
        rayleigh={SKY_CONFIG.RAYLEIGH}
        mieCoefficient={SKY_CONFIG.MIE_COEFFICIENT}
        mieDirectionalG={SKY_CONFIG.MIE_DIRECTIONAL_G}
        distance={SKY_CONFIG.DISTANCE}
        sunScale={SKY_CONFIG.SUN_SCALE}
      />

      {/* Configurar cámara inicial si no hay cámara activa */}
      <DefaultCameraSetup />

      {/* Física */}
      <Physics gravity={PHYSICS_CONFIG.GRAVITY}>
        {/* Terreno con colisión */}
        <Terrain />

        {/* NOTA: El Player por defecto ha sido eliminado.
            El usuario debe agregar una cámara activa desde el editor para controlar la vista.
            Si necesita un personaje con física, debe agregar un collider cilíndrico con una cámara activa. */}

        {/* Cargar nivel desde JSON */}
        <LevelLoader levelPath="/levels/level1.json" />
      </Physics>

      {/* Efectos post-procesamiento */}
      <EffectComposer>
        <Bloom intensity={POSTPROCESSING_CONFIG.BLOOM_INTENSITY} />
      </EffectComposer>
      </Canvas>
    </KeyboardControls>
  );
};

