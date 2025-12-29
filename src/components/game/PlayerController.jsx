import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { usePlayerControls } from '../../hooks/usePlayerControls';
import { PHYSICS_CONFIG } from '../../constants/gameConstants';
import * as THREE from 'three';

/**
 * Componente Player Controller que permite mover un objeto con WASD
 * Similar a Unity's Character Controller
 * Implementa mejores prácticas: física correcta, posicionamiento sobre terreno, gravedad
 * 
 * @param {Object} props
 * @param {Object} props.objectRef - Ref al objeto 3D a mover
 * @param {Array<number>} props.initialPosition - Posición inicial absoluta [x, y, z]
 * @param {number} props.speed - Velocidad de movimiento (default: 5)
 * @param {boolean} props.enabled - Si el controlador está activo (default: true)
 * @param {boolean} props.usePhysics - Si usar física (RigidBody) o movimiento directo (default: false)
 * @param {Object} props.rigidBodyRef - Ref al RigidBody si usePhysics es true
 * @param {Object} props.boundingBox - BoundingBox del modelo para calcular altura
 * @param {Array<number>} props.scale - Escala del modelo [x, y, z]
 */
export const PlayerController = ({
  objectRef,
  initialPosition = [0, 0, 0],
  speed = 5,
  enabled = true,
  usePhysics = false,
  rigidBodyRef = null,
  boundingBox = null,
  scale = [1, 1, 1],
}) => {
  const { camera, scene } = useThree();
  
  // Obtener controles de teclado y mouse
  const [, get] = useKeyboardControls();
  const { mouse } = usePlayerControls();
  
  const currentPosition = useRef(new THREE.Vector3(...initialPosition));
  const currentRotation = useRef(new THREE.Euler(0, 0, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0)); // Inicializar velocidad Y a 0
  const isGrounded = useRef(false);
  const initialized = useRef(false);
  
  // Calcular altura del objeto (desde el centro del bounding box hasta la base)
  const objectHeight = useRef(0);
  useEffect(() => {
    if (boundingBox) {
      const size = boundingBox.getSize(new THREE.Vector3());
      objectHeight.current = size.y * scale[1] / 2; // Mitad de la altura total
    }
  }, [boundingBox, scale]);
  
  // Inicializar posición desde el RigidBody si usa física
  useEffect(() => {
    if (usePhysics && rigidBodyRef && rigidBodyRef.current && !initialized.current) {
      // Establecer posición inmediatamente (sin delay) para evitar que la gravedad lo mueva
      const initTimer = setTimeout(() => {
        if (rigidBodyRef.current) {
          const initialPos = new THREE.Vector3(...initialPosition);
          
          // LOG: Estado inicial ANTES de cualquier modificación
          const rbBefore = rigidBodyRef.current;
          const posBefore = rbBefore.translation();
          const velBefore = rbBefore.linvel();
          const gravityScaleBefore = rbBefore.gravityScale ? rbBefore.gravityScale() : 'N/A';
          const bodyType = rbBefore.bodyType ? rbBefore.bodyType() : 'N/A';
          
          // Guardar estado inicial para comparación
          initialRigidBodyState.current = {
            position: { x: posBefore.x, y: posBefore.y, z: posBefore.z },
            velocity: { x: velBefore.x, y: velBefore.y, z: velBefore.z },
            gravityScale: gravityScaleBefore,
            bodyType: bodyType
          };
          
          // Asegurar que el RigidBody esté en la posición inicial correcta
          rigidBodyRef.current.setTranslation(initialPos);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 });
          
          // Asegurar que la rotación inicial sea [0, 0, 0] (sin voltearse)
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
          
          // NOTA: Con kinematicPositionBased, la gravedad se aplica manualmente
          // No necesitamos activar setGravityScale ya que kinematicPositionBased no responde a gravedad del motor
          gravityActivated.current = true;
          
          currentPosition.current.copy(initialPos);
          currentRotation.current.set(0, 0, 0); // Rotación inicial en 0
          initialized.current = true;
          
          // Inicializar lastPosition y lastVelocityY para cálculos de deltaY
          const posFinal = rigidBodyRef.current.translation();
          lastPosition.current.copy(posFinal);
          // Inicializar velocidad Y interna a 0 (no usar velFinal.y porque kinematicPositionBased no es confiable)
          velocity.current.y = 0;
          lastVelocityY.current = 0;
        }
      }, 0); // Ejecutar inmediatamente en el siguiente tick
      
      return () => clearTimeout(initTimer);
    } else if (!usePhysics) {
      currentPosition.current.set(...initialPosition);
      currentRotation.current.set(0, 0, 0); // Rotación inicial en 0
      initialized.current = true;
    }
  }, [initialPosition, usePhysics, rigidBodyRef, enabled]);

  // Detectar si está en el suelo usando raycasting
  const checkGrounded = () => {
    if (!usePhysics || !rigidBodyRef?.current) {
      isGrounded.current = false;
      return false;
    }
    
    const currentVel = rigidBodyRef.current.linvel();
    const rbPosition = rigidBodyRef.current.translation();
    
    // Lanzar un rayo hacia abajo desde la posición actual para detectar suelo
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3(rbPosition.x, rbPosition.y, rbPosition.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    raycaster.set(rayOrigin, rayDirection);
    
    // Distancia máxima para considerar que está en el suelo (ajustar según el tamaño del objeto)
    const groundCheckDistance = objectHeight.current > 0 ? objectHeight.current * 1.5 : 0.5;
    
    // Buscar intersecciones con objetos de la escena (excluyendo el propio objeto)
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validHits = intersects.filter(intersect => {
      return !intersect.object.userData?.isPlayer && intersect.distance < groundCheckDistance;
    });
    
    // Si hay un hit válido y la velocidad Y es cercana a 0 o negativa, está en el suelo
    if (validHits.length > 0) {
      const closestHit = validHits[0];
      // Está en el suelo si la distancia es pequeña y la velocidad Y es <= 0.1
      isGrounded.current = closestHit.distance < groundCheckDistance && currentVel.y <= 0.1;
    } else {
      // Si no hay hit, verificar solo por velocidad (fallback)
      isGrounded.current = Math.abs(currentVel.y) < 0.1 && currentVel.y <= 0;
    }
    
    return isGrounded.current;
  };
  
  // Debug: contador de frames para logs periódicos
  const debugFrameCount = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());
  const lastVelocityY = useRef(0);
  const debugLogInterval = useRef(0);
  const gravityActivated = useRef(false);
  const initialRigidBodyState = useRef(null);
  const lastEnabledState = useRef(enabled);

  // Log cuando cambia el estado enabled (modo juego activado/desactivado)
  useEffect(() => {
    if (lastEnabledState.current !== enabled) {
      lastEnabledState.current = enabled;
    }
  }, [enabled, usePhysics, rigidBodyRef]);

  // Manejar movimiento cada frame
  useFrame((state, delta) => {
    if (!enabled || !initialized.current) return;
    
    // Si usa física, verificar que el RigidBody exista
    if (usePhysics && (!rigidBodyRef || !rigidBodyRef.current)) {
      return;
    }
    
    // Si no usa física, verificar que el objectRef exista
    if (!usePhysics && !objectRef.current) {
      return;
    }
    
    // Verificar si está en el suelo
    if (usePhysics) {
      checkGrounded();
    }

    // Leer controles de teclado
    const keyboardState = get();
    const forward = keyboardState.forward || false;
    const backward = keyboardState.backward || false;
    const left = keyboardState.left || false;
    const right = keyboardState.right || false;
    const jump = keyboardState.jump || false;
    
    debugFrameCount.current++;
    
    // Actualizar rotación con el mouse
    if (mouse.current) {
      // Actualizar rotación con el mouse (funciona incluso sin pointer lock para tercera persona)
      // En tercera persona, el mouse debería funcionar sin pointer lock
      if (mouse.current.isLocked) {
        // Pointer lock activo: usar valores del mouse directamente
        currentRotation.current.y = mouse.current.x;
        currentRotation.current.x = mouse.current.y;
        // Limitar rotación vertical
        currentRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentRotation.current.x));
      } else {
        // Pointer lock no activo: aún así intentar usar el mouse si tiene valores
        // Esto permite que funcione en tercera persona sin necesidad de pointer lock
        if (mouse.current.x !== 0 || mouse.current.y !== 0) {
          currentRotation.current.y = mouse.current.x;
          // En tercera persona, no necesitamos rotación vertical del personaje
          // Solo rotación horizontal (Y)
        }
      }
    }
    
    // Calcular dirección de movimiento basada en la rotación
    const frontVector = new THREE.Vector3(0, 0, -1);
    const sideVector = new THREE.Vector3(1, 0, 0);
    
    // Aplicar rotación Y (horizontal) a los vectores de dirección
    frontVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.current.y);
    sideVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.current.y);
    
    // Calcular velocidad de movimiento horizontal (NO resetear velocidad Y)
    const horizontalVelocity = new THREE.Vector3(0, 0, 0);
    
    if (forward) horizontalVelocity.add(frontVector);
    if (backward) horizontalVelocity.sub(frontVector);
    if (left) horizontalVelocity.sub(sideVector);
    if (right) horizontalVelocity.add(sideVector);
    
    // Normalizar y calcular dirección de movimiento horizontal
    let moveDirection = new THREE.Vector3();
    if (horizontalVelocity.length() > 0) {
      moveDirection = horizontalVelocity.clone().normalize();
    }
    
    // Aplicar movimiento según el modo
    if (usePhysics && rigidBodyRef && rigidBodyRef.current) {
      // Con kinematicPositionBased, NO leer velocidad del RigidBody (no es confiable)
      // Usar solo nuestra velocidad interna
      const rbPosition = rigidBodyRef.current.translation();
      
      // LOG: Detectar cambios significativos en posición Y (flotación)
      const deltaY = rbPosition.y - lastPosition.current.y;
      const deltaVelY = velocity.current.y - lastVelocityY.current;
      
      
      // Con kinematicPositionBased, debemos usar setTranslation en lugar de setLinvel
      // Calcular movimiento horizontal basado en la dirección y velocidad
      const horizontalMovement = new THREE.Vector3(
        moveDirection.x * speed * delta,
        0,
        moveDirection.z * speed * delta
      );
      
      // GRAVEDAD MANUAL: Aplicar gravedad solo cuando no está en el suelo
      // Con kinematicPositionBased, debemos aplicar gravedad manualmente usando setTranslation
      let verticalMovement = 0;
      
      // Actualizar velocidad Y interna para tracking
      if (isGrounded.current) {
        // Si está en el suelo y no está saltando, mantener velocidad Y en 0
        if (!jump && velocity.current.y <= 0) {
          velocity.current.y = 0;
        }
      } else {
        // Si no está en el suelo, aplicar gravedad manualmente
        velocity.current.y -= PHYSICS_CONFIG.GRAVITY_STRENGTH * delta;
      }
      
      // Manejar salto: aplicar fuerza de salto cuando se presiona la tecla y está en el suelo
      if (jump && isGrounded.current && velocity.current.y <= 0) {
        // Fuerza de salto (ajustar según necesidad, típicamente 5-8 unidades/segundo)
        velocity.current.y = 5; // Valor de salto razonable
      }
      
      // Limitar velocidad Y hacia abajo para evitar caídas infinitamente rápidas
      const MAX_FALL_VELOCITY = -20; // Velocidad máxima de caída
      velocity.current.y = Math.max(MAX_FALL_VELOCITY, velocity.current.y);
      
      // Calcular movimiento vertical basado en la velocidad Y
      verticalMovement = velocity.current.y * delta;
      
      // Calcular nueva posición
      const newPosition = new THREE.Vector3(
        rbPosition.x + horizontalMovement.x,
        rbPosition.y + verticalMovement,
        rbPosition.z + horizontalMovement.z
      );
      
      // IMPORTANTE: Con kinematicPositionBased, usar setTranslation para mover el objeto
      // Esto nos da control total sobre la posición
      rigidBodyRef.current.setTranslation(newPosition);
      
      // Actualizar posición actual desde el RigidBody para mantener sincronización
      // Leer la posición REAL después de setTranslation para asegurar que se aplicó correctamente
      const actualPosition = rigidBodyRef.current.translation();
      currentPosition.current.copy(actualPosition);
      
      // Actualizar referencias para el próximo frame
      // Usar la posición REAL del RigidBody, no la calculada (por si hay algún ajuste)
      lastPosition.current.copy(actualPosition);
      lastVelocityY.current = velocity.current.y;
      
      // Aplicar rotación al objeto (solo Y) - rotar el grupo interno
      if (objectRef.current) {
        objectRef.current.rotation.y = currentRotation.current.y;
      }
    } else {
      // Movimiento directo: actualizar posición del objeto sin física
      // Calcular dirección de movimiento horizontal
      const horizontalVelocity = new THREE.Vector3(0, 0, 0);
      
      if (forward) horizontalVelocity.add(frontVector);
      if (backward) horizontalVelocity.sub(frontVector);
      if (left) horizontalVelocity.sub(sideVector);
      if (right) horizontalVelocity.add(sideVector);
      
      // Normalizar y calcular movimiento horizontal
      let moveDirection = new THREE.Vector3();
      if (horizontalVelocity.length() > 0) {
        moveDirection = horizontalVelocity.clone().normalize();
      }
      
      // Calcular movimiento horizontal
      const horizontalMovement = moveDirection.multiplyScalar(speed * delta);
      
      // Aplicar gravedad manualmente también en modo sin física
      if (isGrounded.current) {
        // Si está en el suelo y no está saltando, mantener velocidad Y en 0
        if (!jump && velocity.current.y <= 0) {
          velocity.current.y = 0;
        }
      } else {
        // Si no está en el suelo, aplicar gravedad manualmente
        velocity.current.y -= PHYSICS_CONFIG.GRAVITY_STRENGTH * delta;
      }
      
      // Manejar salto
      if (jump && isGrounded.current && velocity.current.y <= 0) {
        velocity.current.y = 5; // Fuerza de salto
      }
      
      // Limitar velocidad Y hacia abajo
      const MAX_FALL_VELOCITY = -20;
      velocity.current.y = Math.max(MAX_FALL_VELOCITY, velocity.current.y);
      
      // Calcular movimiento vertical
      const verticalMovement = velocity.current.y * delta;
      
      // Actualizar posición
      currentPosition.current.x += horizontalMovement.x;
      currentPosition.current.y += verticalMovement;
      currentPosition.current.z += horizontalMovement.z;
      
      // Detectar suelo con raycasting simple (para modo sin física)
      if (objectRef.current) {
        const raycaster = new THREE.Raycaster();
        const rayOrigin = new THREE.Vector3(
          currentPosition.current.x,
          currentPosition.current.y + 0.1,
          currentPosition.current.z
        );
        const rayDirection = new THREE.Vector3(0, -1, 0);
        raycaster.set(rayOrigin, rayDirection);
        
        const groundCheckDistance = objectHeight.current > 0 ? objectHeight.current * 1.5 : 0.5;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const validHits = intersects.filter(intersect => {
          return !intersect.object.userData?.isPlayer && intersect.distance < groundCheckDistance;
        });
        
        if (validHits.length > 0) {
          const closestHit = validHits[0];
          isGrounded.current = closestHit.distance < groundCheckDistance && velocity.current.y <= 0.1;
        } else {
          isGrounded.current = Math.abs(velocity.current.y) < 0.1 && velocity.current.y <= 0;
        }
      }
      
      // Aplicar posición al objeto
      if (objectRef.current) {
        objectRef.current.position.copy(currentPosition.current);
        
        // Aplicar rotación al objeto
        objectRef.current.rotation.y = currentRotation.current.y;
      }
    }
  });

  return null; // Este componente no renderiza nada
};

