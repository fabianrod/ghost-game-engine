import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, TransformControls, Grid, useGLTF } from '@react-three/drei';
import { Terrain } from '../game/Terrain';
import { SceneObject } from '../game/SceneObject';
import { useRef, useEffect, useCallback, useMemo, useState, memo } from 'react';
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
          position={[0, 0.01, 0]}
        />

        {/* Terreno (sin física en editor, solo visualización) */}
        <Terrain hasPhysics={false} />

        {/* Componente para manejar raycasting global */}
        <RaycastHandler
          onSelectObject={onSelectObject}
          objects={objects}
          selectedObject={selectedObject}
          key={`raycast-${objects.length}`} // Forzar re-render cuando cambia el número de objetos
          transformingObjectIdRef={transformingObjectIdRef}
          lastTransformEndTimeRef={lastTransformEndTimeRef}
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
            transformingObjectIdRef={transformingObjectIdRef}
            lastTransformEndTimeRef={lastTransformEndTimeRef}
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
        console.log('[RaycastHandler] Ignorando click - objeto se está transformando');
        return; // Ignorar completamente el click
      }
      
      // NUNCA deseleccionar si se acaba de terminar una transformación (menos de 3 segundos)
      if (timeSinceLastTransform < 3000) {
        console.log('[RaycastHandler] Ignorando click - transformación reciente');
        return;
      }
      
      // Si se estaba transformando recientemente (menos de 2 segundos), ignorar el click
      if (wasTransformingRef.current && timeSinceLastDrag < 2000) {
        console.log('[RaycastHandler] Ignorando click - arrastre reciente');
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
        console.log('[RaycastHandler] Deseleccionando - click explícito en espacio vacío');
        onSelectObject(null);
      } else {
        // Mantener seleccionado - no deseleccionar automáticamente
        console.log('[RaycastHandler] Manteniendo selección', {
          selectedObject,
          intersects: intersects.length,
          recentlyTransformed,
          timeSinceLastTransform,
          isCurrentlyTransforming
        });
      }
    } catch (error) {
      console.error('Error en raycasting:', error);
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
        console.log('[TransformControlsInterceptor] Previniendo click - transformación reciente');
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
}) => {
  const groupRef = useRef();
  const transformRef = useRef();
  const scaleControlsGroupRef = useRef();
  const colliderControlsGroupRef = useRef();

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
  
  // Cargar el modelo UNA SOLA VEZ para calcular el bounding box original (sin transformaciones)
  const { scene: modelScene } = useGLTF(object.model);
  const clonedModelScene = useMemo(() => {
    if (modelScene) {
      return modelScene.clone();
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
      console.warn('Error calculando bounding box:', error);
      return null;
    }
  }, [clonedModelScene]);

  const modelOffset = useMemo(() => {
    if (!modelBoundingBox) return 0;
    const minY = modelBoundingBox.min.y;
    // Calcular el offset Y necesario para que el objeto esté sobre el terreno (Y=0)
    // Similar a cómo SceneObject calcula: position[1] - minY * scale[1]
    const offset = -minY * object.scale[1];
    console.log(`[Editor] Offset calculado (modelo original): minY=${minY.toFixed(3)}, scale=${object.scale[1]}, offset=${offset.toFixed(3)}`);
    return offset;
  }, [modelBoundingBox, object.scale]); // Solo recalcular cuando cambia el modelo o escala

  // Calcular tamaño y posición del collider para visualización
  // Mostrar siempre que haya un modelBoundingBox (no requiere hasCollider para visualización en editor)
  const colliderVisualization = useMemo(() => {
    if (!modelBoundingBox) {
      console.log('[Collider] No hay modelBoundingBox');
      return null;
    }
    
    const size = modelBoundingBox.getSize(new THREE.Vector3());
    const center = modelBoundingBox.getCenter(new THREE.Vector3());
    const colliderScale = object.colliderScale || [0.8, 0.8, 0.8];
    
    // Aplicar la escala personalizada del collider
    const colliderSize = new THREE.Vector3(
      size.x * object.scale[0] * colliderScale[0],
      size.y * object.scale[1] * colliderScale[1],
      size.z * object.scale[2] * colliderScale[2]
    );
    
    console.log('[Collider] Visualización calculada:', {
      size: colliderSize,
      center: center,
      hasCollider: object.hasCollider,
      colliderScale: colliderScale
    });
    
    return {
      size: colliderSize,
      center: center,
    };
  }, [modelBoundingBox, object.scale, object.colliderScale]);
  
  // Actualizar el ref cuando cambia el offset calculado
  useEffect(() => {
    minYOffsetRef.current = modelOffset;
    offsetCalculatedRef.current = modelOffset !== 0;
    // Resetear flag de posición inicial cuando cambia el modelo
    if (object.model) {
      hasAdjustedInitialPosition.current = false;
    }
  }, [modelOffset, object.model]);
  
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
      
      // Si el objeto está en [0,0,0] y tenemos offset calculado, ajustar Y
      let initialY = object.position[1];
      if (object.position[0] === 0 && object.position[1] === 0 && object.position[2] === 0 && minYOffsetRef.current !== 0) {
        initialY = minYOffsetRef.current;
        hasAdjustedInitialPosition.current = true;
      }
      
      groupRef.current.position.set(object.position[0], initialY, object.position[2]);
      groupRef.current.rotation.set(...rotationInRadians);
      groupRef.current.scale.set(...object.scale);
      groupRef.current.updateMatrixWorld();
      
      // Actualizar cache
      lastPositionRef.current.set(object.position[0], initialY, object.position[2]);
      lastRotationRef.current.set(...rotationInRadians);
      lastScaleRef.current.set(...object.scale);
    }
  }, []); // Solo al montar
  
  // Ajustar posición Y cuando se calcula el offset (para objetos recién agregados)
  useEffect(() => {
    if (groupRef.current && minYOffsetRef.current !== 0 && offsetCalculatedRef.current && !hasAdjustedInitialPosition.current) {
      // Si el objeto está en [0,0,0] (recién agregado), ajustar Y al terreno
      if (object.position[0] === 0 && object.position[1] === 0 && object.position[2] === 0) {
        const adjustedY = minYOffsetRef.current;
        groupRef.current.position.y = adjustedY;
        groupRef.current.updateMatrixWorld();
        
        // Actualizar el estado del objeto con la posición ajustada
        onUpdate({
          position: [0, adjustedY, 0],
        });
        
        // Actualizar cache
        lastPositionRef.current.y = adjustedY;
        hasAdjustedInitialPosition.current = true;
      }
    }
  }, [modelOffset, object.model, object.scale, onUpdate]); // Recalcular cuando se calcula el offset

  // Sincronizar cuando cambia el objeto externamente (pero no cuando se está arrastrando)
  // Usar useFrame para sincronización suave y eficiente
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Sincronizar posición del grupo de controles de escalamiento con el objeto
    if (isSelected && transformMode === 'scale' && scaleControlsGroupRef.current) {
      scaleControlsGroupRef.current.position.copy(groupRef.current.position);
      scaleControlsGroupRef.current.rotation.copy(groupRef.current.rotation);
      scaleControlsGroupRef.current.updateMatrixWorld();
    }

    // Sincronizar posición del grupo de controles del collider con el objeto
    if (isSelected && object.hasCollider && colliderControlsGroupRef.current && colliderVisualization) {
      colliderControlsGroupRef.current.position.copy(groupRef.current.position);
      colliderControlsGroupRef.current.rotation.copy(groupRef.current.rotation);
      colliderControlsGroupRef.current.updateMatrixWorld();
    }
    
    // Forzar posición Y durante arrastre horizontal para evitar que se hunda
    if (isTransforming.current && minYOffsetRef.current !== 0 && offsetCalculatedRef.current && transformMode !== 'scale') {
      const currentY = groupRef.current.position.y;
      if (!isDraggingY.current) {
        // Durante arrastre horizontal, forzar Y al offset para evitar que se hunda
        if (Math.abs(currentY - minYOffsetRef.current) > 0.01) {
          groupRef.current.position.y = minYOffsetRef.current;
          groupRef.current.updateMatrixWorld();
        }
      } else {
        // Durante arrastre vertical, asegurar que Y no baje del offset mínimo
        if (currentY < minYOffsetRef.current) {
          groupRef.current.position.y = minYOffsetRef.current;
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
      // Ajustar Y para que el objeto esté sobre el terreno (Y=0)
      // La posición Y del grupo debe ser el offset calculado
      const adjustedY = minYOffsetRef.current;
      return { ...position, y: adjustedY };
    }
    return position;
  }, [transformMode]);

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
      let snappedY = applySnap(position.y);
      const snappedZ = applySnap(position.z);
      
      // Detectar movimiento en cada eje comparando con la posición anterior
      const xMovement = Math.abs(position.x - lastPositionRef.current.x);
      const yMovement = Math.abs(position.y - lastPositionRef.current.y);
      const zMovement = Math.abs(position.z - lastPositionRef.current.z);
      
      // Durante el arrastre, SIEMPRE mantener el objeto sobre el terreno si tenemos offset calculado
      // Solo permitir movimiento en Y si el usuario está explícitamente moviendo en Y
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
          snappedY = Math.max(snappedY, minYOffsetRef.current);
        } else {
          // El usuario está moviendo horizontalmente, mantener el objeto sobre el terreno
          // Forzar Y al offset calculado para evitar que se hunda
          snappedY = minYOffsetRef.current;
          isDraggingY.current = false;
        }
      }
      
      groupRef.current.position.set(snappedX, snappedY, snappedZ);
      position = { x: snappedX, y: snappedY, z: snappedZ };
      groupRef.current.updateMatrixWorld();
      
      // Actualizar lastPositionRef DURANTE el arrastre para evitar falsos positivos
      // Esto evita que pequeños cambios en Y durante arrastre horizontal activen el snap
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
  }, [applyTransformSnap]);

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
      const scale = groupRef.current.scale;

      // Aplicar snap final si es necesario
      if (snapEnabled && transformMode === 'translate') {
        const snappedX = applySnap(position.x);
        let snappedY = applySnap(position.y);
        const snappedZ = applySnap(position.z);
        
        // Durante arrastre horizontal, SIEMPRE mantener sobre el terreno
        // Solo permitir movimiento en Y si el usuario estaba explícitamente moviendo en Y
        if (minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
          if (isDraggingY.current) {
            // El usuario estaba moviendo en Y, mantener la posición Y pero asegurar que esté sobre el terreno
            snappedY = Math.max(snappedY, minYOffsetRef.current);
          } else {
            // El usuario estaba moviendo horizontalmente, mantener sobre el terreno
            snappedY = minYOffsetRef.current;
          }
        }
        
        // Resetear flag
        isDraggingY.current = false;
        
        groupRef.current.position.set(snappedX, snappedY, snappedZ);
        position = { x: snappedX, y: snappedY, z: snappedZ };
        groupRef.current.updateMatrixWorld();
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
      // Usar requestAnimationFrame para evitar que el RaycastHandler deseleccione
      requestAnimationFrame(() => {
        onUpdate({
          position: [position.x, position.y, position.z],
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
      console.log('[EditorSceneObject] Transformación terminada, tiempo registrado:', lastTransformEndTimeRef.current);
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
          console.log('[EditorSceneObject] Limpiando transformingObjectIdRef');
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

  // Refs para el control de escalamiento personalizado
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const activeAxisRef = useRef(null);
  const initialScaleRef = useRef(new THREE.Vector3());
  const initialMousePosRef = useRef(new THREE.Vector2());

  // Refs para el control del collider
  const colliderRaycasterRef = useRef(new THREE.Raycaster());
  const colliderMouseRef = useRef(new THREE.Vector2());
  const activeColliderAxisRef = useRef(null);
  const initialColliderScaleRef = useRef(new THREE.Vector3());
  const initialColliderMousePosRef = useRef(new THREE.Vector2());

  // Crear controles de escalamiento simplificados (solo ejes principales)
  useEffect(() => {
    if (!isSelected || transformMode !== 'scale' || !groupRef.current || !scaleControlsGroupRef.current) {
      // Limpiar controles si no están seleccionados o no están en modo scale
      if (scaleControlsGroupRef.current) {
        try {
          scaleControlsGroupRef.current.clear();
        } catch (e) {
          // Ignorar errores al limpiar
        }
      }
      return;
    }

    try {
      const group = scaleControlsGroupRef.current;
      if (!group) return;
      
      group.clear();

    // Tamaños optimizados para mejor visibilidad y usabilidad
    const axisLength = 2.5; // Longitud de los ejes
    const handleSize = 0.3; // Tamaño de los handles cuadrados
    const centerHandleSize = 0.35; // Tamaño del handle central (un poco más grande)

    // Colores para cada eje
    const colors = {
      x: 0xff0000, // Rojo
      y: 0x00ff00, // Verde
      z: 0x0000ff, // Azul
    };
    const centerColor = 0xffffff; // Blanco para el control central

    // Crear cubo central para escalado proporcional
    const centerGeometry = new THREE.BoxGeometry(centerHandleSize, centerHandleSize, centerHandleSize);
    const centerMaterial = new THREE.MeshBasicMaterial({ 
      color: centerColor,
      transparent: true,
      opacity: 0.9,
    });
    const centerHandle = new THREE.Mesh(centerGeometry, centerMaterial);
    centerHandle.userData.axis = 'uniform';
    centerHandle.userData.isControl = true;
    centerHandle.userData.isHandle = true;
    centerHandle.userData.isCenter = true;
    group.add(centerHandle);

    // Crear controles para cada eje (solo ejes y handles cuadrados)
    ['x', 'y', 'z'].forEach((axis) => {
      const direction = new THREE.Vector3();
      direction[axis] = 1;

      // Línea del eje (simple y limpia)
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        direction.clone().multiplyScalar(axisLength),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: colors[axis], 
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData.axis = axis;
      line.userData.isControl = true;
      group.add(line);

      // Handle interactivo cuadrado al final del eje
      const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
      const handleMaterial = new THREE.MeshBasicMaterial({ 
        color: colors[axis],
        transparent: true,
        opacity: 0.9,
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.copy(direction.clone().multiplyScalar(axisLength));
      handle.userData.axis = axis;
      handle.userData.isControl = true;
      handle.userData.isHandle = true;
      group.add(handle);
    });

      return () => {
        if (group) {
          try {
            group.clear();
          } catch (e) {
            // Ignorar errores al limpiar
          }
        }
      };
    } catch (error) {
      console.error('Error creando controles de escalamiento:', error);
    }
  }, [isSelected, transformMode, object.scale]);

  // Crear control visual del collider (esfera central simple)
  useEffect(() => {
    if (!isSelected || !colliderVisualization || !colliderControlsGroupRef.current || transformMode !== 'collider') {
      // Limpiar controles si no están seleccionados o no tienen collider
      if (colliderControlsGroupRef.current) {
        try {
          colliderControlsGroupRef.current.clear();
        } catch (e) {
          // Ignorar errores al limpiar
        }
      }
      return;
    }

    try {
      const group = colliderControlsGroupRef.current;
      if (!group) return;
      
      group.clear();

      // Tamaños de los controles
      const handleSize = 0.3;
      const centerHandleSize = 0.4;
      const center = colliderVisualization.center;
      const halfSize = new THREE.Vector3(
        colliderVisualization.size.x / 2,
        colliderVisualization.size.y / 2,
        colliderVisualization.size.z / 2
      );

      // Color naranja para los controles del collider
      const colliderColor = 0xff6600;

      // Crear esfera central para escalado uniforme del collider
      const centerGeometry = new THREE.SphereGeometry(centerHandleSize, 16, 16);
      const centerMaterial = new THREE.MeshBasicMaterial({ 
        color: colliderColor,
        transparent: true,
        opacity: 0.9,
      });
      const centerHandle = new THREE.Mesh(centerGeometry, centerMaterial);
      centerHandle.userData.isColliderControl = true;
      centerHandle.userData.isHandle = true;
      centerHandle.userData.isCenter = true;
      centerHandle.userData.axis = 'uniform';
      group.add(centerHandle);

      // Crear handles en las esquinas del collider para mejor visibilidad
      // Usar solo las esquinas principales (4 esquinas superiores e inferiores)
      const cornerPositions = [
        { x: -1, y: 1, z: -1 },  // Esquina superior trasera izquierda
        { x: 1, y: 1, z: -1 },   // Esquina superior trasera derecha
        { x: -1, y: 1, z: 1 },   // Esquina superior delantera izquierda
        { x: 1, y: 1, z: 1 },    // Esquina superior delantera derecha
        { x: -1, y: -1, z: -1 }, // Esquina inferior trasera izquierda
        { x: 1, y: -1, z: -1 },  // Esquina inferior trasera derecha
        { x: -1, y: -1, z: 1 },  // Esquina inferior delantera izquierda
        { x: 1, y: -1, z: 1 },   // Esquina inferior delantera derecha
      ];

      cornerPositions.forEach((corner) => {
        // Línea desde el centro hasta la esquina
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            corner.x * halfSize.x * object.scale[0],
            corner.y * halfSize.y * object.scale[1],
            corner.z * halfSize.z * object.scale[2]
          ),
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: colliderColor, 
          linewidth: 2,
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isColliderControl = true;
        group.add(line);

        // Handle en la esquina
        const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
        const handleMaterial = new THREE.MeshBasicMaterial({ 
          color: colliderColor,
          transparent: true,
          opacity: 0.9,
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(
          (center.x + corner.x * halfSize.x) * object.scale[0],
          (center.y + corner.y * halfSize.y) * object.scale[1],
          (center.z + corner.z * halfSize.z) * object.scale[2]
        );
        handle.userData.isColliderControl = true;
        handle.userData.isHandle = true;
        handle.userData.axis = 'uniform';
        group.add(handle);
      });

      return () => {
        if (group) {
          try {
            group.clear();
          } catch (e) {
            // Ignorar errores al limpiar
          }
        }
      };
    } catch (error) {
      console.error('Error creando controles del collider:', error);
    }
  }, [isSelected, object.hasCollider, object.scale, colliderVisualization, transformMode]);

  // Manejar interacción con controles de escalamiento personalizados
  // Usar useThree dentro de un componente interno para evitar problemas de contexto
  const ScaleControlsInteraction = () => {
    const { camera, gl } = useThree();
    
    useEffect(() => {
      if (!isSelected || transformMode !== 'scale' || !scaleControlsGroupRef.current || !groupRef.current || !camera || !gl) {
        return;
      }

      const handleMouseDown = (event) => {
        if (!scaleControlsGroupRef.current || !groupRef.current) return;

        const rect = gl.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(
          scaleControlsGroupRef.current.children,
          true
        );

      if (intersects.length > 0) {
        // Priorizar el cubo central si hay intersección con él
        let selectedIntersect = intersects[0];
        const centerIntersect = intersects.find(int => int.object.userData.isCenter);
        if (centerIntersect) {
          selectedIntersect = centerIntersect;
        } else {
          // Priorizar handles sobre líneas
          const handleIntersect = intersects.find(int => int.object.userData.isHandle);
          if (handleIntersect) {
            selectedIntersect = handleIntersect;
          }
        }

        if (selectedIntersect.object.userData.isControl) {
          event.preventDefault();
          event.stopPropagation();
          activeAxisRef.current = selectedIntersect.object.userData.axis;
          initialScaleRef.current.copy(groupRef.current.scale);
          initialMousePosRef.current.set(event.clientX, event.clientY);
          isTransforming.current = true;
          isDragging.current = true;

          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
          }

          // Marcar este objeto como el que se está transformando
          if (transformingObjectIdRef) {
            transformingObjectIdRef.current = object.id;
          }

          handleDragStart();
        }
      }
    };

    const handleMouseMove = (event) => {
      if (!activeAxisRef.current || !groupRef.current || !isTransforming.current) return;

      // Calcular el movimiento del mouse en la pantalla
      const currentMousePos = new THREE.Vector2(event.clientX, event.clientY);
      const deltaY = initialMousePosRef.current.y - currentMousePos.y; // Invertido: arriba aumenta, abajo disminuye
      
      // Factor de escalamiento basado en el movimiento vertical del mouse
      // Más intuitivo: mover hacia arriba aumenta, mover hacia abajo disminuye
      const sensitivity = 0.01;
      const scaleDelta = deltaY * sensitivity;
      const scaleFactor = 1 + scaleDelta;
      
      const newScale = initialScaleRef.current.clone();
      
      // Escalado proporcional (uniforme) o por eje individual
      if (activeAxisRef.current === 'uniform') {
        // Escalar todos los ejes proporcionalmente
        newScale.multiplyScalar(scaleFactor);
        
        // Aplicar snap si está habilitado
        if (snapEnabled) {
          newScale.x = Math.round(newScale.x / 0.1) * 0.1;
          newScale.y = Math.round(newScale.y / 0.1) * 0.1;
          newScale.z = Math.round(newScale.z / 0.1) * 0.1;
        }
        
        // Limitar escala mínima y máxima (aplicar a todos los ejes)
        const minScale = Math.min(newScale.x, newScale.y, newScale.z);
        const maxScale = Math.max(newScale.x, newScale.y, newScale.z);
        
        if (minScale < 0.1) {
          const factor = 0.1 / minScale;
          newScale.multiplyScalar(factor);
        } else if (maxScale > 10) {
          const factor = 10 / maxScale;
          newScale.multiplyScalar(factor);
        }
      } else {
        // Escalar solo el eje seleccionado
        newScale[activeAxisRef.current] *= scaleFactor;

        // Aplicar snap si está habilitado
        if (snapEnabled) {
          newScale[activeAxisRef.current] = Math.round(newScale[activeAxisRef.current] / 0.1) * 0.1;
        }

        // Limitar escala mínima y máxima
        newScale[activeAxisRef.current] = Math.max(0.1, Math.min(10, newScale[activeAxisRef.current]));
      }

      groupRef.current.scale.set(newScale.x, newScale.y, newScale.z);
      groupRef.current.updateMatrixWorld();

      // Actualizar el estado visualmente (sin actualizar el estado todavía)
      // El estado se actualizará en handleDragEnd
    };

    const handleMouseUp = (event) => {
      if (activeAxisRef.current) {
        // Prevenir el evento click que se disparará después del mouseup
        // Esto evita que el RaycastHandler deseleccione el objeto
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        activeAxisRef.current = null;
        
        // Registrar el tiempo de finalización ANTES de llamar handleDragEnd
        if (lastTransformEndTimeRef) {
          lastTransformEndTimeRef.current = Date.now();
          console.log('[ScaleControls] Transformación terminada, tiempo registrado:', lastTransformEndTimeRef.current);
        }
        
        handleDragEnd();
        
        // Mantener los flags activos por más tiempo para evitar deselección
        // IMPORTANTE: Mantener transformingObjectIdRef activo por más tiempo
        // para que RaycastHandler sepa que este objeto se acaba de transformar
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
        }, 500);

        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
        }
      }
    };

    // Prevenir el evento click después de un arrastre
    const handleClick = (event) => {
      // Si acabamos de terminar un arrastre, prevenir el click
      if (activeAxisRef.current !== null || isTransforming.current || isDragging.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };

      const canvas = gl.domElement;
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('click', handleClick, true); // Usar capture phase para interceptar antes

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('click', handleClick, true);
      };
    }, [isSelected, transformMode, camera, gl, snapEnabled, applyTransformSnap, handleDragStart, handleDragEnd, orbitControlsRef, object.id, transformingObjectIdRef, lastTransformEndTimeRef]);
    
    return null;
  };

  // Manejar interacción con controles del collider
  const ColliderControlsInteraction = () => {
    const { camera, gl } = useThree();
    
    useEffect(() => {
      if (!isSelected || !colliderControlsGroupRef.current || !colliderVisualization || !camera || !gl || transformMode !== 'collider') {
        return;
      }

      const handleMouseDown = (event) => {
        if (!colliderControlsGroupRef.current) return;

        const rect = gl.domElement.getBoundingClientRect();
        colliderMouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        colliderMouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        colliderRaycasterRef.current.setFromCamera(colliderMouseRef.current, camera);
        const intersects = colliderRaycasterRef.current.intersectObjects(
          colliderControlsGroupRef.current.children,
          true
        );

        if (intersects.length > 0) {
          // Priorizar el centro si hay intersección con él
          let selectedIntersect = intersects[0];
          const centerIntersect = intersects.find(int => int.object.userData.isCenter);
          if (centerIntersect) {
            selectedIntersect = centerIntersect;
          } else {
            // Priorizar handles sobre líneas
            const handleIntersect = intersects.find(int => int.object.userData.isHandle);
            if (handleIntersect) {
              selectedIntersect = handleIntersect;
            }
          }

          if (selectedIntersect.object.userData.isColliderControl) {
            event.preventDefault();
            event.stopPropagation();
            
            const currentColliderScale = object.colliderScale || [0.8, 0.8, 0.8];
            // Siempre escala uniforme (todos los controles escalan uniformemente)
            activeColliderAxisRef.current = 'uniform';
            initialColliderScaleRef.current.set(...currentColliderScale);
            initialColliderMousePosRef.current.set(event.clientX, event.clientY);
            isTransforming.current = true;
            isDragging.current = true;

            // Marcar este objeto como el que se está transformando
            if (transformingObjectIdRef) {
              transformingObjectIdRef.current = object.id;
            }

            if (orbitControlsRef.current) {
              orbitControlsRef.current.enabled = false;
            }
          }
        }
      };

      const handleMouseMove = (event) => {
        if (!activeColliderAxisRef.current || !isTransforming.current) return;

        // Calcular el movimiento del mouse en la pantalla
        const currentMousePos = new THREE.Vector2(event.clientX, event.clientY);
        const deltaY = initialColliderMousePosRef.current.y - currentMousePos.y; // Invertido: arriba aumenta, abajo disminuye
        
        // Factor de escalamiento basado en el movimiento vertical del mouse
        const sensitivity = 0.01;
        const scaleDelta = deltaY * sensitivity;
        const scaleFactor = 1 + scaleDelta;
        
        const currentColliderScale = object.colliderScale || [0.8, 0.8, 0.8];
        const newColliderScale = new THREE.Vector3(...currentColliderScale);
        
        // Escalado uniforme (siempre con la esfera central)
        newColliderScale.multiplyScalar(scaleFactor);

        // Limitar escala mínima y máxima
        newColliderScale.x = Math.max(0.1, Math.min(5, newColliderScale.x));
        newColliderScale.y = Math.max(0.1, Math.min(5, newColliderScale.y));
        newColliderScale.z = Math.max(0.1, Math.min(5, newColliderScale.z));

        // Actualizar el estado inmediatamente para ver el cambio visual
        onUpdate({
          colliderScale: [newColliderScale.x, newColliderScale.y, newColliderScale.z],
        });
      };

      const handleMouseUp = (event) => {
        if (activeColliderAxisRef.current) {
          // Prevenir el evento click que se disparará después del mouseup
          // Esto evita que el RaycastHandler deseleccione el objeto
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }
          
          activeColliderAxisRef.current = null;
          
          // Registrar el tiempo de finalización
          if (lastTransformEndTimeRef) {
            lastTransformEndTimeRef.current = Date.now();
            console.log('[ColliderControls] Transformación terminada, tiempo registrado:', lastTransformEndTimeRef.current);
          }
          
          // Mantener los flags activos por más tiempo para evitar deselección
          // IMPORTANTE: Mantener transformingObjectIdRef activo por más tiempo
          // para que RaycastHandler sepa que este objeto se acaba de transformar
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
          }, 500);

          if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
          }
        }
      };

      // Prevenir el evento click después de un arrastre
      const handleClick = (event) => {
        // Si acabamos de terminar un arrastre, prevenir el click
        if (activeColliderAxisRef.current !== null || isTransforming.current || isDragging.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      };

      const canvas = gl.domElement;
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('click', handleClick, true); // Usar capture phase para interceptar antes

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('click', handleClick, true);
      };
    }, [isSelected, object.hasCollider, object.colliderScale, colliderVisualization, camera, gl, onUpdate, orbitControlsRef, transformMode, object.id, transformingObjectIdRef, lastTransformEndTimeRef]);
    
    return null;
  };

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
            console.log('[EditorSceneObject] Ignorando click en grupo - transformación reciente');
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

        {/* Visualización del collider cuando está seleccionado y está en modo collider */}
        {isSelected && colliderVisualization && transformMode === 'collider' && (
          <mesh 
            position={[
              colliderVisualization.center.x * object.scale[0],
              colliderVisualization.center.y * object.scale[1],
              colliderVisualization.center.z * object.scale[2]
            ]}
            frustumCulled={false}
          >
            <boxGeometry 
              args={[
                colliderVisualization.size.x,
                colliderVisualization.size.y,
                colliderVisualization.size.z
              ]} 
            />
            <meshBasicMaterial
              color="#ff6600"
              transparent
              opacity={0.3}
              wireframe={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Componente para manejar interacción con controles de escalamiento */}
      {isSelected && transformMode === 'scale' && <ScaleControlsInteraction />}
      
      {/* Componente para manejar interacción con controles del collider */}
      {isSelected && transformMode === 'collider' && <ColliderControlsInteraction />}
      
      {/* Controles de transformación - usar control personalizado simplificado para scale */}
      {isSelected && groupReadyRef.current && groupRef.current && transformMode === 'scale' && (
        <group 
          ref={scaleControlsGroupRef}
          visible={true}
        />
      )}

      {/* Controles del collider - aparecen cuando está en modo collider */}
      {isSelected && transformMode === 'collider' && groupReadyRef.current && groupRef.current && colliderVisualization && (
        <group 
          ref={colliderControlsGroupRef}
          visible={true}
        />
      )}
      
      {/* TransformControls - solo para translate y rotate (no para scale ni collider) */}
      {isSelected && groupReadyRef.current && groupRef.current && transformMode !== 'scale' && transformMode !== 'collider' && (
        <>
          <TransformControls
            ref={transformRef}
            object={groupRef.current}
            mode={transformMode}
            onObjectChange={handleObjectChange}
            translationSnap={snapEnabled && transformMode === 'translate' ? snapSize : null}
            rotationSnap={snapEnabled && transformMode === 'rotate' ? (Math.PI / 4) : null} // Snap de 45 grados para rotación
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            showX={true}
            showY={true}
            showZ={true}
            space="world" // Usar espacio mundial para mejor control
            size={1.2} // Tamaño ligeramente mayor para mejor visibilidad
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

