import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky, KeyboardControls } from '@react-three/drei';
import { Terrain } from './Terrain';
import { Player } from './Player';
import { LevelLoader } from './LevelLoader';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import {
  PHYSICS_CONFIG,
  LIGHTING_CONFIG,
  SKY_CONFIG,
  CAMERA_CONFIG,
  POSTPROCESSING_CONFIG,
  PLAYER_CONFIG,
} from '../../constants/gameConstants';

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
        camera={{ position: CAMERA_CONFIG.GAME_POSITION, fov: CAMERA_CONFIG.GAME_FOV }}
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

      {/* Física */}
      <Physics gravity={PHYSICS_CONFIG.GRAVITY}>
        {/* Terreno con colisión */}
        <Terrain />

        {/* Jugador - altura de 1.80m, posición inicial en Y=0.9 (centro del collider) */}
        <Player position={[0, PLAYER_CONFIG.COLLIDER_CENTER_Y, 0]} />

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

