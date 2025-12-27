import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, TransformControls, Grid } from '@react-three/drei';
import { Terrain } from '../game/Terrain';
import { SceneObject } from '../game/SceneObject';
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
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

        {/* Grid helper para visualización */}
        <Grid
          args={[100, 100]}
          cellColor="#444"
          sectionColor="#222"
          position={[0, 0.01, 0]}
        />

        {/* Terreno (sin física en editor, solo visualización) */}
        <Terrain hasPhysics={false} />

        {/* Componente para manejar raycasting global */}
        <RaycastHandler
          onSelectObject={onSelectObject}
          objects={objects}
          key={`raycast-${objects.length}`} // Forzar re-render cuando cambia el número de objetos
        />

        {/* Objetos del nivel (sin física en editor) */}
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
      </Canvas>
    </div>
  );
};

/**
 * Componente para manejar raycasting y selección de objetos
 * Optimizado para evitar bloqueos y mejorar rendimiento
 */
const RaycastHandler = ({ onSelectObject, objects }) => {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const isProcessing = useRef(false);

  // Memoizar objetos seleccionables para evitar traverse costoso
  // Usar un efecto para actualizar cuando cambian los objetos
  const selectableObjectsRef = useRef([]);
  
  useEffect(() => {
    // Usar un pequeño delay para asegurar que los objetos estén renderizados
    const timeoutId = setTimeout(() => {
      const objs = [];
      scene.traverse((obj) => {
        if ((obj.isMesh || obj.isGroup) && obj.userData?.objectId && obj.userData?.isSelectable) {
          objs.push(obj);
        }
      });
      selectableObjectsRef.current = objs;
    }, 50); // Pequeño delay para asegurar renderizado
    
    return () => clearTimeout(timeoutId);
  }, [scene, objects.length]); // Solo recalcular cuando cambia el número de objetos

  const handleClick = useCallback((event) => {
    // Evitar procesamiento simultáneo
    if (isProcessing.current) return;
    
    // Solo procesar clicks en el canvas
    if (event.target !== gl.domElement) return;
    
    // No procesar si se clickeó en un UI element
    const clickedElement = event.target.closest('.properties-panel, .object-library, .toolbar, .editor-controls, .level-selector');
    if (clickedElement) return;

    isProcessing.current = true;
    
    // Procesar inmediatamente sin requestAnimationFrame para mejor respuesta
    try {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      
      // Usar objetos memoizados en lugar de traverse completo
      const intersects = raycaster.current.intersectObjects(selectableObjectsRef.current, true);

      // Buscar si hay un objeto seleccionable - priorizar el más cercano
      if (intersects.length > 0) {
        // Ordenar por distancia (más cercano primero)
        intersects.sort((a, b) => a.distance - b.distance);
        
        for (const intersect of intersects) {
          let current = intersect.object;
          // Buscar en el objeto y sus padres
          while (current) {
            if (current.userData?.objectId && current.userData?.isSelectable) {
              onSelectObject(current.userData.objectId);
              isProcessing.current = false;
              return;
            }
            current = current.parent;
          }
        }
      }

      // Si no se clickeó ningún objeto, deseleccionar
      onSelectObject(null);
    } catch (error) {
      console.error('Error en raycasting:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [camera, gl, onSelectObject]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick, false); // Usar false en lugar de true para evitar captura
    return () => {
      canvas.removeEventListener('click', handleClick, false);
    };
  }, [gl, handleClick]);

  return null;
};

/**
 * Componente de objeto en el editor con capacidad de selección y transformación
 * Optimizado con mejores prácticas de Three.js y React Three Fiber
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

  // Estado de arrastre - usar ref para evitar re-renders
  const isDragging = useRef(false);
  const isTransforming = useRef(false);
  
  // Cache para valores anteriores para detectar cambios
  const lastPositionRef = useRef(new THREE.Vector3(...object.position));
  const lastRotationRef = useRef(new THREE.Euler(...object.rotation.map(deg => (deg * Math.PI) / 180)));
  const lastScaleRef = useRef(new THREE.Vector3(...object.scale));
  
  // Memoizar transformaciones para evitar cálculos innecesarios
  const rotationInRadians = useMemo(() => {
    return object.rotation.map((deg) => (deg * Math.PI) / 180);
  }, [object.rotation]);

  // Inicializar posición del grupo solo al montar
  useEffect(() => {
    if (groupRef.current) {
      // Deshabilitar actualización automática de matriz para mejor rendimiento
      groupRef.current.matrixAutoUpdate = true; // Mantener true para TransformControls
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(...rotationInRadians);
      groupRef.current.scale.set(...object.scale);
      groupRef.current.updateMatrixWorld();
      
      // Actualizar cache
      lastPositionRef.current.set(...object.position);
      lastRotationRef.current.set(...rotationInRadians);
      lastScaleRef.current.set(...object.scale);
    }
  }, []); // Solo al montar

  // Sincronizar cuando cambia el objeto externamente (pero no cuando se está arrastrando)
  // Usar useFrame para sincronización suave y eficiente
  useFrame(() => {
    if (!groupRef.current || isDragging.current || isTransforming.current) return;
    
    // Comparar con valores anteriores usando comparación directa (más eficiente que .equals())
    const posX = object.position[0];
    const posY = object.position[1];
    const posZ = object.position[2];
    const lastPos = lastPositionRef.current;
    
    const posChanged = 
      Math.abs(posX - lastPos.x) > 0.001 ||
      Math.abs(posY - lastPos.y) > 0.001 ||
      Math.abs(posZ - lastPos.z) > 0.001;
    
    if (posChanged) {
      groupRef.current.position.set(posX, posY, posZ);
      lastPos.set(posX, posY, posZ);
    }
    
    // Rotación
    const rotX = rotationInRadians[0];
    const rotY = rotationInRadians[1];
    const rotZ = rotationInRadians[2];
    const lastRot = lastRotationRef.current;
    
    const rotChanged = 
      Math.abs(rotX - lastRot.x) > 0.001 ||
      Math.abs(rotY - lastRot.y) > 0.001 ||
      Math.abs(rotZ - lastRot.z) > 0.001;
    
    if (rotChanged) {
      groupRef.current.rotation.set(rotX, rotY, rotZ);
      lastRot.set(rotX, rotY, rotZ);
    }
    
    // Escala
    const scaleX = object.scale[0];
    const scaleY = object.scale[1];
    const scaleZ = object.scale[2];
    const lastScale = lastScaleRef.current;
    
    const scaleChanged = 
      Math.abs(scaleX - lastScale.x) > 0.001 ||
      Math.abs(scaleY - lastScale.y) > 0.001 ||
      Math.abs(scaleZ - lastScale.z) > 0.001;
    
    if (scaleChanged) {
      groupRef.current.scale.set(scaleX, scaleY, scaleZ);
      lastScale.set(scaleX, scaleY, scaleZ);
    }
    
    // Solo actualizar matriz si hubo cambios
    if (posChanged || rotChanged || scaleChanged) {
      groupRef.current.updateMatrixWorld();
    }
  });

  // Función para aplicar snap a un valor (memoizada)
  const applySnap = useCallback((value) => {
    if (!snapEnabled) return value;
    return Math.round(value / snapSize) * snapSize;
  }, [snapEnabled, snapSize]);

  // Sistema de actualización diferida para estado - actualizar visualmente inmediatamente, estado después
  const pendingUpdateRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  // Función para aplicar snap y actualizar visualmente
  const applyTransformSnap = useCallback(() => {
    if (!groupRef.current) return;
    
    let position = groupRef.current.position;
    const rotation = groupRef.current.rotation;
    const scale = groupRef.current.scale;

    // Aplicar snap solo en modo translate
    if (snapEnabled && transformMode === 'translate') {
      const snappedX = applySnap(position.x);
      const snappedY = applySnap(position.y);
      const snappedZ = applySnap(position.z);
      groupRef.current.position.set(snappedX, snappedY, snappedZ);
      position = { x: snappedX, y: snappedY, z: snappedZ };
      groupRef.current.updateMatrixWorld();
    }

    // Preparar datos para actualización
    const rotationDegrees = [
      (rotation.x * 180) / Math.PI,
      (rotation.y * 180) / Math.PI,
      (rotation.z * 180) / Math.PI,
    ];

    const updateData = {
      position: [position.x, position.y, position.z],
      rotation: rotationDegrees,
      scale: [scale.x, scale.y, scale.z],
    };

    // Guardar para actualización diferida
    pendingUpdateRef.current = updateData;
    
    // Cancelar timeout anterior si existe
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Actualizar estado después de un pequeño delay (debounce)
    updateTimeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current) {
        onUpdate(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    }, 50); // 50ms de debounce para estado, pero visual inmediato
  }, [snapEnabled, transformMode, onUpdate, applySnap]);

  // Manejar cambios en TransformControls - solo actualizar visual, estado se actualiza diferido
  // NO llamar onUpdate aquí para evitar re-renders costosos
  const handleObjectChange = useCallback(() => {
    if (!groupRef.current || !isTransforming.current) return;
    
    // Aplicar transformación visual inmediatamente
    applyTransformSnap();
  }, [applyTransformSnap]);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    isTransforming.current = true;
    
    // Cancelar cualquier actualización pendiente
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }
  }, [orbitControlsRef]);

  const handleDragEnd = useCallback(() => {
    isTransforming.current = false;
    
    // Asegurar actualización final inmediata
    if (groupRef.current) {
      let position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      const scale = groupRef.current.scale;

      // Aplicar snap final si es necesario
      if (snapEnabled && transformMode === 'translate') {
        const snappedX = applySnap(position.x);
        const snappedY = applySnap(position.y);
        const snappedZ = applySnap(position.z);
        groupRef.current.position.set(snappedX, snappedY, snappedZ);
        position = { x: snappedX, y: snappedY, z: snappedZ };
        groupRef.current.updateMatrixWorld();
      }

      const rotationDegrees = [
        (rotation.x * 180) / Math.PI,
        (rotation.y * 180) / Math.PI,
        (rotation.z * 180) / Math.PI,
      ];

      // Actualizar estado inmediatamente al finalizar
      onUpdate({
        position: [position.x, position.y, position.z],
        rotation: rotationDegrees,
        scale: [scale.x, scale.y, scale.z],
      });
      
      // Actualizar cache
      lastPositionRef.current.set(position.x, position.y, position.z);
      lastRotationRef.current.set(rotation.x, rotation.y, rotation.z);
      lastScaleRef.current.set(scale.x, scale.y, scale.z);
    }
    
    // Limpiar timeout pendiente
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
    
    isDragging.current = false;
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }
  }, [orbitControlsRef, snapEnabled, transformMode, onUpdate, applySnap]);
  
  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Marcar el objeto con su ID para raycasting - hacerlo inmediatamente
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.objectId = object.id;
      groupRef.current.userData.isSelectable = true;
      // Marcar todos los hijos también
      groupRef.current.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.userData.objectId = object.id;
          child.userData.isSelectable = true;
          // Asegurar que los meshes sean raycastables
          if (child.isMesh) {
            child.raycast = child.raycast || THREE.Mesh.prototype.raycast;
          }
        }
      });
    }
  }, [object.id]);

  // Asegurar que el grupo esté listo antes de renderizar TransformControls
  const [groupReady, setGroupReady] = useState(false);
  
  useEffect(() => {
    if (groupRef.current) {
      setGroupReady(true);
    }
  }, []);

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          e.delta = 0; // Prevenir doble click
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

        {/* Highlight visual cuando está seleccionado - optimizado con useMemo */}
        {isSelected && (
          <mesh position={[0, 0, 0]} frustumCulled={false}>
            <boxGeometry args={[3, 3, 3]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.15}
              wireframe
              depthWrite={false} // Optimización: no escribir en depth buffer
            />
          </mesh>
        )}
      </group>

      {/* TransformControls - renderizar inmediatamente cuando está seleccionado y el grupo está listo */}
      {isSelected && groupReady && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={handleObjectChange}
          translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
          rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null} // Snap de 45 grados para rotación
          scaleSnap={snapEnabled && transformMode === 'scale' ? 0.1 : null} // Snap de 0.1 para escala
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          showX={true}
          showY={true}
          showZ={true}
          space="world" // Usar espacio mundial para mejor control
          size={1.2} // Tamaño ligeramente mayor para mejor visibilidad
        />
      )}
    </>
  );
};

