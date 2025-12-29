import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, TransformControls, Grid, useGLTF } from '@react-three/drei';
import { TerrainWithEditor } from '../terrain/TerrainWithEditor';
import { SceneObject } from '../game/SceneObject';
import { ColliderCylinder } from './ColliderCylinder';
import { CameraComponent } from '../game/CameraComponent';
import { CameraPreview } from './CameraPreview';
import { useRef, useEffect, useCallback, useMemo, useState, memo } from 'react';
import * as THREE from 'three';
import { calculateCylinderCollider } from '../../utils/colliderUtils';
import { getTerrainHeightAtWorldPosition } from '../../utils/heightmapUtils';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import './EditorCanvas.css';

/**
 * Componente que renderiza una línea visual conectando una cámara con su objetivo
 */
const CameraTargetLine = ({ cameraPosition, targetPosition, isSelected }) => {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...cameraPosition);
    const end = new THREE.Vector3(...targetPosition);
    return [start, end];
  }, [cameraPosition, targetPosition]);
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array([
      points[0].x, points[0].y, points[0].z,
      points[1].x, points[1].y, points[1].z
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [points]);
  
  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={isSelected ? "#00ff00" : "#00aaff"}
        linewidth={2}
        transparent
        opacity={isSelected ? 0.8 : 0.5}
      />
    </line>
  );
};

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
  terrainHeightmap = null,
  onTerrainHeightmapChange = null,
  showTerrainEditor = false,
  terrainPaintSettings = null,
}) => {
  const orbitControlsRef = useRef();
  const transformingObjectIdRef = useRef(null);
  // Ref compartido para rastrear el tiempo exacto de la última transformación
  const lastTransformEndTimeRef = useRef(0);

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
          position={[0, 0, 0]}
        />

        {/* Terreno (sin física en editor, solo visualización) */}
        <TerrainWithEditor
          hasPhysics={false}
          heightmap={terrainHeightmap}
          onHeightmapChange={onTerrainHeightmapChange}
          showEditor={showTerrainEditor}
          paintSettings={terrainPaintSettings}
        />

        {/* Componente para manejar raycasting global */}
        <RaycastHandler
          onSelectObject={onSelectObject}
          objects={objects}
          selectedObject={selectedObject}
          key={`raycast-${objects.length}`} // Forzar re-render cuando cambia el número de objetos
          transformingObjectIdRef={transformingObjectIdRef}
          lastTransformEndTimeRef={lastTransformEndTimeRef}
        />

        {/* Líneas visuales conectando cámaras con sus objetivos */}
        {objects
          .filter(obj => obj.type === 'camera' && obj.mode === 'thirdPerson' && obj.targetId)
          .map(cameraObj => {
            const targetObj = objects.find(o => o.id === cameraObj.targetId);
            if (!targetObj) return null;
            
            return (
              <CameraTargetLine
                key={`camera-line-${cameraObj.id}`}
                cameraPosition={cameraObj.position}
                targetPosition={targetObj.position}
                isSelected={selectedObject === cameraObj.id || selectedObject === targetObj.id}
              />
            );
          })}

        {/* Objetos del nivel (sin física en editor) */}
        {objects.map((obj) => {
          // Si es una cámara, renderizar como componente de cámara
          if (obj.type === 'camera') {
            return (
              <EditorCameraObject
                key={obj.id}
                object={obj}
                isSelected={selectedObject === obj.id}
                onSelect={() => onSelectObject(obj.id)}
                onUpdate={(updates) => onUpdateObject(obj.id, updates)}
                orbitControlsRef={orbitControlsRef}
                transformMode={transformMode}
                snapEnabled={snapEnabled}
                snapSize={snapSize}
                transformingObjectIdRef={transformingObjectIdRef}
                lastTransformEndTimeRef={lastTransformEndTimeRef}
              />
            );
          }

          // Si es un collider, renderizar como collider visual
          if (obj.type === 'collider') {
            return (
              <EditorColliderObject
                key={obj.id}
                object={obj}
                isSelected={selectedObject === obj.id}
                onSelect={() => onSelectObject(obj.id)}
                onUpdate={(updates) => onUpdateObject(obj.id, updates)}
                orbitControlsRef={orbitControlsRef}
                transformMode={transformMode}
                snapEnabled={snapEnabled}
                snapSize={snapSize}
                transformingObjectIdRef={transformingObjectIdRef}
                lastTransformEndTimeRef={lastTransformEndTimeRef}
                terrainHeightmap={terrainHeightmap}
              />
            );
          }
          
          // Si es un objeto normal, verificar que tenga un modelo válido
          if (!obj.model || obj.model.trim() === '') {
            return null;
          }
          
          return (
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
              transformingObjectIdRef={transformingObjectIdRef}
              lastTransformEndTimeRef={lastTransformEndTimeRef}
              terrainHeightmap={terrainHeightmap}
            />
          );
        })}
      </Canvas>
      {/* Preview de cámara del jugador */}
      <CameraPreview
        objects={objects}
        terrainHeightmap={terrainHeightmap}
        selectedObject={selectedObject}
      />
    </div>
  );
};

/**
 * Componente para manejar raycasting y selección de objetos
 * Optimizado para evitar bloqueos y mejorar rendimiento
 */
const RaycastHandler = ({ onSelectObject, objects, selectedObject, transformingObjectIdRef, lastTransformEndTimeRef }) => {
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

  // Ref para rastrear si hay un arrastre activo (para evitar deselección durante arrastre)
  const isDraggingRef = useRef(false);
  const mouseDownTimeRef = useRef(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const lastDragEndTimeRef = useRef(0); // Tiempo del último arrastre terminado
  const wasTransformingRef = useRef(false); // Flag para saber si se estaba transformando
  // transformingObjectIdRef viene como prop del componente padre
  
  // Detectar arrastre real (movimiento del mouse mientras se mantiene presionado)
  useEffect(() => {
    const handleMouseDown = (event) => {
      mouseDownTimeRef.current = Date.now();
      mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
      isDraggingRef.current = false; // Resetear al inicio
    };
    
    const handleMouseMove = (event) => {
      // Si el mouse se mueve más de 5 píxeles, considerarlo un arrastre
      if (mouseDownTimeRef.current > 0) {
        const dx = Math.abs(event.clientX - mouseDownPosRef.current.x);
        const dy = Math.abs(event.clientY - mouseDownPosRef.current.y);
        if (dx > 5 || dy > 5) {
          isDraggingRef.current = true;
        }
      }
    };
    
    const handleMouseUp = () => {
      // Solo mantener el flag activo si realmente hubo arrastre
      if (isDraggingRef.current) {
        // Guardar el tiempo del final del arrastre
        lastDragEndTimeRef.current = Date.now();
        wasTransformingRef.current = true; // Marcar que se estaba transformando
        
        // Si hay un objeto siendo transformado, NO limpiar transformingObjectIdRef aquí
        // Dejarlo que EditorSceneObject lo maneje
        const transformingId = transformingObjectIdRef.current;
        
        // Mantener el flag activo por más tiempo para evitar deselección
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 1000); // Aumentado a 1 segundo
        
        // Resetear el flag de transformación después de más tiempo
        // PERO solo si EditorSceneObject no lo está usando
        setTimeout(() => {
          wasTransformingRef.current = false;
          // Solo limpiar si EditorSceneObject no lo ha cambiado (no está transformando)
          // Si EditorSceneObject está manejando la transformación, no tocar el ref
          if (transformingObjectIdRef.current === transformingId && transformingId !== null) {
            // Esperar un poco más antes de limpiar, para dar tiempo a EditorSceneObject
            setTimeout(() => {
              // Verificar una vez más antes de limpiar
              if (transformingObjectIdRef.current === transformingId) {
                transformingObjectIdRef.current = null;
              }
            }, 500);
          }
        }, 2000); // 2 segundos de protección después de transformar
      } else {
        // Si no hubo arrastre, resetear inmediatamente
        // PERO solo si no hay un objeto siendo transformado por EditorSceneObject
        if (transformingObjectIdRef.current === null) {
          isDraggingRef.current = false;
          wasTransformingRef.current = false;
        }
      }
      mouseDownTimeRef.current = 0;
    };
    
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl]);
  
  const handleClick = useCallback((event) => {
    // Evitar procesamiento simultáneo
    if (isProcessing.current) return;
    
    // Solo procesar clicks en el canvas
    if (event.target !== gl.domElement) return;
    
    // No procesar si se clickeó en un UI element
    const clickedElement = event.target.closest('.properties-panel, .object-library, .toolbar, .editor-controls, .level-selector');
    if (clickedElement) return;
    
    // Si hubo un arrastre real, no procesar el click (para evitar deselección)
    if (isDraggingRef.current) {
      return;
    }

    // Si el click ocurre muy poco tiempo después de terminar un arrastre, ignorarlo completamente
    // Esto evita que el click del mouseUp deseleccione el objeto
    const timeSinceLastDrag = Date.now() - lastDragEndTimeRef.current;
    const timeSinceLastTransform = lastTransformEndTimeRef ? Date.now() - lastTransformEndTimeRef.current : Infinity;
    
      // Si hay un objeto seleccionado, ser MUY agresivo en prevenir la deselección
      if (selectedObject) {
        // NUNCA deseleccionar si el objeto seleccionado es el que se estaba transformando
        if (transformingObjectIdRef.current === selectedObject) {
          return; // Ignorar completamente el click
        }
        
        // NUNCA deseleccionar si se acaba de terminar una transformación (menos de 3 segundos)
        if (timeSinceLastTransform < 3000) {
          return;
        }
        
        // Si se estaba transformando recientemente (menos de 2 segundos), ignorar el click
        if (wasTransformingRef.current && timeSinceLastDrag < 2000) {
          return;
        }
      }
    
    // Si no hay objeto seleccionado o pasó suficiente tiempo, procesar normalmente
    // Pero solo si no se estaba transformando recientemente
    if (timeSinceLastDrag < 500 || wasTransformingRef.current || timeSinceLastTransform < 3000) {
      return;
    }

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

      // SOLUCIÓN SIMPLE: Solo deseleccionar si:
      // 1. NO hay un objeto seleccionado (click en espacio vacío sin selección previa), O
      // 2. Se hizo click explícito en espacio vacío Y pasó suficiente tiempo desde la última transformación (más de 1 segundo)
      // NUNCA deseleccionar automáticamente durante o después de una transformación
      const isCurrentlyTransforming = transformingObjectIdRef.current === selectedObject;
      const recentlyTransformed = timeSinceLastTransform < 1000 || isCurrentlyTransforming || wasTransformingRef.current;
      
      // Solo deseleccionar si es un click explícito en espacio vacío Y no se acaba de transformar
      if (!selectedObject) {
        // No hay objeto seleccionado, no hacer nada (ya está deseleccionado)
        return;
      }
      
      // Hay un objeto seleccionado - solo deseleccionar si:
      // - Es un click explícito en espacio vacío (no se clickeó ningún objeto)
      // - Y NO se acaba de transformar
      if (intersects.length === 0 && !recentlyTransformed && timeSinceLastDrag >= 1000) {
        onSelectObject(null);
      }
    } catch (error) {
    } finally {
      isProcessing.current = false;
    }
  }, [camera, gl, onSelectObject, selectedObject, transformingObjectIdRef, lastTransformEndTimeRef]);

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
 * Componente para interceptar clicks en TransformControls y prevenir deselección
 */
const TransformControlsClickInterceptor = ({ transformRef, objectId, isTransforming, lastTransformEndTimeRef, transformingObjectIdRef }) => {
  const { gl } = useThree();
  
  useEffect(() => {
    if (!transformRef.current) return;
    
    const handleClick = (event) => {
      // Si se acaba de terminar una transformación, prevenir el click
      const timeSinceLastTransform = lastTransformEndTimeRef ? Date.now() - lastTransformEndTimeRef.current : Infinity;
      
      if (timeSinceLastTransform < 3000 || isTransforming.current || transformingObjectIdRef.current === objectId) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };
    
    const canvas = gl.domElement;
    // Usar capture phase para interceptar antes que otros listeners
    canvas.addEventListener('click', handleClick, true);
    
    return () => {
      canvas.removeEventListener('click', handleClick, true);
    };
  }, [gl, transformRef, objectId, isTransforming, lastTransformEndTimeRef, transformingObjectIdRef]);
  
  return null;
};

/**
 * Componente de objeto en el editor con capacidad de selección y transformación
 * Optimizado con mejores prácticas de Three.js y React Three Fiber
 * Memoizado para evitar re-renders innecesarios
 */
const EditorSceneObject = memo(({
  object,
  isSelected,
  onSelect,
  onUpdate,
  orbitControlsRef,
  transformMode = 'translate',
  snapEnabled = true,
  snapSize = 1,
  transformingObjectIdRef,
  lastTransformEndTimeRef,
  terrainHeightmap = null,
}) => {
  const groupRef = useRef();
  const transformRef = useRef();

  // Estado de arrastre - usar ref para evitar re-renders
  const isDragging = useRef(false);
  const isTransforming = useRef(false);
  const isDraggingY = useRef(false); // Track si el usuario está arrastrando específicamente en Y
  
  // Cache para valores anteriores para detectar cambios
  const lastPositionRef = useRef(new THREE.Vector3(...object.position));
  const lastRotationRef = useRef(new THREE.Euler(...object.rotation.map(deg => (deg * Math.PI) / 180)));
  const lastScaleRef = useRef(new THREE.Vector3(...object.scale));
  
  // Cache del bounding box del objeto para snap to ground
  const boundingBoxRef = useRef(null);
  const minYOffsetRef = useRef(0);
  const offsetCalculatedRef = useRef(false);
  
  // Validar que object.model existe antes de cargar
  const hasValidModel = object.model && typeof object.model === 'string' && object.model.trim() !== '';
  
  // Si no hay modelo válido, no renderizar este componente
  if (!hasValidModel) {
    return null;
  }
  
  // Cargar el modelo UNA SOLA VEZ para calcular el bounding box original (sin transformaciones)
  const { scene: modelScene } = useGLTF(object.model);
  const clonedModelScene = useMemo(() => {
    if (modelScene) {
      try {
        return modelScene.clone();
      } catch (error) {
        return null;
      }
    }
    return null;
  }, [modelScene]);
  
  // Calcular bounding box del modelo ORIGINAL (sin transformaciones) UNA SOLA VEZ
  // Usar useMemo para calcular el offset basado en el modelo original
  const modelBoundingBox = useMemo(() => {
    if (!clonedModelScene) return null;
    try {
      // Calcular bounding box del modelo original (sin transformaciones)
      const box = new THREE.Box3().setFromObject(clonedModelScene);
      return box;
    } catch (error) {
      return null;
    }
  }, [clonedModelScene]);

  const modelOffset = useMemo(() => {
    if (!modelBoundingBox) return 0;
    const minY = modelBoundingBox.min.y;
    // Calcular el offset Y necesario para que el objeto esté sobre el terreno (Y=0)
    // IMPORTANTE: Este offset debe ser EXACTAMENTE igual al que se usa en SceneObject
    // En SceneObject: adjustedPosition[1] = position[1] - minY * scale[1]
    // En el editor: visualY = position[1] + offset, donde offset = -minY * scale[1]
    // Por lo tanto: visualY = position[1] - minY * scale[1] (igual que en el juego)
    const offset = -minY * object.scale[1];
    return offset;
  }, [modelBoundingBox, object.scale]); // Solo recalcular cuando cambia el modelo o escala

  // Actualizar el ref cuando cambia el offset calculado
  useEffect(() => {
    minYOffsetRef.current = modelOffset;
    offsetCalculatedRef.current = modelOffset !== 0;
    // Resetear flag de posición inicial cuando cambia el modelo
    if (object.model) {
      hasAdjustedInitialPosition.current = false;
    }
  }, [modelOffset, object.model]);
  
  // Función para obtener la altura del terreno en una posición X, Z
  const getTerrainHeight = useCallback((x, z) => {
    if (!terrainHeightmap || terrainHeightmap.length === 0) {
      return 0; // Sin heightmap, terreno plano
    }
    return getTerrainHeightAtWorldPosition(
      terrainHeightmap,
      TERRAIN_CONFIG.SEGMENTS,
      TERRAIN_CONFIG.SIZE,
      x,
      z
    );
  }, [terrainHeightmap]);

  // Memoizar transformaciones para evitar cálculos innecesarios
  const rotationInRadians = useMemo(() => {
    return object.rotation.map((deg) => (deg * Math.PI) / 180);
  }, [object.rotation]);

  // Flag para saber si ya ajustamos la posición inicial
  const hasAdjustedInitialPosition = useRef(false);
  
  // Inicializar posición del grupo solo al montar
  useEffect(() => {
    if (groupRef.current) {
      // Deshabilitar actualización automática de matriz para mejor rendimiento
      groupRef.current.matrixAutoUpdate = true; // Mantener true para TransformControls
      
      // Aplicar offset visualmente: la posición guardada es la "base", pero visualmente aplicamos el offset y la altura del terreno
      // Esto asegura que el editor y el juego usen la misma lógica de posicionamiento
      let visualY = object.position[1];
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        try {
          // Calcular altura del terreno en esta posición
          const terrainHeight = getTerrainHeight(object.position[0], object.position[2]);
          // La posición guardada es la base, aplicamos el offset y la altura del terreno visualmente
          visualY = object.position[1] + terrainHeight + minYOffsetRef.current;
        } catch (error) {
          // Fallback: usar solo el offset si hay error
          visualY = object.position[1] + minYOffsetRef.current;
        }
      }
      
      groupRef.current.position.set(object.position[0], visualY, object.position[2]);
      groupRef.current.rotation.set(...rotationInRadians);
      groupRef.current.scale.set(...object.scale);
      groupRef.current.updateMatrixWorld();
      
      // Actualizar cache con la posición visual
      lastPositionRef.current.set(object.position[0], visualY, object.position[2]);
      lastRotationRef.current.set(...rotationInRadians);
      lastScaleRef.current.set(...object.scale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar - getTerrainHeight es estable gracias a useCallback
  
  // Ajustar posición Y cuando se calcula el offset (para objetos recién agregados)
  useEffect(() => {
    if (groupRef.current && minYOffsetRef.current !== 0 && offsetCalculatedRef.current && !hasAdjustedInitialPosition.current) {
      // Si el objeto está en [0,0,0] (recién agregado), ajustar visualmente pero guardar posición base
      if (object.position[0] === 0 && object.position[1] === 0 && object.position[2] === 0) {
        // Calcular altura del terreno en esta posición
        const terrainHeight = getTerrainHeight(0, 0);
        // Aplicar offset y altura del terreno visualmente
        const visualY = terrainHeight + minYOffsetRef.current;
        groupRef.current.position.y = visualY;
        groupRef.current.updateMatrixWorld();
        
        // Guardar posición base (0) - el offset y altura del terreno se aplicarán en el modo juego también
        // No actualizar el estado, mantener posición base en [0,0,0]
        
        // Actualizar cache con posición visual
        lastPositionRef.current.y = visualY;
        hasAdjustedInitialPosition.current = true;
      }
    }
  }, [modelOffset, object.model, object.scale, getTerrainHeight]); // Recalcular cuando se calcula el offset

  // Sincronizar cuando cambia el objeto externamente (pero no cuando se está arrastrando)
  // Usar useFrame para sincronización suave y eficiente
  useFrame(() => {
    if (!groupRef.current) return;

    // Forzar posición Y durante arrastre para evitar que se hunda debajo del terreno
    if (isTransforming.current && transformMode !== 'scale') {
      const currentY = groupRef.current.position.y;
      const currentX = groupRef.current.position.x;
      const currentZ = groupRef.current.position.z;
      const terrainHeight = getTerrainHeight(currentX, currentZ);
      
      // Calcular altura mínima: terreno + offset (si existe)
      let minY = terrainHeight;
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        minY = terrainHeight + minYOffsetRef.current;
      }
      
      // SIEMPRE asegurar que el objeto no esté debajo del terreno
      if (currentY < minY) {
        groupRef.current.position.y = minY;
        groupRef.current.updateMatrixWorld();
      }
      
      if (!isDraggingY.current && minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        // Durante arrastre horizontal, forzar Y visual a la altura del terreno + offset
        if (Math.abs(currentY - minY) > 0.01) {
          groupRef.current.position.y = minY;
          groupRef.current.updateMatrixWorld();
        }
      }
      return; // No sincronizar durante arrastre
    }
    
    // NO sincronizar durante arrastre para evitar parpadeo y conflictos con TransformControls
    // Durante el arrastre, TransformControls o el control personalizado manejan la transformación directamente
    if (isDragging.current || isTransforming.current) {
      return;
    }
    
    // Asegurar que el objeto esté visible (no solo la sombra)
    if (groupRef.current.visible === false) {
      groupRef.current.visible = true;
    }
    
    // Comparar con valores anteriores usando comparación directa (más eficiente que .equals())
    const posX = object.position[0];
    let posY = object.position[1];
    const posZ = object.position[2];
    const lastPos = lastPositionRef.current;
    
    // Aplicar offset visualmente: la posición guardada es la base, aplicamos el offset para visualización
    // Y también la altura del terreno en esa posición
    // SIEMPRE asegurar que el objeto esté sobre el terreno
    const terrainHeight = getTerrainHeight(posX, posZ);
    let minY = terrainHeight;
    
    if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
      minY = terrainHeight + minYOffsetRef.current;
      posY = object.position[1] + terrainHeight + minYOffsetRef.current;
    } else {
      // Sin offset, asegurar que al menos esté sobre el terreno
      posY = Math.max(object.position[1], terrainHeight);
    }
    
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
    
    // Escala - sincronizar desde el estado solo si el estado ha cambiado externamente
    const scaleX = object.scale[0];
    const scaleY = object.scale[1];
    const scaleZ = object.scale[2];
    const lastScale = lastScaleRef.current;
    const currentScale = groupRef.current.scale;
    
    // Verificar si el estado ha cambiado desde el último frame
    const stateScaleChanged = 
      Math.abs(scaleX - lastScale.x) > 0.001 ||
      Math.abs(scaleY - lastScale.y) > 0.001 ||
      Math.abs(scaleZ - lastScale.z) > 0.001;
    
    // IMPORTANTE: Si cambió la escala Y, el offset puede cambiar
    // El offset se recalcula automáticamente en modelOffset cuando cambia object.scale
    // Pero necesitamos actualizar la posición Y visual si el offset cambió
    if (stateScaleChanged && Math.abs(scaleY - lastScale.y) > 0.001) {
      // El offset ya se recalculó en modelOffset, solo necesitamos actualizar la posición visual
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        const terrainHeight = getTerrainHeight(posX, posZ);
        const newVisualY = object.position[1] + terrainHeight + minYOffsetRef.current;
        groupRef.current.position.y = newVisualY;
        lastPositionRef.current.y = newVisualY;
      }
    }
    
    // Verificar si el cache coincide con la escala visual actual
    // Si coincide, significa que acabamos de hacer un cambio local que aún no se ha sincronizado con el estado
    const cacheMatchesVisual = 
      Math.abs(lastScale.x - currentScale.x) < 0.001 &&
      Math.abs(lastScale.y - currentScale.y) < 0.001 &&
      Math.abs(lastScale.z - currentScale.z) < 0.001;
    
    let scaleChanged = false;
    
    if (stateScaleChanged) {
      // El estado cambió - verificar si la escala visual ya coincide con el estado
      const visualMatchesState = 
        Math.abs(currentScale.x - scaleX) < 0.001 &&
        Math.abs(currentScale.y - scaleY) < 0.001 &&
        Math.abs(currentScale.z - scaleZ) < 0.001;
      
      // Solo sincronizar si la escala visual no coincide con el estado
      // Y si el cache no coincide con la escala visual (para evitar sobrescribir cambios locales)
      if (!visualMatchesState && !cacheMatchesVisual) {
        // El estado cambió externamente y la escala visual no coincide, sincronizar
        groupRef.current.scale.set(scaleX, scaleY, scaleZ);
        lastScale.set(scaleX, scaleY, scaleZ);
        scaleChanged = true;
      } else if (visualMatchesState) {
        // El estado cambió y coincide con la escala visual (nuestro cambio se sincronizó)
        // Solo actualizar el cache
        lastScale.set(scaleX, scaleY, scaleZ);
        scaleChanged = true;
      }
      // Si cacheMatchesVisual es true, no hacer nada - esperar a que el estado se sincronice
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

  // Función para ajustar posición Y al terreno (snap to ground)
  const snapToGround = useCallback((position) => {
    // Si estamos moviendo en Y y el objeto tiene un bounding box calculado
    if (minYOffsetRef.current !== 0 && transformMode === 'translate') {
      // Calcular altura del terreno en esta posición
      const terrainHeight = getTerrainHeight(position.x, position.z);
      // Ajustar Y para que el objeto esté sobre el terreno
      // La posición Y del grupo debe ser: altura del terreno + offset del modelo
      const adjustedY = terrainHeight + minYOffsetRef.current;
      return { ...position, y: adjustedY };
    }
    return position;
  }, [transformMode, getTerrainHeight]);

  // Sistema de actualización diferida para estado - actualizar visualmente inmediatamente, estado después
  const pendingUpdateRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  // Función para aplicar snap y actualizar visualmente
  const applyTransformSnap = useCallback(() => {
    if (!groupRef.current) return;
    
    let position = groupRef.current.position;
    const rotation = groupRef.current.rotation;
    let scale = groupRef.current.scale.clone(); // Clonar para no modificar directamente

    // Aplicar snap según el modo
    if (snapEnabled && transformMode === 'translate') {
      const snappedX = applySnap(position.x);
      let snappedY = applySnap(position.y);
      const snappedZ = applySnap(position.z);
      
      // Detectar movimiento en cada eje comparando con la posición anterior
      const xMovement = Math.abs(position.x - lastPositionRef.current.x);
      const yMovement = Math.abs(position.y - lastPositionRef.current.y);
      const zMovement = Math.abs(position.z - lastPositionRef.current.z);
      
      // SIEMPRE mantener el objeto sobre el terreno - NUNCA permitir que esté debajo
      // Calcular altura del terreno en la posición actual
      const terrainHeight = getTerrainHeight(snappedX, snappedZ);
      
      // Calcular altura mínima: terreno + offset (si existe)
      let minY = terrainHeight;
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        minY = terrainHeight + minYOffsetRef.current;
      }
      
      // Si tenemos offset calculado, usar lógica más sofisticada
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        // Calcular el movimiento horizontal total
        const horizontalMovement = Math.max(xMovement, zMovement);
        
        // Solo considerar movimiento en Y si:
        // 1. El movimiento en Y es significativo (> 0.1 unidades)
        // 2. Y el movimiento en Y es al menos 3 veces mayor que el movimiento horizontal
        // Esto asegura que solo se permita movimiento vertical cuando el usuario está arrastrando explícitamente el eje Y
        const isMovingInY = yMovement > 0.1 && yMovement > horizontalMovement * 3;
        
        if (isMovingInY) {
          // El usuario está moviendo en Y, usar la posición Y actual pero asegurar que esté sobre el terreno
          isDraggingY.current = true;
          snappedY = Math.max(snappedY, minY);
        } else {
          // El usuario está moviendo horizontalmente, mantener el objeto sobre el terreno
          snappedY = minY;
          isDraggingY.current = false;
        }
      } else {
        // Sin offset calculado, simplemente asegurar que no esté debajo del terreno
        snappedY = Math.max(snappedY, minY);
      }
      
      groupRef.current.position.set(snappedX, snappedY, snappedZ);
      position = { x: snappedX, y: snappedY, z: snappedZ };
      groupRef.current.updateMatrixWorld();
      
      // Actualizar lastPositionRef DURANTE el arrastre para evitar falsos positivos
      // Esto evita que pequeños cambios en Y durante arrastre horizontal activen el snap
      lastPositionRef.current.set(position.x, position.y, position.z);
    } else if (snapEnabled && transformMode === 'scale') {
      // Aplicar snap para escalado con incrementos de 0.1 (más preciso y fluido)
      scale.x = Math.round(scale.x / 0.1) * 0.1;
      scale.y = Math.round(scale.y / 0.1) * 0.1;
      scale.z = Math.round(scale.z / 0.1) * 0.1;
      
      // Asegurar límites mínimos y máximos razonables
      scale.x = Math.max(0.1, Math.min(100, scale.x));
      scale.y = Math.max(0.1, Math.min(100, scale.y));
      scale.z = Math.max(0.1, Math.min(100, scale.z));
      
      // Aplicar la escala ajustada
      groupRef.current.scale.set(scale.x, scale.y, scale.z);
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

    // Guardar para actualización al finalizar drag
    // NO actualizar estado durante el drag - solo al finalizar
    pendingUpdateRef.current = updateData;
  }, [snapEnabled, transformMode, applySnap]);

  // Manejar cambios en TransformControls - solo actualizar visual, estado se actualiza diferido
  // NO llamar onUpdate aquí para evitar re-renders costosos
  const handleObjectChange = useCallback(() => {
    if (!groupRef.current || !isTransforming.current) return;
    
    // Aplicar transformación visual inmediatamente
    applyTransformSnap();
    
  }, [applyTransformSnap, transformMode]);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    isTransforming.current = true;
    isDraggingY.current = false; // Resetear flag al iniciar arrastre
    
    // Marcar este objeto como el que se está transformando
    if (transformingObjectIdRef) {
      transformingObjectIdRef.current = object.id;
    }
    
    // Guardar la posición inicial al comenzar el arrastre
    if (groupRef.current) {
      lastPositionRef.current.set(
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      );
    }
    
    // Cancelar cualquier actualización pendiente
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }
  }, [orbitControlsRef, object.id, transformingObjectIdRef]);

  const handleDragEnd = useCallback(() => {
    // Limpiar timeout pendiente si existe
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    // Asegurar actualización final inmediata SOLO AL FINALIZAR
    if (groupRef.current) {
      let position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      let scale = groupRef.current.scale;

      // Aplicar snap final si es necesario
      if (snapEnabled && transformMode === 'translate') {
        const snappedX = applySnap(position.x);
        let snappedY = applySnap(position.y);
        const snappedZ = applySnap(position.z);
        
        // SIEMPRE mantener sobre el terreno - NUNCA permitir que esté debajo
        const terrainHeight = getTerrainHeight(snappedX, snappedZ);
        
        // Calcular altura mínima: terreno + offset (si existe)
        let minY = terrainHeight;
        if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
          minY = terrainHeight + minYOffsetRef.current;
          
          if (isDraggingY.current) {
            // El usuario estaba moviendo en Y, mantener la posición Y visual pero asegurar que esté sobre el terreno
            snappedY = Math.max(snappedY, minY);
          } else {
            // El usuario estaba moviendo horizontalmente, mantener sobre el terreno
            snappedY = minY;
          }
        } else {
          // Sin offset calculado, simplemente asegurar que no esté debajo del terreno
          snappedY = Math.max(snappedY, minY);
        }
        
        // Resetear flag
        isDraggingY.current = false;
        
        groupRef.current.position.set(snappedX, snappedY, snappedZ);
        position = { x: snappedX, y: snappedY, z: snappedZ };
        groupRef.current.updateMatrixWorld();
      } else if (snapEnabled && transformMode === 'scale') {
        // Aplicar snap final para escalado
        let snappedScale = scale.clone();
        snappedScale.x = Math.round(snappedScale.x / 0.1) * 0.1;
        snappedScale.y = Math.round(snappedScale.y / 0.1) * 0.1;
        snappedScale.z = Math.round(snappedScale.z / 0.1) * 0.1;
        
        // Asegurar límites
        snappedScale.x = Math.max(0.1, Math.min(100, snappedScale.x));
        snappedScale.y = Math.max(0.1, Math.min(100, snappedScale.y));
        snappedScale.z = Math.max(0.1, Math.min(100, snappedScale.z));
        
        groupRef.current.scale.set(snappedScale.x, snappedScale.y, snappedScale.z);
        groupRef.current.updateMatrixWorld();
        // Actualizar scale para usar en la actualización del cache
        scale = snappedScale;
      }

      const rotationDegrees = [
        (rotation.x * 180) / Math.PI,
        (rotation.y * 180) / Math.PI,
        (rotation.z * 180) / Math.PI,
      ];

      // Actualizar cache PRIMERO para evitar que useFrame sobrescriba los cambios
      lastPositionRef.current.set(position.x, position.y, position.z);
      lastRotationRef.current.set(rotation.x, rotation.y, rotation.z);
      lastScaleRef.current.set(scale.x, scale.y, scale.z);

      // Actualizar estado UNA SOLA VEZ al finalizar drag
      // IMPORTANTE: Guardar posición base (sin offset y sin altura del terreno) para que coincida con el modo juego
      // La posición visual incluye el offset y la altura del terreno, pero guardamos la posición base
      let basePositionY = position.y;
      if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
        // Calcular altura del terreno en esta posición
        const terrainHeight = getTerrainHeight(position.x, position.z);
        // Restar el offset y la altura del terreno para obtener la posición base
        basePositionY = position.y - terrainHeight - minYOffsetRef.current;
      }
      
      // Usar requestAnimationFrame para evitar que el RaycastHandler deseleccione
      requestAnimationFrame(() => {
        onUpdate({
          position: [position.x, basePositionY, position.z],
          rotation: rotationDegrees,
          scale: [scale.x, scale.y, scale.z],
        });
      });
    } else if (pendingUpdateRef.current) {
      // Si no hay groupRef pero hay datos pendientes, actualizar con esos datos
      requestAnimationFrame(() => {
        onUpdate(pendingUpdateRef.current);
      });
    }
    
    pendingUpdateRef.current = null;
    
    // IMPORTANTE: Registrar el tiempo exacto de finalización de la transformación
    // Esto permite que RaycastHandler sepa exactamente cuándo se terminó de transformar
    if (lastTransformEndTimeRef) {
      lastTransformEndTimeRef.current = Date.now();
    }
    
    // IMPORTANTE: Mantener transformingObjectIdRef activo por más tiempo
    // para que RaycastHandler sepa que este objeto se acaba de transformar
    // y no lo deseleccione cuando se procese el evento click del mouseup
    
    // Marcar como no transformando DESPUÉS de actualizar el estado
    // Usar un delay más largo para asegurar que el estado se actualice y React re-renderice
    // Mantener los flags activos por más tiempo para evitar deselección
    setTimeout(() => {
      isTransforming.current = false;
      isDragging.current = false;
      // NO limpiar transformingObjectIdRef inmediatamente
      // Mantenerlo activo por más tiempo (3 segundos total) para que RaycastHandler
      // pueda detectar que este objeto se acaba de transformar y no lo deseleccione
      setTimeout(() => {
        // Solo limpiar si todavía es este objeto (no ha sido cambiado por otra transformación)
        if (transformingObjectIdRef && transformingObjectIdRef.current === object.id) {
          transformingObjectIdRef.current = null;
        }
      }, 2500); // Limpiar después de 2.5 segundos adicionales (total ~3 segundos)
    }, 500); // Aumentado a 500ms para dar más tiempo
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }
  }, [orbitControlsRef, snapEnabled, transformMode, onUpdate, applySnap, object.id, transformingObjectIdRef]);
  
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
  // Usar ref en lugar de state para evitar re-renders innecesarios
  const groupReadyRef = useRef(false);
  
  useEffect(() => {
    if (groupRef.current && !groupReadyRef.current) {
      groupReadyRef.current = true;
    }
  }, []);
  
  // Re-verificar si el grupo está listo cuando cambia la selección
  // Forzar verificación inmediata y con retry para asegurar que los controles aparezcan
  useEffect(() => {
    if (isSelected) {
      // Verificar inmediatamente
      if (groupRef.current) {
        groupReadyRef.current = true;
      } else {
        // Si no está listo, intentar varias veces con pequeños delays
        let attempts = 0;
        const maxAttempts = 10;
        const checkReady = () => {
          if (groupRef.current) {
            groupReadyRef.current = true;
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkReady, 50);
          }
        };
        setTimeout(checkReady, 0);
      }
    }
  }, [isSelected]);


  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          e.delta = 0; // Prevenir doble click
          
          // Si se acaba de terminar una transformación, NO procesar el click
          const timeSinceLastTransform = lastTransformEndTimeRef ? Date.now() - lastTransformEndTimeRef.current : Infinity;
          if (timeSinceLastTransform < 3000) {
            e.stopPropagation();
            return;
          }
          
          // Solo seleccionar si no está ya seleccionado o si no estamos arrastrando
          if (!isSelected || (!isDragging.current && !isTransforming.current)) {
            onSelect();
          }
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
          colliderScale={object.colliderScale || [0.8, 0.8, 0.8]}
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

      {/* TransformControls - ahora incluye translate, rotate Y scale */}
      {isSelected && groupReadyRef.current && groupRef.current && (
        <>
          <TransformControls
            ref={transformRef}
            object={groupRef.current}
            mode={transformMode}
            onObjectChange={handleObjectChange}
            translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
            rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null} // Snap de 45 grados para rotación
            scaleSnap={snapEnabled && transformMode === 'scale' ? 0.1 : null} // Snap de 0.1 unidades para escalado
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            showX={true}
            showY={true}
            showZ={true}
            space={transformMode === 'scale' ? 'local' : 'world'} // Usar espacio local para scale (más intuitivo), world para translate/rotate
            size={transformMode === 'scale' ? 1.8 : 1.2} // Tamaño mayor para scale (1.8) para mejor visibilidad y control más preciso
          />
          {/* Interceptar clicks en el TransformControls para prevenir deselección */}
          <TransformControlsClickInterceptor
            transformRef={transformRef}
            objectId={object.id}
            isTransforming={isTransforming}
            lastTransformEndTimeRef={lastTransformEndTimeRef}
            transformingObjectIdRef={transformingObjectIdRef}
          />
        </>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Función de comparación personalizada para React.memo
  // Retorna true si los props son iguales (NO re-renderizar)
  // Retorna false si los props son diferentes (SÍ re-renderizar)
  
  // Si cambió el ID del objeto, definitivamente re-renderizar
  if (prevProps.object.id !== nextProps.object.id) {
    return false;
  }
  
  // Comparar propiedades del objeto
  const posChanged = 
    prevProps.object.position[0] !== nextProps.object.position[0] ||
    prevProps.object.position[1] !== nextProps.object.position[1] ||
    prevProps.object.position[2] !== nextProps.object.position[2];
    
  const rotChanged = 
    prevProps.object.rotation[0] !== nextProps.object.rotation[0] ||
    prevProps.object.rotation[1] !== nextProps.object.rotation[1] ||
    prevProps.object.rotation[2] !== nextProps.object.rotation[2];
    
  const scaleChanged = 
    prevProps.object.scale[0] !== nextProps.object.scale[0] ||
    prevProps.object.scale[1] !== nextProps.object.scale[1] ||
    prevProps.object.scale[2] !== nextProps.object.scale[2];
  
  // Si cambió alguna propiedad del objeto, re-renderizar
  if (posChanged || rotChanged || scaleChanged) {
    return false;
  }
  
  // Comparar otras props
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.transformMode !== nextProps.transformMode ||
    prevProps.snapEnabled !== nextProps.snapEnabled ||
    prevProps.snapSize !== nextProps.snapSize
  ) {
    return false;
  }
  
  // Todas las props son iguales, no re-renderizar
  return true;
});

/**
 * Componente de collider en el editor con capacidad de selección y transformación
 * Similar a EditorSceneObject pero para colliders invisibles
 */
const EditorColliderObject = memo(({
  object,
  isSelected,
  onSelect,
  onUpdate,
  orbitControlsRef,
  transformMode = 'translate',
  snapEnabled = true,
  snapSize = 1,
  transformingObjectIdRef,
  lastTransformEndTimeRef,
  terrainHeightmap = null,
}) => {
  const groupRef = useRef();
  const transformRef = useRef();

  // Estado de arrastre
  const isDragging = useRef(false);
  const isTransforming = useRef(false);


  // Cache para valores anteriores
  const lastPositionRef = useRef(new THREE.Vector3(...object.position));
  const lastRotationRef = useRef(new THREE.Euler(...object.rotation.map(deg => (deg * Math.PI) / 180)));
  const lastScaleRef = useRef(new THREE.Vector3(...object.scale));

  // Inicializar posición del grupo
  // IMPORTANTE: Para colliders, NO aplicar escala al grupo porque la geometría ya usa las dimensiones directamente
  // IMPORTANTE: Para colliders, la posición debe ser exactamente object.position (sin offsets)
  useEffect(() => {
    if (groupRef.current) {
      // Usar posición exacta del objeto, sin ningún offset
      groupRef.current.position.set(object.position[0], object.position[1], object.position[2]);
      groupRef.current.rotation.set(...object.rotation.map(deg => (deg * Math.PI) / 180));
      // NO aplicar escala al grupo para colliders - la geometría maneja las dimensiones directamente
      groupRef.current.scale.set(1, 1, 1);
      groupRef.current.updateMatrixWorld();
      
      lastPositionRef.current.set(object.position[0], object.position[1], object.position[2]);
      lastRotationRef.current.set(...object.rotation.map(deg => (deg * Math.PI) / 180));
      lastScaleRef.current.set(...object.scale);
    }
  }, []);

  // Función para obtener la altura del terreno en una posición X, Z
  const getTerrainHeight = useCallback((x, z) => {
    if (!terrainHeightmap || terrainHeightmap.length === 0) {
      return 0; // Sin heightmap, terreno plano
    }
    return getTerrainHeightAtWorldPosition(
      terrainHeightmap,
      TERRAIN_CONFIG.SEGMENTS,
      TERRAIN_CONFIG.SIZE,
      x,
      z
    );
  }, [terrainHeightmap]);

  // Función para aplicar snap a un valor
  const applySnap = useCallback((value) => {
    if (!snapEnabled) return value;
    return Math.round(value / snapSize) * snapSize;
  }, [snapEnabled, snapSize]);

    // Función para aplicar transformación con snap
  const applyTransformSnap = useCallback(() => {
    if (!groupRef.current) return;
    
    let position = groupRef.current.position;
    const rotation = groupRef.current.rotation;
    let scale = groupRef.current.scale.clone(); // Clonar para no modificar directamente

    // Aplicar snap según el modo
    if (snapEnabled && transformMode === 'translate') {
      const snappedX = applySnap(position.x);
      let snappedY = applySnap(position.y);
      const snappedZ = applySnap(position.z);
      
      // SIEMPRE asegurar que el collider no esté debajo del terreno
      const terrainHeight = getTerrainHeight(snappedX, snappedZ);
      snappedY = Math.max(snappedY, terrainHeight);
      
      groupRef.current.position.set(snappedX, snappedY, snappedZ);
      position = { x: snappedX, y: snappedY, z: snappedZ };
      groupRef.current.updateMatrixWorld();
      
      lastPositionRef.current.set(position.x, position.y, position.z);
    } else if (snapEnabled && transformMode === 'scale') {
      // Aplicar snap para escalado con incrementos de 0.1 (más preciso y fluido)
      scale.x = Math.round(scale.x / 0.1) * 0.1;
      scale.y = Math.round(scale.y / 0.1) * 0.1;
      scale.z = Math.round(scale.z / 0.1) * 0.1;
      
      // Asegurar límites mínimos y máximos razonables (más altos para colliders)
      scale.x = Math.max(0.1, Math.min(1000, scale.x));
      scale.y = Math.max(0.1, Math.min(1000, scale.y));
      scale.z = Math.max(0.1, Math.min(1000, scale.z));
      
      // Aplicar la escala ajustada
      groupRef.current.scale.set(scale.x, scale.y, scale.z);
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

    return updateData;
  }, [snapEnabled, transformMode, applySnap]);

  // Manejar cambios en TransformControls (solo para translate y rotate)
  const handleObjectChange = useCallback(() => {
    if (!groupRef.current || !isTransforming.current) return;
    applyTransformSnap();
  }, [applyTransformSnap]);

  // Sincronizar cuando cambia el objeto externamente
  useFrame(() => {
    if (!groupRef.current) return;
    
    // NO sincronizar durante arrastre para evitar parpadeo
    if (isDragging.current || isTransforming.current) {
      // Pero durante el arrastre, asegurar que no esté debajo del terreno
      const currentY = groupRef.current.position.y;
      const currentX = groupRef.current.position.x;
      const currentZ = groupRef.current.position.z;
      const terrainHeight = getTerrainHeight(currentX, currentZ);
      
      if (currentY < terrainHeight) {
        groupRef.current.position.y = terrainHeight;
        groupRef.current.updateMatrixWorld();
      }
      return;
    }

    const posChanged = 
      Math.abs(object.position[0] - lastPositionRef.current.x) > 0.001 ||
      Math.abs(object.position[1] - lastPositionRef.current.y) > 0.001 ||
      Math.abs(object.position[2] - lastPositionRef.current.z) > 0.001;

    if (posChanged) {
      // Para colliders, usar posición exacta pero asegurar que no esté debajo del terreno
      const terrainHeight = getTerrainHeight(object.position[0], object.position[2]);
      const finalY = Math.max(object.position[1], terrainHeight);
      
      groupRef.current.position.set(object.position[0], finalY, object.position[2]);
      lastPositionRef.current.set(object.position[0], finalY, object.position[2]);
      groupRef.current.updateMatrixWorld();
    }

    const rotationInRadians = object.rotation.map(deg => (deg * Math.PI) / 180);
    const rotChanged = 
      Math.abs(rotationInRadians[0] - lastRotationRef.current.x) > 0.001 ||
      Math.abs(rotationInRadians[1] - lastRotationRef.current.y) > 0.001 ||
      Math.abs(rotationInRadians[2] - lastRotationRef.current.z) > 0.001;

    if (rotChanged) {
      groupRef.current.rotation.set(...rotationInRadians);
      lastRotationRef.current.set(...rotationInRadians);
    }

    const scaleChanged = 
      Math.abs(object.scale[0] - lastScaleRef.current.x) > 0.001 ||
      Math.abs(object.scale[1] - lastScaleRef.current.y) > 0.001 ||
      Math.abs(object.scale[2] - lastScaleRef.current.z) > 0.001;

    // NO aplicar escala al grupo para colliders - la geometría maneja las dimensiones directamente
    // Solo actualizar el cache para detectar cambios
    if (scaleChanged) {
      // Mantener escala del grupo en 1,1,1 para colliders
      groupRef.current.scale.set(1, 1, 1);
      lastScaleRef.current.set(...object.scale);
    }

    if (posChanged || rotChanged || scaleChanged) {
      groupRef.current.updateMatrixWorld();
    }
  });

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    isTransforming.current = true;
    
    if (transformingObjectIdRef) {
      transformingObjectIdRef.current = object.id;
    }
    
    if (groupRef.current) {
      lastPositionRef.current.set(
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      );
    }
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }
  }, [orbitControlsRef, object.id, transformingObjectIdRef]);

  const handleDragEnd = useCallback(() => {
    if (groupRef.current) {
      let position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      let scale = groupRef.current.scale;

      // Aplicar snap final si es necesario
      if (snapEnabled && transformMode === 'translate') {
        const snappedX = applySnap(position.x);
        let snappedY = applySnap(position.y);
        const snappedZ = applySnap(position.z);
        
        // SIEMPRE asegurar que el collider no esté debajo del terreno
        const terrainHeight = getTerrainHeight(snappedX, snappedZ);
        snappedY = Math.max(snappedY, terrainHeight);
        
        groupRef.current.position.set(snappedX, snappedY, snappedZ);
        position = { x: snappedX, y: snappedY, z: snappedZ };
        groupRef.current.updateMatrixWorld();
      } else if (snapEnabled && transformMode === 'scale') {
        // Aplicar snap final para escalado
        let snappedScale = scale.clone();
        snappedScale.x = Math.round(snappedScale.x / 0.1) * 0.1;
        snappedScale.y = Math.round(snappedScale.y / 0.1) * 0.1;
        snappedScale.z = Math.round(snappedScale.z / 0.1) * 0.1;
        
        // Asegurar límites (más altos para colliders)
        snappedScale.x = Math.max(0.1, Math.min(1000, snappedScale.x));
        snappedScale.y = Math.max(0.1, Math.min(1000, snappedScale.y));
        snappedScale.z = Math.max(0.1, Math.min(1000, snappedScale.z));
        
        groupRef.current.scale.set(snappedScale.x, snappedScale.y, snappedScale.z);
        groupRef.current.updateMatrixWorld();
        // Actualizar scale para usar en la actualización posterior
        scale = snappedScale;
      }

      const rotationDegrees = [
        (rotation.x * 180) / Math.PI,
        (rotation.y * 180) / Math.PI,
        (rotation.z * 180) / Math.PI,
      ];

      // Para colliders, las dimensiones se manejan directamente (no a través de la escala del grupo)
      // TransformControls actualiza el grupo.scale, pero para colliders usamos las dimensiones directamente
      let finalScale = object.scale || [1, 1, 1];
      if (transformMode === 'scale') {
        // Para colliders, usar la escala del grupo directamente (TransformControls la actualiza)
        // Pero validar y aplicar snap si es necesario
        finalScale = [scale.x, scale.y, scale.z];
        
        // Aplicar snap si está habilitado
        if (snapEnabled) {
          finalScale = finalScale.map(s => Math.round(s / 0.1) * 0.1);
          finalScale = finalScale.map(s => Math.max(0.1, Math.min(1000, s))); // Límites para colliders
        }
      }

      lastPositionRef.current.set(position.x, position.y, position.z);
      lastRotationRef.current.set(rotation.x, rotation.y, rotation.z);
      lastScaleRef.current.set(finalScale[0], finalScale[1], finalScale[2]);

      // Para colliders, usar finalScale (dimensiones directas)
      // IMPORTANTE: Usar la posición del grupo directamente, sin ningún offset
      const savedPosition = [
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      ];
      
      requestAnimationFrame(() => {
        onUpdate({
          position: savedPosition,
          rotation: rotationDegrees,
          scale: finalScale,
        });
      });
    }
    
    if (lastTransformEndTimeRef) {
      lastTransformEndTimeRef.current = Date.now();
    }

    setTimeout(() => {
      isTransforming.current = false;
      isDragging.current = false;
      if (transformingObjectIdRef && transformingObjectIdRef.current === object.id) {
        setTimeout(() => {
          if (transformingObjectIdRef.current === object.id) {
            transformingObjectIdRef.current = null;
          }
        }, 2500);
      }
    }, 500);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }
  }, [orbitControlsRef, onUpdate, object.id, transformingObjectIdRef, lastTransformEndTimeRef, snapEnabled, transformMode, applySnap]);

  // Marcar el objeto con su ID para raycasting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.objectId = object.id;
      groupRef.current.userData.isSelectable = true;
      groupRef.current.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.userData.objectId = object.id;
          child.userData.isSelectable = true;
        }
      });
    }
  }, [object.id]);

  const groupReadyRef = useRef(false);
  useEffect(() => {
    if (groupRef.current && !groupReadyRef.current) {
      groupReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (isSelected) {
      if (groupRef.current) {
        groupReadyRef.current = true;
      } else {
        let attempts = 0;
        const maxAttempts = 10;
        const checkReady = () => {
          if (groupRef.current) {
            groupReadyRef.current = true;
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkReady, 50);
          }
        };
        setTimeout(checkReady, 0);
      }
    }
  }, [isSelected]);


  // Renderizar collider visual según el tipo
  const renderColliderVisual = () => {
    // Usar las dimensiones del objeto directamente (TransformControls las actualiza en tiempo real)
    let dimensions = object.scale || [1, 1, 1];
    
    // Validar que dimensions sea un array válido y no null
    if (!Array.isArray(dimensions) || dimensions.length < 3) {
      dimensions = [1, 1, 1];
    }
    
    // Validar que todos los elementos sean números válidos
    const safeDimensions = dimensions.map((d) => {
      if (d === null || d === undefined || typeof d !== 'number' || !isFinite(d) || isNaN(d)) {
        return 1;
      }
      return Math.max(0.1, d);
    });
    
    // Crear key solo después de validar
    const dimensionsKey = `${safeDimensions[0].toFixed(3)}-${safeDimensions[1].toFixed(3)}-${safeDimensions[2].toFixed(3)}`;
    
    if (object.colliderType === 'cylinder') {
      // Calcular parámetros del collider para visualización
      const colliderParams = calculateCylinderCollider({
        type: 'cylinder',
        position: [0, 0, 0],
        scale: safeDimensions,
        rotation: [0, 0, 0],
      });

      if (!colliderParams) {
        return null;
      }

      const { radius, halfHeight, height } = colliderParams;
      const adjustedRadius = height < radius * 2 ? Math.max(0.1, height / 2) : radius;
      const adjustedHalfHeight = height < radius * 2 ? 0 : Math.max(0, (height - adjustedRadius * 2) / 2);
      const displayHeight = adjustedHalfHeight * 2 + adjustedRadius * 2;
      const safeDisplayHeight = Math.max(0.01, Math.min(2000, displayHeight));

      return (
        <group key={`cylinder-${dimensionsKey}`} position={[0, 0, 0]}>
          {/* RigidBody físico AZUL (solo visualización en editor) */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[adjustedRadius, adjustedRadius, safeDisplayHeight, 32]} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={isSelected ? 0.4 : 0.3}
              wireframe={true}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    } else if (object.colliderType === 'box') {
      // Para el collider de caja, mostrar solo el RigidBody físico AZUL
      return (
        <group key={`box-${dimensionsKey}`} position={[0, 0, 0]}>
          {/* RigidBody físico AZUL (solo visualización en editor) */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={safeDimensions} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={isSelected ? 0.4 : 0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={safeDimensions} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={isSelected ? 1.0 : 0.8}
              wireframe={true}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    } else if (object.colliderType === 'sphere') {
      // Para sphere, usar el promedio de las dimensiones como radio
      const radius = (safeDimensions[0] + safeDimensions[1] + safeDimensions[2]) / 6;
      const safeRadius = Math.max(0.1, Math.min(1000, radius));
      
      return (
        <group key={`sphere-${dimensionsKey}`} position={[0, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[safeRadius, 32, 32]} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={isSelected ? 0.4 : 0.3}
              wireframe={true}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    } else if (object.colliderType === 'capsule') {
      // Para capsule, similar a cylinder pero con semiesferas
      const radius = (safeDimensions[0] + safeDimensions[2]) / 2;
      const height = safeDimensions[1];
      const safeRadius = Math.max(0.1, Math.min(1000, radius));
      const adjustedHalfHeight = Math.max(0, (height - safeRadius * 2) / 2);
      const displayHeight = adjustedHalfHeight * 2 + safeRadius * 2;
      const safeDisplayHeight = Math.max(0.01, Math.min(2000, displayHeight));
      
      return (
        <group key={`capsule-${dimensionsKey}`} position={[0, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[safeRadius, safeRadius, safeDisplayHeight, 32]} />
            <meshBasicMaterial
              color="#00aaff"
              transparent
              opacity={isSelected ? 0.4 : 0.3}
              wireframe={true}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    }
    return null;
  };


  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          e.delta = 0;
          const timeSinceLastTransform = lastTransformEndTimeRef ? Date.now() - lastTransformEndTimeRef.current : Infinity;
          if (timeSinceLastTransform < 3000) {
            e.stopPropagation();
            return;
          }
          if (!isSelected || (!isDragging.current && !isTransforming.current)) {
            onSelect();
          }
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
        {/* Visualización del collider */}
        {renderColliderVisual()}

        {/* Highlight cuando está seleccionado - usar dimensiones del collider */}
        {isSelected && (
          <mesh position={[0, 0, 0]} frustumCulled={false}>
            {object.colliderType === 'sphere' ? (
              <sphereGeometry args={[(object.scale[0] + object.scale[1] + object.scale[2]) / 6, 16, 16]} />
            ) : (
              <boxGeometry args={object.scale || [1, 1, 1]} />
            )}
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.1}
              wireframe
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* TransformControls - ahora incluye translate, rotate Y scale */}
      {isSelected && groupReadyRef.current && groupRef.current && (
        <>
          <TransformControls
            ref={transformRef}
            object={groupRef.current}
            mode={transformMode}
            onObjectChange={handleObjectChange}
            translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
            rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null}
            scaleSnap={snapEnabled && transformMode === 'scale' ? 0.1 : null} // Snap de 0.1 unidades para escalado
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            showX={true}
            showY={true}
            showZ={true}
            space={transformMode === 'scale' ? 'local' : 'world'} // Usar espacio local para scale (más intuitivo), world para translate/rotate
            size={transformMode === 'scale' ? 1.8 : 1.2} // Tamaño mayor para scale (1.8) para mejor visibilidad y control más preciso
          />
        </>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  if (prevProps.object.id !== nextProps.object.id) return false;
  
  const posChanged = 
    prevProps.object.position[0] !== nextProps.object.position[0] ||
    prevProps.object.position[1] !== nextProps.object.position[1] ||
    prevProps.object.position[2] !== nextProps.object.position[2];
    
  const rotChanged = 
    prevProps.object.rotation[0] !== nextProps.object.rotation[0] ||
    prevProps.object.rotation[1] !== nextProps.object.rotation[1] ||
    prevProps.object.rotation[2] !== nextProps.object.rotation[2];
    
  const scaleChanged = 
    prevProps.object.scale[0] !== nextProps.object.scale[0] ||
    prevProps.object.scale[1] !== nextProps.object.scale[1] ||
    prevProps.object.scale[2] !== nextProps.object.scale[2];
  
  if (posChanged || rotChanged || scaleChanged) return false;
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.transformMode !== nextProps.transformMode ||
    prevProps.snapEnabled !== nextProps.snapEnabled ||
    prevProps.snapSize !== nextProps.snapSize
  ) {
    return false;
  }
  
  return true;
});

/**
 * Componente de cámara en el editor con capacidad de selección y transformación
 * Similar a EditorSceneObject pero para cámaras
 */
const EditorCameraObject = memo(({
  object,
  isSelected,
  onSelect,
  onUpdate,
  orbitControlsRef,
  transformMode = 'translate',
  snapEnabled = true,
  snapSize = 1,
  transformingObjectIdRef,
  lastTransformEndTimeRef,
}) => {
  const groupRef = useRef();
  const transformRef = useRef();

  // Estado de arrastre
  const isDragging = useRef(false);
  const isTransforming = useRef(false);

  // Cache para valores anteriores
  const lastPositionRef = useRef(new THREE.Vector3(...object.position));
  const lastRotationRef = useRef(new THREE.Euler(...object.rotation.map(deg => (deg * Math.PI) / 180)));

  // Inicializar y actualizar posición del grupo cuando cambia el objeto
  useEffect(() => {
    if (groupRef.current) {
      // Actualizar posición y rotación del grupo desde las props del objeto
      groupRef.current.position.set(object.position[0], object.position[1], object.position[2]);
      groupRef.current.rotation.set(...object.rotation.map(deg => (deg * Math.PI) / 180));
      groupRef.current.updateMatrixWorld();
      
      // Actualizar refs de última posición/rotación
      lastPositionRef.current.set(object.position[0], object.position[1], object.position[2]);
      lastRotationRef.current.set(...object.rotation.map(deg => (deg * Math.PI) / 180));
    }
  }, [object.position, object.rotation]);

  // Función para aplicar snap
  const applySnap = useCallback((value) => {
    if (!snapEnabled) return value;
    return Math.round(value / snapSize) * snapSize;
  }, [snapEnabled, snapSize]);

  // Función para aplicar transformación con snap
  const applyTransformSnap = useCallback(() => {
    if (!groupRef.current) return;
    
    let position = groupRef.current.position;
    const rotation = groupRef.current.rotation;

    // Aplicar snap según el modo
    if (snapEnabled && transformMode === 'translate') {
      const snappedX = applySnap(position.x);
      const snappedY = applySnap(position.y);
      const snappedZ = applySnap(position.z);
      
      groupRef.current.position.set(snappedX, snappedY, snappedZ);
      position = { x: snappedX, y: snappedY, z: snappedZ };
      groupRef.current.updateMatrixWorld();
      
      lastPositionRef.current.set(position.x, position.y, position.z);
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
    };

    return updateData;
  }, [snapEnabled, transformMode, applySnap]);

  // Manejar cambios en TransformControls
  const handleObjectChange = useCallback(() => {
    if (!groupRef.current || !isTransforming.current) return;
    applyTransformSnap();
  }, [applyTransformSnap]);

  // Sincronizar cuando cambia el objeto externamente
  useFrame(() => {
    if (!groupRef.current) return;
    
    // NO sincronizar durante arrastre
    if (isDragging.current || isTransforming.current) {
      return;
    }

    const posChanged = 
      Math.abs(object.position[0] - lastPositionRef.current.x) > 0.001 ||
      Math.abs(object.position[1] - lastPositionRef.current.y) > 0.001 ||
      Math.abs(object.position[2] - lastPositionRef.current.z) > 0.001;

    if (posChanged) {
      groupRef.current.position.set(object.position[0], object.position[1], object.position[2]);
      lastPositionRef.current.set(object.position[0], object.position[1], object.position[2]);
      groupRef.current.updateMatrixWorld();
    }

    const rotationInRadians = object.rotation.map(deg => (deg * Math.PI) / 180);
    const rotChanged = 
      Math.abs(rotationInRadians[0] - lastRotationRef.current.x) > 0.001 ||
      Math.abs(rotationInRadians[1] - lastRotationRef.current.y) > 0.001 ||
      Math.abs(rotationInRadians[2] - lastRotationRef.current.z) > 0.001;

    if (rotChanged) {
      groupRef.current.rotation.set(...rotationInRadians);
      lastRotationRef.current.set(...rotationInRadians);
    }

    if (posChanged || rotChanged) {
      groupRef.current.updateMatrixWorld();
    }
  });

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    isTransforming.current = true;
    
    if (transformingObjectIdRef) {
      transformingObjectIdRef.current = object.id;
    }
    
    if (groupRef.current) {
      lastPositionRef.current.set(
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      );
    }
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }
  }, [orbitControlsRef, object.id, transformingObjectIdRef]);

  const handleDragEnd = useCallback(() => {
    if (groupRef.current) {
      let position = groupRef.current.position;
      const rotation = groupRef.current.rotation;

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

      lastPositionRef.current.set(position.x, position.y, position.z);
      lastRotationRef.current.set(rotation.x, rotation.y, rotation.z);

      requestAnimationFrame(() => {
        onUpdate({
          position: [position.x, position.y, position.z],
          rotation: rotationDegrees,
        });
      });
    }
    
    if (lastTransformEndTimeRef) {
      lastTransformEndTimeRef.current = Date.now();
    }

    setTimeout(() => {
      isTransforming.current = false;
      isDragging.current = false;
      if (transformingObjectIdRef && transformingObjectIdRef.current === object.id) {
        setTimeout(() => {
          if (transformingObjectIdRef.current === object.id) {
            transformingObjectIdRef.current = null;
          }
        }, 2500);
      }
    }, 500);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }
  }, [orbitControlsRef, onUpdate, object.id, transformingObjectIdRef, lastTransformEndTimeRef, snapEnabled, transformMode, applySnap]);

  // Marcar el objeto con su ID para raycasting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.objectId = object.id;
      groupRef.current.userData.isSelectable = true;
      groupRef.current.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          child.userData.objectId = object.id;
          child.userData.isSelectable = true;
        }
      });
    }
  }, [object.id]);

  const groupReadyRef = useRef(false);
  useEffect(() => {
    if (groupRef.current && !groupReadyRef.current) {
      groupReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (isSelected) {
      if (groupRef.current) {
        groupReadyRef.current = true;
      } else {
        let attempts = 0;
        const maxAttempts = 10;
        const checkReady = () => {
          if (groupRef.current) {
            groupReadyRef.current = true;
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkReady, 50);
          }
        };
        setTimeout(checkReady, 0);
      }
    }
  }, [isSelected]);

  return (
    <>
      <group
        ref={groupRef}
        position={object.position}
        rotation={object.rotation.map(deg => (deg * Math.PI) / 180)}
        onClick={(e) => {
          e.stopPropagation();
          e.delta = 0;
          const timeSinceLastTransform = lastTransformEndTimeRef ? Date.now() - lastTransformEndTimeRef.current : Infinity;
          if (timeSinceLastTransform < 3000) {
            e.stopPropagation();
            return;
          }
          if (!isSelected || (!isDragging.current && !isTransforming.current)) {
            onSelect();
          }
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
        {/* Componente de cámara con gizmo visual */}
        {/* IMPORTANTE: En el editor, las cámaras NUNCA deben estar activas para no interferir con OrbitControls */}
        {/* El gizmo visual NO debe tener position/rotation propios porque el grupo padre ya los maneja */}
        <CameraComponent
          position={[0, 0, 0]} // Posición relativa al grupo padre (el grupo ya tiene la posición)
          rotation={[0, 0, 0]} // Rotación relativa al grupo padre (el grupo ya tiene la rotación)
          fov={object.fov || 75}
          near={object.near || 0.1}
          far={object.far || 1000}
          mode={object.mode || 'firstPerson'}
          height={object.height || 1.65}
          distance={object.distance || 5}
          offset={object.offset || [0, 0, 0]}
          targetId={object.targetId || null}
          active={false} // SIEMPRE false en el editor para no interferir con OrbitControls
          showGizmo={true}
          isEditor={true} // Marcar como editor para desactivar sincronización
        />

        {/* Highlight cuando está seleccionado */}
        {isSelected && (
          <mesh position={[0, 0, 0]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.1}
              wireframe
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* TransformControls - solo translate y rotate para cámaras */}
      {isSelected && groupReadyRef.current && groupRef.current && (
        <>
          <TransformControls
            ref={transformRef}
            object={groupRef.current}
            mode={transformMode === 'scale' ? 'translate' : transformMode} // No permitir scale en cámaras
            onObjectChange={handleObjectChange}
            translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
            rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            showX={true}
            showY={true}
            showZ={true}
            space="world"
            size={1.2}
          />
        </>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  if (prevProps.object.id !== nextProps.object.id) return false;
  
  const posChanged = 
    prevProps.object.position[0] !== nextProps.object.position[0] ||
    prevProps.object.position[1] !== nextProps.object.position[1] ||
    prevProps.object.position[2] !== nextProps.object.position[2];
    
  const rotChanged = 
    prevProps.object.rotation[0] !== nextProps.object.rotation[0] ||
    prevProps.object.rotation[1] !== nextProps.object.rotation[1] ||
    prevProps.object.rotation[2] !== nextProps.object.rotation[2];
  
  if (posChanged || rotChanged) return false;
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.transformMode !== nextProps.transformMode ||
    prevProps.snapEnabled !== nextProps.snapEnabled ||
    prevProps.snapSize !== nextProps.snapSize
  ) {
    return false;
  }
  
  return true;
});

