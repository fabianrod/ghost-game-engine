import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky, KeyboardControls } from '@react-three/drei';
import { Terrain } from './Terrain';
import { Player } from './Player';
import { LevelLoader } from './LevelLoader';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

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
        camera={{ position: [0, 1.65, 0], fov: 75 }}
        style={{ width: '100vw', height: '100vh' }}
      >
      {/* Iluminación - sincronizada con la posición del sol */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[30, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Cielo estilo GTA San Andreas */}
      <Sky
        sunPosition={[30, 80, 30]}
        inclination={0.75}
        azimuth={0.25}
        turbidity={3}
        rayleigh={0.5}
        mieCoefficient={0.003}
        mieDirectionalG={0.8}
        distance={10000000}
        sunScale={0.8}
      />

      {/* Física */}
      <Physics gravity={[0, -9.81, 0]}>
        {/* Terreno con colisión */}
        <Terrain />

        {/* Jugador - altura de 1.80m, posición inicial en Y=0.9 (centro del collider) */}
        <Player position={[0, 0.9, 0]} />

        {/* Cargar nivel desde JSON */}
        <LevelLoader levelPath="/levels/level1.json" />
      </Physics>

      {/* Efectos post-procesamiento */}
      <EffectComposer>
        <Bloom intensity={0.5} />
      </EffectComposer>
      </Canvas>
    </KeyboardControls>
  );
};

