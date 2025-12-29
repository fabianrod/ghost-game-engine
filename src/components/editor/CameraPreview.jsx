import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Grid } from '@react-three/drei';
import { TerrainWithEditor } from '../terrain/TerrainWithEditor';
import { SceneObject } from '../game/SceneObject';
import { ColliderCylinder } from './ColliderCylinder';
import { CameraComponent } from '../game/CameraComponent';
import * as THREE from 'three';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import './CameraPreview.css';

/**
 * Componente que actualiza la cámara del preview usando la posición y rotación ACTUALES
 * de la cámara en el editor (no calcula desde el objetivo, usa la posición directa)
 */
const PreviewThirdPersonCamera = ({ cameraObj, objects, scene }) => {
  const { camera } = useThree();
  const targetRef = useRef(null);
  
  // Buscar el objetivo en la escena de Three.js para calcular hacia dónde mira
  useEffect(() => {
    if (!cameraObj.targetId) {
      targetRef.current = null;
      return;
    }
    
    const findTarget = () => {
      let found = null;
      scene.traverse((obj) => {
        if (obj.userData?.objectId === cameraObj.targetId) {
          if (obj.isGroup || obj.isMesh) {
            if (!found) found = obj;
          }
        }
      });
      targetRef.current = found;
    };
    
    findTarget();
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, [cameraObj.targetId, scene, objects]);
  
  useFrame(() => {
    if (!cameraObj) return;
    
    // Usar la posición ACTUAL de la cámara desde el editor
    const cameraPos = new THREE.Vector3(
      cameraObj.position[0] || 0,
      cameraObj.position[1] || 0,
      cameraObj.position[2] || 0
    );
    
    // Calcular hacia dónde debe mirar la cámara
    let lookAtPos = new THREE.Vector3();
    
    if (cameraObj.targetId && targetRef.current) {
      // Si hay objetivo, mirar hacia el objetivo
      const targetObj = objects.find(obj => obj.id === cameraObj.targetId);
      if (targetObj) {
        lookAtPos.set(
          targetObj.position[0] || 0,
          targetObj.position[1] || 0,
          targetObj.position[2] || 0
        );
      } else if (targetRef.current.isObject3D) {
        targetRef.current.updateMatrixWorld(true);
        targetRef.current.getWorldPosition(lookAtPos);
      }
    } else {
      // Si no hay objetivo, usar la rotación de la cámara para calcular la dirección
      const rotation = cameraObj.rotation || [0, 0, 0];
      const rotationRad = rotation.map(r => r * Math.PI / 180);
      
      // Calcular dirección hacia adelante basada en la rotación
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyEuler(new THREE.Euler(rotationRad[0], rotationRad[1], rotationRad[2], 'YXZ'));
      lookAtPos = cameraPos.clone().add(direction);
    }
    
    // Actualizar posición y rotación de la cámara del preview
    camera.position.copy(cameraPos);
    camera.lookAt(lookAtPos);
    camera.fov = cameraObj.fov || 75;
    camera.near = cameraObj.near || 0.1;
    camera.far = cameraObj.far || 1000;
    camera.updateProjectionMatrix();
  });
  
  return null;
};

/**
 * Componente que renderiza la escena del EDITOR para el preview
 * Muestra la misma escena del editor pero desde la perspectiva de la cámara de tercera persona
 */
const PreviewEditorScene = ({ objects, terrainHeightmap, selectedObject, cameraObj }) => {
  const { scene } = useThree();
  
  return (
    <>
      {/* Iluminación del editor */}
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

      {/* Cielo del editor */}
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

      {/* Grid helper del editor */}
      <Grid
        args={[100, 100]}
        cellColor="#444"
        sectionColor="#222"
        position={[0, 0, 0]}
      />

      {/* Actualizar cámara del preview en tiempo real */}
      {cameraObj && cameraObj.targetId && (
        <PreviewThirdPersonCamera
          cameraObj={cameraObj}
          objects={objects}
          scene={scene}
        />
      )}

      {/* Terreno del editor (sin física) */}
      <TerrainWithEditor
        hasPhysics={false}
        heightmap={terrainHeightmap}
        onHeightmapChange={null}
        showEditor={false}
        paintSettings={null}
      />

      {/* Renderizar objetos del editor (igual que en EditorCanvas) */}
      {objects.map((obj) => {
        // Si es una cámara, renderizar como componente de cámara (con gizmo)
        if (obj.type === 'camera') {
          return (
            <CameraComponent
              key={`preview-editor-camera-${obj.id}`}
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
              active={false} // No activar en el preview
              showGizmo={true} // Mostrar gizmo en el preview
              isEditor={true}
            />
          );
        }

        // Si es un collider, renderizar visualización simple
        if (obj.type === 'collider') {
          const dimensions = obj.scale || [1, 1, 1];
          const safeDimensions = dimensions.map(d => Math.max(0.1, d));
          const isSelected = selectedObject === obj.id;
          
          if (obj.colliderType === 'box') {
            return (
              <group key={`preview-collider-${obj.id}`} position={obj.position} rotation={obj.rotation.map(r => r * Math.PI / 180)}>
                <mesh>
                  <boxGeometry args={safeDimensions} />
                  <meshBasicMaterial
                    color="#00aaff"
                    transparent
                    opacity={isSelected ? 0.4 : 0.3}
                    wireframe
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          } else if (obj.colliderType === 'sphere') {
            const radius = (safeDimensions[0] + safeDimensions[1] + safeDimensions[2]) / 6;
            return (
              <group key={`preview-collider-${obj.id}`} position={obj.position} rotation={obj.rotation.map(r => r * Math.PI / 180)}>
                <mesh>
                  <sphereGeometry args={[radius, 32, 32]} />
                  <meshBasicMaterial
                    color="#00aaff"
                    transparent
                    opacity={isSelected ? 0.4 : 0.3}
                    wireframe
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          } else if (obj.colliderType === 'cylinder') {
            return (
              <ColliderCylinder
                key={`preview-collider-${obj.id}`}
                position={obj.position}
                scale={safeDimensions}
                rotation={obj.rotation}
                isSelected={isSelected}
                color="#00aaff"
              />
            );
          }
          return null;
        }
        
        // Si es un objeto normal, renderizar SceneObject
        if (!obj.model || obj.model.trim() === '') {
          return null;
        }
        
        return (
          <SceneObject
            key={`preview-editor-${obj.id}`}
            objectId={obj.id}
            model={obj.model}
            position={obj.position}
            scale={obj.scale || [1, 1, 1]}
            rotation={obj.rotation || [0, 0, 0]}
            castShadow={obj.castShadow !== false}
            receiveShadow={obj.receiveShadow !== false}
            hasCollider={false} // Sin física en el preview del editor
            colliderScale={obj.colliderScale || [0.8, 0.8, 0.8]}
            components={obj.components || []}
            componentProps={obj.componentProps || {}}
          />
        );
      })}
    </>
  );
};

/**
 * Componente de preview de cámara que muestra la vista del jugador en tiempo real
 * Solo se muestra si hay una cámara de tercera persona activa
 */
export const CameraPreview = ({ objects, terrainHeightmap, selectedObject }) => {
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
        <Canvas
          shadows
          camera={{ position: [0, 5, 5], fov: 75 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
        >
          <PreviewEditorScene
            objects={objects}
            terrainHeightmap={terrainHeightmap}
            selectedObject={selectedObject}
            cameraObj={objects.find(
              (obj) => obj.type === 'camera' && obj.mode === 'thirdPerson' && obj.active === true
            )}
          />
        </Canvas>
      </div>
    </div>
  );
};

