import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, TransformControls, Grid } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Terrain } from '../game/Terrain';
import { SceneObject } from '../game/SceneObject';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import './EditorCanvas.css';

/**
 * Canvas 3D del editor con controles orbitales
 * Permite visualizar y editar objetos del nivel
 */
export const EditorCanvas = ({
  objects,
  selectedObject,
  onSelectObject,
  onUpdateObject,
  transformMode = 'translate',
  snapEnabled = true,
  snapSize = 1,
}) => {
  const orbitControlsRef = useRef();

  return (
    <div className="editor-canvas">
      <Canvas
        shadows
        camera={{ position: [20, 15, 20], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Iluminación */}
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

        {/* Cielo */}
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

        {/* Controles orbitales para navegar en el editor */}
        <OrbitControls
          ref={orbitControlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
        />

        {/* Componente para manejar raycasting global */}
        <RaycastHandler
          onSelectObject={onSelectObject}
          objects={objects}
        />

        {/* Grid helper para visualización */}
        <Grid
          args={[100, 100]}
          cellColor="#444"
          sectionColor="#222"
          position={[0, 0.01, 0]}
        />

        {/* Física (solo para visualización en editor) */}
        <Physics gravity={[0, -9.81, 0]}>
          {/* Terreno */}
          <Terrain />

          {/* Objetos del nivel */}
          {objects.map((obj) => (
            <EditorSceneObject
              key={obj.id}
              object={obj}
              isSelected={selectedObject === obj.id}
              onSelect={() => onSelectObject(obj.id)}
              onUpdate={(updates) => onUpdateObject(obj.id, updates)}
              orbitControlsRef={orbitControlsRef}
              transformMode={transformMode}
              snapEnabled={snapEnabled}
              snapSize={snapSize}
            />
          ))}
        </Physics>
      </Canvas>
    </div>
  );
};

/**
 * Componente para manejar raycasting y selección de objetos
 */
const RaycastHandler = ({ onSelectObject }) => {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    const handleClick = (event) => {
      // Solo procesar clicks en el canvas y si no se clickeó en un UI element
      if (event.target === gl.domElement && !event.target.closest('.properties-panel, .object-library, .toolbar')) {
        event.preventDefault();
        event.stopPropagation();
        
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.current.setFromCamera(mouse.current, camera);
        
        // Buscar en todos los objetos de la escena, incluyendo grupos
        const allObjects = [];
        scene.traverse((obj) => {
          if (obj.isMesh || obj.isGroup) {
            allObjects.push(obj);
          }
        });
        
        const intersects = raycaster.current.intersectObjects(allObjects, true);

        // Buscar si hay un objeto seleccionable
        for (const intersect of intersects) {
          // Buscar en el objeto y sus padres
          let current = intersect.object;
          while (current) {
            if (current.userData && current.userData.objectId) {
              onSelectObject(current.userData.objectId);
              return;
            }
            current = current.parent;
          }
        }

        // Si no se clickeó ningún objeto, deseleccionar
        onSelectObject(null);
      }
    };

    gl.domElement.addEventListener('click', handleClick, true);
    return () => {
      gl.domElement.removeEventListener('click', handleClick, true);
    };
  }, [camera, scene, gl, onSelectObject]);

  return null;
};

/**
 * Componente de objeto en el editor con capacidad de selección y transformación
 */
const EditorSceneObject = ({
  object,
  isSelected,
  onSelect,
  onUpdate,
  orbitControlsRef,
  transformMode = 'translate',
  snapEnabled = true,
  snapSize = 1,
}) => {
  const groupRef = useRef();
  const transformRef = useRef();

  // Sincronizar posición inicial del grupo con el objeto
  // Solo sincronizar si no está siendo arrastrado
  const isDragging = useRef(false);
  
  // Inicializar posición del grupo
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(
        ...object.rotation.map((deg) => (deg * Math.PI) / 180)
      );
      groupRef.current.scale.set(...object.scale);
    }
  }, []); // Solo al montar

  // Sincronizar cuando cambia el objeto (pero no cuando se está arrastrando)
  useEffect(() => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(
        ...object.rotation.map((deg) => (deg * Math.PI) / 180)
      );
      groupRef.current.scale.set(...object.scale);
    }
  }, [object.position, object.rotation, object.scale]);

  // Función para aplicar snap a un valor
  const applySnap = (value) => {
    if (!snapEnabled) return value;
    return Math.round(value / snapSize) * snapSize;
  };

  // Manejar cambios en TransformControls
  const handleObjectChange = () => {
    if (groupRef.current) {
      isDragging.current = true;
      let position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      const scale = groupRef.current.scale;

      // Aplicar snap a la posición si está habilitado y estamos en modo translate
      if (snapEnabled && transformMode === 'translate') {
        position = {
          x: applySnap(position.x),
          y: applySnap(position.y),
          z: applySnap(position.z),
        };
        // Actualizar posición del grupo para feedback visual inmediato
        groupRef.current.position.set(position.x, position.y, position.z);
      }

      // Convertir rotación de radianes a grados
      const rotationDegrees = [
        (rotation.x * 180) / Math.PI,
        (rotation.y * 180) / Math.PI,
        (rotation.z * 180) / Math.PI,
      ];

      onUpdate({
        position: [position.x, position.y, position.z],
        rotation: rotationDegrees,
        scale: [scale.x, scale.y, scale.z],
      });
    }
  };

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  // Marcar el objeto con su ID para raycasting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.objectId = object.id;
      groupRef.current.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.userData.objectId = object.id;
        }
      });
    }
  }, [object.id]);

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!isSelected) {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          if (!isSelected) {
            document.body.style.cursor = 'default';
          }
        }}
      >
        {/* Objeto 3D - sin ajuste automático de Y en el editor */}
        <SceneObject
          model={object.model}
          position={[0, 0, 0]}
          scale={[1, 1, 1]}
          rotation={[0, 0, 0]}
          castShadow={object.castShadow}
          receiveShadow={object.receiveShadow}
          hasCollider={false}
          autoAdjustY={false}
        />

        {/* Highlight visual cuando está seleccionado */}
        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3, 3, 3]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.15}
              wireframe
            />
          </mesh>
        )}
      </group>

      {/* TransformControls fuera del grupo para evitar conflictos */}
      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={handleObjectChange}
          translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
          rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null} // Snap de 45 grados para rotación
          scaleSnap={snapEnabled && transformMode === 'scale' ? 0.1 : null} // Snap de 0.1 para escala
          onMouseDown={(e) => {
            handleDragStart();
            // Deshabilitar OrbitControls cuando se usa TransformControls
            if (orbitControlsRef.current) {
              orbitControlsRef.current.enabled = false;
            }
          }}
          onMouseUp={(e) => {
            handleDragEnd();
            // Rehabilitar OrbitControls cuando se suelta TransformControls
            if (orbitControlsRef.current) {
              orbitControlsRef.current.enabled = true;
            }
          }}
        />
      )}
    </>
  );
};

