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

  // Ref para rastrear si hay un arrastre activo (para evitar deselección durante arrastre)
  const isDraggingRef = useRef(false);
  const mouseDownTimeRef = useRef(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  
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
        // Delay corto para evitar que el click del mouseUp deseleccione
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      } else {
        // Si no hubo arrastre, resetear inmediatamente
        isDraggingRef.current = false;
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

      // Si no se clickeó ningún objeto, deseleccionar (solo si no hubo arrastre)
      if (!isDraggingRef.current) {
        onSelectObject(null);
      }
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
  const modelOffset = useMemo(() => {
    if (!clonedModelScene) return 0;
    try {
      // Calcular bounding box del modelo original (sin transformaciones)
      const box = new THREE.Box3().setFromObject(clonedModelScene);
      const minY = box.min.y;
      // Calcular el offset Y necesario para que el objeto esté sobre el terreno (Y=0)
      // Similar a cómo SceneObject calcula: position[1] - minY * scale[1]
      const offset = -minY * object.scale[1];
      console.log(`[Editor] Offset calculado (modelo original): minY=${minY.toFixed(3)}, scale=${object.scale[1]}, offset=${offset.toFixed(3)}`);
      return offset;
    } catch (error) {
      console.warn('Error calculando bounding box:', error);
      return 0;
    }
  }, [clonedModelScene, object.scale]); // Solo recalcular cuando cambia el modelo o escala
  
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
    
    // Forzar posición Y durante arrastre horizontal para evitar que se hunda
    if (isTransforming.current && minYOffsetRef.current !== 0 && offsetCalculatedRef.current) {
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
    // Durante el arrastre, TransformControls maneja la posición directamente
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
  }, [orbitControlsRef]);

  const handleDragEnd = useCallback(() => {
    isTransforming.current = false;
    
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

      // Actualizar estado UNA SOLA VEZ al finalizar drag
      // Usar requestAnimationFrame para evitar que el RaycastHandler deseleccione
      requestAnimationFrame(() => {
        onUpdate({
          position: [position.x, position.y, position.z],
          rotation: rotationDegrees,
          scale: [scale.x, scale.y, scale.z],
        });
      });
      
      // Actualizar cache inmediatamente para evitar parpadeo
      lastPositionRef.current.set(position.x, position.y, position.z);
      lastRotationRef.current.set(rotation.x, rotation.y, rotation.z);
      lastScaleRef.current.set(scale.x, scale.y, scale.z);
    } else if (pendingUpdateRef.current) {
      // Si no hay groupRef pero hay datos pendientes, actualizar con esos datos
      requestAnimationFrame(() => {
        onUpdate(pendingUpdateRef.current);
      });
    }
    
    pendingUpdateRef.current = null;
    
    // Marcar como no arrastrando DESPUÉS de un pequeño delay para evitar deselección
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
    
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
      {isSelected && groupReadyRef.current && groupRef.current && (
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

