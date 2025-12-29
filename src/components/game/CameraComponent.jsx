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
      const maxRetries = 30; // Intentar hasta 3 segundos
      
      const findTarget = () => {
        let found = null;
        let rigidBody = null;
        
        // Buscar en todos los objetos de la escena
        scene.traverse((obj) => {
          if (obj.userData?.objectId === targetId) {
            // Si es un RigidBody de Rapier, usarlo directamente
            if (obj.translation && typeof obj.translation === 'function') {
              rigidBody = obj;
            }
            // Si tiene referencia a RigidBody, obtenerla
            else if (obj.userData?.hasPhysics && obj.userData?.rigidBodyRef?.current) {
              rigidBody = obj.userData.rigidBodyRef.current;
            }
            found = obj;
          }
        });
        
        // Priorizar RigidBody si existe (para objetos con física)
        if (rigidBody) {
          targetRef.current = rigidBody;
        } else if (found) {
          targetRef.current = found;
        } else {
          // Retry después de un breve delay si no encontramos el objeto
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(findTarget, 100);
          } else {
            console.warn('[CameraComponent] No se pudo encontrar el objetivo:', targetId);
            targetRef.current = null;
          }
        }
      };
      
      findTarget();
    } else {
      targetRef.current = null;
    }
  }, [targetId, scene]);

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
          
          // Posición de cámara: detrás del objetivo (offset Z negativo = detrás)
          cam.position.set(
            targetPos.x + offset[0],
            targetPos.y + offset[1] + height,
            targetPos.z + offset[2] - distance // Detrás del objetivo
          );
          
          // Hacer que la cámara mire al objetivo
          cam.lookAt(targetPos);
        } else {
          // Si no hay objetivo, usar posición por defecto (vista desde arriba y atrás)
          cam.position.set(position[0] || 0, (position[1] || 0) + height + 3, (position[2] || 0) - distance);
          console.warn('[CameraComponent] Cámara de tercera persona sin objetivo configurado. Usando posición por defecto.');
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

  // Actualizar cámara principal cada frame si está activa
  // IMPORTANTE: No sincronizar si está en el editor para no interferir con OrbitControls
  // Los controles de movimiento se manejan en CameraControls (solo en modo juego)
  useFrame(() => {
    if (!active || !cameraRef.current || isEditor) return;

    const cam = cameraRef.current;
    
    // Si estamos en modo juego y hay controles, CameraControls manejará el movimiento
    // Aquí solo manejamos thirdPerson que no necesita controles de movimiento
    if (mode === 'thirdPerson') {
      if (targetRef.current) {
        // Tercera persona: la cámara sigue al objetivo
        const targetPos = new THREE.Vector3();
        
        // Obtener posición del objetivo
        if (targetRef.current.translation) {
          // Es un RigidBody de Rapier - obtener posición directamente
          const rbPosition = targetRef.current.translation();
          targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
        } else if (targetRef.current.userData?.rigidBodyRef?.current) {
          // Tiene referencia a RigidBody - obtener posición del RigidBody
          const rbPosition = targetRef.current.userData.rigidBodyRef.current.translation();
          targetPos.set(rbPosition.x, rbPosition.y, rbPosition.z);
        } else {
          // Es un objeto Three.js normal - obtener posición mundial
          targetRef.current.getWorldPosition(targetPos);
        }
        
        // Calcular posición de la cámara (detrás y arriba del objetivo)
        // offset[2] negativo = detrás, positivo = delante
        const cameraPos = new THREE.Vector3(
          targetPos.x + offset[0],
          targetPos.y + offset[1] + height,
          targetPos.z + offset[2] - distance // Detrás del objetivo (Z negativo)
        );
        
        cam.position.copy(cameraPos);
        
        // Hacer que la cámara mire al objetivo
        cam.lookAt(targetPos);
      } else {
        // Si no hay objetivo, mantener posición actual o usar posición por defecto
        // No hacer nada, mantener la posición actual
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
