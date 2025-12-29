import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky, KeyboardControls } from '@react-three/drei';
import { TerrainWithEditor } from '../terrain/TerrainWithEditor';
import { SceneObject } from '../game/SceneObject';
import { ColliderObject } from '../game/ColliderObject';
import { CameraComponent } from '../game/CameraComponent';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import {
  PHYSICS_CONFIG,
  LIGHTING_CONFIG,
  SKY_CONFIG,
  POSTPROCESSING_CONFIG,
} from '../../constants/gameConstants';
import './CameraPreview.css';

/**
 * Mapa de controles de teclado para el preview
 * (aunque no se usen, necesarios para que useKeyboardControls funcione)
 */
const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
];

/**
 * Componente que renderiza la escena completa para el preview
 * Similar a GameScene pero sin controles de teclado
 */
const PreviewScene = ({ objects, terrainHeightmap }) => {
  return (
    <>
      {/* Iluminación */}
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

      {/* Cielo */}
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
        {/* Terreno */}
        <TerrainWithEditor
          hasPhysics={true}
          heightmap={terrainHeightmap}
          onHeightmapChange={null}
          showEditor={false}
          paintSettings={null}
        />

        {/* Renderizar objetos del nivel */}
        {objects.map((obj) => {
          // Si es una cámara, renderizar CameraComponent
          if (obj.type === 'camera') {
            // Solo activar si es tercera persona y está marcada como activa
            const isThirdPerson = obj.mode === 'thirdPerson';
            const shouldBeActive = obj.active && isThirdPerson;
            
            return (
              <CameraComponent
                key={`preview-camera-${obj.id}`}
                position={obj.position || [0, 0, 0]}
                rotation={obj.rotation || [0, 0, 0]}
                fov={obj.fov || 75}
                near={obj.near || 0.1}
                far={obj.far || 1000}
                mode={obj.mode || 'firstPerson'}
                height={obj.height || 1.65}
                distance={obj.distance || 5}
                offset={obj.offset || [0, 0, 0]}
                targetId={obj.targetId || null}
                active={shouldBeActive} // Activar solo si es tercera persona y está activa
                showGizmo={false}
                isEditor={false} // No es editor, es preview del juego
              />
            );
          }

          // Si es un collider, renderizar ColliderObject
          if (obj.type === 'collider') {
            return (
              <ColliderObject
                key={`preview-collider-${obj.id}`}
                objectId={obj.id}
                colliderType={obj.colliderType || 'box'}
                position={obj.position || [0, 0, 0]}
                scale={obj.scale || [1, 1, 1]}
                rotation={obj.rotation || [0, 0, 0]}
                isTrigger={obj.isTrigger || false}
                isSensor={obj.isSensor || false}
                physicsMaterial={obj.physicsMaterial || {}}
                visibleInGame={obj.visibleInGame || false}
                components={obj.components || []}
                componentProps={obj.componentProps || {}}
              />
            );
          }

          // Si es un objeto normal, renderizar SceneObject
          if (!obj.model) {
            return null;
          }

          return (
            <SceneObject
              key={`preview-${obj.id}`}
              objectId={obj.id}
              model={obj.model}
              position={obj.position}
              scale={obj.scale || [1, 1, 1]}
              rotation={obj.rotation || [0, 0, 0]}
              castShadow={obj.castShadow !== false}
              receiveShadow={obj.receiveShadow !== false}
              hasCollider={obj.hasCollider !== false}
              colliderScale={obj.colliderScale || [0.8, 0.8, 0.8]}
              components={obj.components || []}
              componentProps={obj.componentProps || {}}
            />
          );
        })}
      </Physics>

      {/* Efectos post-procesamiento */}
      <EffectComposer>
        <Bloom intensity={POSTPROCESSING_CONFIG.BLOOM_INTENSITY} />
      </EffectComposer>
    </>
  );
};

/**
 * Componente de preview de cámara que muestra la vista del jugador en tiempo real
 * Solo se muestra si hay una cámara de tercera persona activa
 */
export const CameraPreview = ({ objects, terrainHeightmap }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasActiveThirdPersonCamera, setHasActiveThirdPersonCamera] = useState(false);
  const [position, setPosition] = useState(null); // null = usar posición inicial por defecto
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Verificar si hay una cámara de tercera persona activa
  useEffect(() => {
    const checkForActiveCamera = () => {
      const activeCamera = objects.find(
        (obj) =>
          obj.type === 'camera' &&
          obj.mode === 'thirdPerson' &&
          obj.active === true
      );
      
      const hasActive = !!activeCamera;
      setHasActiveThirdPersonCamera(hasActive);
      setIsVisible(hasActive);
    };

    checkForActiveCamera();
  }, [objects]);

  // Manejar inicio del arrastre
  const handleMouseDown = (e) => {
    // Solo arrastrar si se hace clic en el header
    if (e.target.closest('.camera-preview-header') && !e.target.closest('.camera-preview-close')) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      const parentRect = containerRef.current.parentElement.getBoundingClientRect();
      
      // Calcular offset relativo al contenedor padre
      setDragOffset({
        x: e.clientX - parentRect.left - (rect.left - parentRect.left),
        y: e.clientY - parentRect.top - (rect.top - parentRect.top),
      });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Manejar movimiento durante el arrastre
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const parentRect = containerRef.current.parentElement.getBoundingClientRect();
      const newX = e.clientX - parentRect.left - dragOffset.x;
      const newY = e.clientY - parentRect.top - dragOffset.y;

      // Limitar dentro de los bounds del contenedor padre
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      const parentWidth = parentRect.width;
      const parentHeight = parentRect.height;

      const clampedX = Math.max(0, Math.min(newX, parentWidth - containerWidth));
      const clampedY = Math.max(0, Math.min(newY, parentHeight - containerHeight));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Si no hay cámara activa, no mostrar el preview
  if (!isVisible || !hasActiveThirdPersonCamera) {
    return null;
  }

  // Calcular estilos de posición
  const positionStyle = position && position.x !== null && position.y !== null
    ? {
        right: 'auto',
        bottom: 'auto',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : {
        right: '16px',
        bottom: '16px',
        left: 'auto',
        top: 'auto',
      };

  return (
    <div
      ref={containerRef}
      className="camera-preview-container"
      style={{
        ...positionStyle,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={`camera-preview-header ${isDragging ? 'dragging' : ''}`}>
        <span className="camera-preview-title">Vista del Jugador</span>
        <button
          className="camera-preview-close"
          onClick={() => setIsVisible(false)}
          title="Cerrar preview"
        >
          ×
        </button>
      </div>
      <div className="camera-preview-canvas-wrapper">
        <KeyboardControls map={keyboardMap}>
          <Canvas
            shadows
            camera={{ position: [0, 5, 5], fov: 75 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, alpha: false }}
          >
            <PreviewScene objects={objects} terrainHeightmap={terrainHeightmap} />
          </Canvas>
        </KeyboardControls>
      </div>
    </div>
  );
};

