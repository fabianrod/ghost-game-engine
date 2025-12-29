import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { CameraControls } from './CameraControls';
import * as THREE from 'three';

/**
 * Componente de cámara configurable similar a Unity
 * Soporta primera persona y tercera persona
 * 
 * @param {Object} props
 * @param {Array<number>} props.position - Posición [x, y, z]
 * @param {Array<number>} props.rotation - Rotación [x, y, z] en grados
 * @param {number} props.fov - Campo de visión en grados (default: 75)
 * @param {number} props.near - Plano cercano (default: 0.1)
 * @param {number} props.far - Plano lejano (default: 1000)
 * @param {string} props.mode - Modo de cámara: 'firstPerson' | 'thirdPerson' | 'free' (default: 'firstPerson')
 * @param {number} props.height - Altura de la cámara desde el suelo (para firstPerson)
 * @param {number} props.distance - Distancia desde el objetivo (para thirdPerson)
 * @param {Array<number>} props.offset - Offset [x, y, z] desde el objetivo (para thirdPerson)
 * @param {string} props.targetId - ID del objeto a seguir (opcional)
 * @param {boolean} props.active - Si la cámara está activa (default: false)
 * @param {boolean} props.showGizmo - Mostrar gizmo visual en el editor (default: true)
 * @param {boolean} props.isEditor - Si está en el editor (desactiva sincronización con cámara principal)
 */
export const CameraComponent = ({
  position = [0, 1.65, 0],
  rotation = [0, 0, 0],
  fov = 75,
  near = 0.1,
  far = 1000,
  mode = 'firstPerson',
  height = 1.65,
  distance = 5,
  offset = [0, 0, 0],
  targetId = null,
  active = false,
  showGizmo = true,
  isEditor = false,
}) => {
  const { camera, scene } = useThree();
  const cameraRef = useRef();
  const targetRef = useRef(null);

  // Convertir rotación de grados a radianes
  const rotationInRadians = rotation.map(deg => (deg * Math.PI) / 180);

  // Buscar el objeto objetivo si se especifica targetId
  useEffect(() => {
    if (targetId) {
      // Buscar el objeto en la escena (con retry para asegurar que esté montado)
      let retryCount = 0;
      const maxRetries = 50; // Aumentar a 5 segundos para dar más tiempo
      
      const findTarget = () => {
        let found = null;
        let rigidBody = null;
        let foundGroup = null;
        const allObjectsWithId = [];
        
        // Buscar en todos los objetos de la escena
        scene.traverse((obj) => {
          // Buscar por objectId en userData
          if (obj.userData?.objectId === targetId) {
            allObjectsWithId.push({
              type: obj.isGroup ? 'Group' : obj.isMesh ? 'Mesh' : 'Other',
              hasTranslation: !!(obj.translation && typeof obj.translation === 'function'),
              hasRigidBodyRef: !!obj.userData?.rigidBodyRef?.current,
              hasPhysics: obj.userData?.hasPhysics,
              position: obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : null
            });
            
            // Si es un RigidBody de Rapier, usarlo directamente (PRIORIDAD MÁXIMA)
            if (obj.translation && typeof obj.translation === 'function') {
              rigidBody = obj;
              found = obj;
            }
            // Si tiene referencia a RigidBody, obtenerla (PRIORIDAD ALTA)
            else if (obj.userData?.hasPhysics && obj.userData?.rigidBodyRef?.current) {
              const rb = obj.userData.rigidBodyRef.current;
              if (rb && rb.translation && typeof rb.translation === 'function') {
                rigidBody = rb;
                found = obj;
              }
            }
            // Si es un grupo o mesh con objectId, guardarlo (PRIORIDAD BAJA)
            else if (obj.isGroup || obj.isMesh) {
              if (!foundGroup) {
                foundGroup = obj;
                found = obj;
              }
            }
          }
        });
        
        // Priorizar RigidBody si existe (para objetos con física)
        // IMPORTANTE: Siempre usar el RigidBody directamente si está disponible
        if (rigidBody) {
          targetRef.current = rigidBody;
        } else if (foundGroup) {
          // Si encontramos un grupo, SIEMPRE intentar obtener su RigidBody
          // Esto es crítico porque el PlayerController mueve el RigidBody, no el grupo
          if (foundGroup.userData?.rigidBodyRef?.current) {
            const rb = foundGroup.userData.rigidBodyRef.current;
            // Verificar que el RigidBody es válido antes de usarlo
            if (rb && rb.translation && typeof rb.translation === 'function') {
              targetRef.current = rb; // Usar el RigidBody directamente
            } else {
              // RigidBody no válido, usar grupo como fallback
              targetRef.current = foundGroup;
            }
          } else {
            // No hay referencia a RigidBody, usar grupo directamente
            targetRef.current = foundGroup;
          }
        } else if (found) {
          targetRef.current = found;
        } else {
          // Retry después de un breve delay si no encontramos el objeto
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(findTarget, 100);
          } else {
            targetRef.current = null;
          }
        }
      };
      
      findTarget();
    } else {
      targetRef.current = null;
    }
  }, [targetId, scene, mode, active]);

  // Estado de movimiento de la cámara (para controles)
  const currentPosition = useRef(new THREE.Vector3(...position));
  const currentRotation = useRef(new THREE.Euler(...rotationInRadians));
  
  // Inicializar posición y rotación cuando cambian las props
  useEffect(() => {
    currentPosition.current.set(...position);
    currentRotation.current.set(...rotationInRadians);
  }, [position, rotationInRadians]);

  // Configurar cámara cuando está activa
  useEffect(() => {
    if (active && cameraRef.current) {
      // Si esta cámara está activa, actualizar la cámara principal
      const cam = cameraRef.current;
      
      // Configurar FOV y planos
      cam.fov = fov;
      cam.near = near;
      cam.far = far;
      cam.updateProjectionMatrix();

      // Configurar posición inicial
      if (mode === 'firstPerson') {
        cam.position.set(position[0], position[1] + height, position[2]);
        currentPosition.current.set(position[0], position[1], position[2]);
      } else if (mode === 'thirdPerson') {
        if (targetRef.current) {
          // Para tercera persona, calcular posición relativa al objetivo
          const targetPos = new THREE.Vector3();
          
          // Obtener posición del objetivo
          if (targetRef.current.translation) {
            const rbPosition = targetRef.current.translation();
            targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
          } else if (targetRef.current.userData?.rigidBodyRef?.current) {
            const rbPosition = targetRef.current.userData.rigidBodyRef.current.translation();
            targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
          } else {
            targetRef.current.getWorldPosition(targetPos);
          }
          
          // Posición de cámara: detrás del objetivo
          // En Three.js, Z negativo es "adelante" por defecto desde la perspectiva del objeto
          // Para tercera persona, queremos que la cámara esté DETRÁS del objetivo mirando hacia él
          // Si el objetivo está en (0,0,0) y mira hacia Z negativo (adelante), 
          // la cámara debe estar en Z positivo (atrás) para verlo desde detrás
          // CORRECCIÓN: Usar +distance para que la cámara esté correctamente detrás (Z positivo)
          cam.position.set(
            targetPos.x + offset[0],
            targetPos.y + offset[1] + height,
            targetPos.z + offset[2] + distance // Detrás del objetivo (Z positivo = atrás)
          );
          
          // Hacer que la cámara mire al objetivo
          cam.lookAt(targetPos);
        } else {
          // Si no hay objetivo, usar posición por defecto (vista desde arriba y atrás)
          cam.position.set(position[0] || 0, (position[1] || 0) + height + 3, (position[2] || 0) - distance);
        }
        currentPosition.current.set(cam.position.x, cam.position.y, cam.position.z);
      } else {
        cam.position.set(...position);
        currentPosition.current.set(...position);
      }

      // Configurar rotación
      cam.rotation.set(...rotationInRadians);
      cam.rotation.order = 'YXZ';
      currentRotation.current.set(...rotationInRadians);
      
      // Marcar esta cámara como activa en userData para que DefaultCameraSetup la detecte
      cam.userData.isActiveCamera = true;
      
      // Sincronizar con la cámara principal inmediatamente
      camera.position.copy(cam.position);
      camera.rotation.copy(cam.rotation);
      camera.fov = cam.fov;
      camera.near = cam.near;
      camera.far = cam.far;
      camera.updateProjectionMatrix();
    }
  }, [active, fov, near, far, mode, position, rotationInRadians, height, distance, offset, camera, targetRef]);

  // Debug: contador de frames para logs periódicos
  const debugFrameCount = useRef(0);
  const lastTargetPos = useRef(new THREE.Vector3());
  const lastCameraPos = useRef(new THREE.Vector3());

  // Actualizar cámara principal cada frame si está activa
  // IMPORTANTE: No sincronizar si está en el editor para no interferir con OrbitControls
  // Los controles de movimiento se manejan en CameraControls (solo en modo juego)
  useFrame(() => {
    if (!active || !cameraRef.current || isEditor) return;

    const cam = cameraRef.current;
    debugFrameCount.current++;
    
    // Si estamos en modo juego y hay controles, CameraControls manejará el movimiento
    // Aquí solo manejamos thirdPerson que no necesita controles de movimiento
    if (mode === 'thirdPerson') {
      if (targetRef.current) {
        // Tercera persona: la cámara sigue al objetivo
        const targetPos = new THREE.Vector3();
        let targetType = 'unknown';
        
        // Obtener posición del objetivo
        try {
          // PRIORIDAD 1: Si es un RigidBody directo (mejor caso)
          if (targetRef.current.translation && typeof targetRef.current.translation === 'function') {
            // Es un RigidBody de Rapier - obtener posición directamente
            const rbPosition = targetRef.current.translation();
            targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
            targetType = 'RigidBody';
          } 
          // PRIORIDAD 2: Si tiene referencia a RigidBody en userData
          else if (targetRef.current.userData?.rigidBodyRef?.current) {
            // Tiene referencia a RigidBody - obtener posición del RigidBody
            const rb = targetRef.current.userData.rigidBodyRef.current;
            if (rb && rb.translation && typeof rb.translation === 'function') {
              const rbPosition = rb.translation();
              targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
              targetType = 'GroupWithRigidBody';
            } else {
              // Fallback: usar posición del grupo (no ideal, pero funcional)
              targetRef.current.getWorldPosition(targetPos);
              targetType = 'GroupFallback';
            }
          } 
          // PRIORIDAD 3: Si es un objeto Three.js normal (sin física)
          else {
            // Es un objeto Three.js normal - obtener posición mundial
            // IMPORTANTE: Para grupos con PlayerController sin física, necesitamos
            // actualizar la matriz del mundo antes de obtener la posición
            if (targetRef.current.isObject3D) {
              // Actualizar la matriz del mundo para asegurar que la posición esté actualizada
              targetRef.current.updateMatrixWorld(true);
              // Obtener posición mundial
              targetRef.current.getWorldPosition(targetPos);
              targetType = 'ThreeObject';
            } else {
              // Fallback: intentar obtener posición de otra manera
              if (targetRef.current.position) {
                targetPos.set(
                  targetRef.current.position.x,
                  targetRef.current.position.y,
                  targetRef.current.position.z
                );
              }
              targetType = 'ThreeObjectFallback';
            }
          }
          
          
          lastTargetPos.current.copy(targetPos);
          
          // Calcular posición de la cámara (detrás y arriba del objetivo)
          // En Three.js, Z negativo es "adelante" por defecto desde la perspectiva del objeto
          // Para tercera persona, queremos que la cámara esté DETRÁS del objetivo mirando hacia él
          // Si el objetivo está en (0,0,0) y mira hacia Z negativo (adelante),
          // la cámara debe estar en Z positivo (atrás) para verlo desde detrás
          // CORRECCIÓN: Usar +distance para que la cámara esté correctamente detrás (Z positivo)
          const cameraPos = new THREE.Vector3(
            targetPos.x + offset[0],
            targetPos.y + offset[1] + height,
            targetPos.z + offset[2] + distance // Detrás del objetivo (Z positivo = atrás)
          );
          
          // Aplicar suavizado (lerp) para movimiento más suave de la cámara
          const lerpFactor = 0.1; // Factor de interpolación (0.1 = 10% por frame)
          cam.position.lerp(cameraPos, lerpFactor);
          
          lastCameraPos.current.copy(cameraPos);
          
          // Hacer que la cámara mire al objetivo (con suavizado también)
          const lookAtTarget = new THREE.Vector3();
          lookAtTarget.lerp(targetPos, lerpFactor);
          cam.lookAt(targetPos); // Mirar directamente al objetivo (sin suavizado en lookAt para mejor respuesta)
        } catch (error) {
          // Si hay error, intentar re-buscar el objetivo
          if (targetId) {
            // Forzar re-búsqueda del objetivo en el siguiente frame
            targetRef.current = null;
          }
        }
      } else if (targetId) {
        // Si hay targetId pero no se encontró el objetivo, intentar buscarlo de nuevo
        // Esto puede pasar si el objeto se carga después de la cámara
        // (solo hacer esto ocasionalmente para no saturar)
        if (Math.random() < 0.01) { // 1% de probabilidad por frame
          // Re-buscar el objetivo
          scene.traverse((obj) => {
            if (obj.userData?.objectId === targetId) {
              if (obj.translation && typeof obj.translation === 'function') {
                targetRef.current = obj;
              } else if (obj.userData?.rigidBodyRef?.current) {
                targetRef.current = obj.userData.rigidBodyRef.current;
              } else if (obj.isGroup || obj.isMesh) {
                targetRef.current = obj;
              }
            }
          });
        }
      }
      
      // Sincronizar con la cámara principal
      camera.position.copy(cam.position);
      camera.rotation.copy(cam.rotation);
      camera.fov = cam.fov;
      camera.near = cam.near;
      camera.far = cam.far;
      camera.updateProjectionMatrix();
    }
    // firstPerson y free se manejan en CameraControls
  });

  return (
    <group>
      {/* Cámara configurable */}
      {/* IMPORTANTE: makeDefault solo debe ser true si está activa Y no es del editor */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault={active && !isEditor}
        fov={fov}
        near={near}
        far={far}
        position={position}
        rotation={rotationInRadians}
      />
      
      {/* Controles de movimiento (solo en modo juego, no en editor) */}
      {active && !isEditor && (mode === 'firstPerson' || mode === 'free') && (
        <CameraControls
          cameraRef={cameraRef}
          mode={mode}
          height={height}
          currentPosition={currentPosition}
          currentRotation={currentRotation}
          active={active}
        />
      )}

      {/* Gizmo visual en el editor */}
      {/* IMPORTANTE: El gizmo NO debe tener position/rotation propios cuando está en el editor
          porque el grupo padre (EditorCameraObject) ya maneja la posición/rotación.
          Si está en el editor, el gizmo debe estar en posición [0,0,0] relativo al grupo padre. */}
      {showGizmo && (
        <group rotation={isEditor ? [0, 0, 0] : rotationInRadians}>
          {/* Frustum de la cámara (cono de visión) */}
          <mesh>
            <coneGeometry args={[0.5, 1, 8]} />
            <meshBasicMaterial
              color={active ? "#00ff00" : "#00aaff"}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              wireframe
            />
          </mesh>
          
          {/* Indicador de dirección - usar ArrowHelper de drei */}
          <mesh position={[0, 0, -1]}>
            <coneGeometry args={[0.05, 0.2, 8]} />
            <meshBasicMaterial color={active ? "#00ff00" : "#00aaff"} />
          </mesh>
          
          {/* Esfera en la posición de la cámara */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial
              color={active ? "#00ff00" : "#00aaff"}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
