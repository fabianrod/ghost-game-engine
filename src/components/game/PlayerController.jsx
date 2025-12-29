import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { usePlayerControls } from '../../hooks/usePlayerControls';
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
  const velocity = useRef(new THREE.Vector3());
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
          
          // Asegurar que el RigidBody esté en la posición inicial correcta
          rigidBodyRef.current.setTranslation(initialPos);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 });
          
          // Asegurar que la rotación inicial sea [0, 0, 0] (sin voltearse)
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
          
          // Activar gravedad después de establecer la posición
          if (rigidBodyRef.current.setGravityScale) {
            rigidBodyRef.current.setGravityScale(1);
          }
          
          currentPosition.current.copy(initialPos);
          currentRotation.current.set(0, 0, 0); // Rotación inicial en 0
          initialized.current = true;
        }
      }, 0); // Ejecutar inmediatamente en el siguiente tick
      
      return () => clearTimeout(initTimer);
    } else if (!usePhysics) {
      currentPosition.current.set(...initialPosition);
      currentRotation.current.set(0, 0, 0); // Rotación inicial en 0
      initialized.current = true;
    }
  }, [initialPosition, usePhysics, rigidBodyRef]);

  // Detectar si está en el suelo usando raycasting (simplificado por ahora)
  const checkGrounded = () => {
    if (!usePhysics || !rigidBodyRef?.current) {
      isGrounded.current = false;
      return false;
    }
    
    // Por ahora, simplemente verificar si la velocidad Y es cercana a 0
    // Esto indica que está en el suelo o cayendo lentamente
    const currentVel = rigidBodyRef.current.linvel();
    isGrounded.current = Math.abs(currentVel.y) < 0.1;
    
    return isGrounded.current;
  };
  
  // Debug: contador de frames para logs periódicos
  const debugFrameCount = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());

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
    
    // Actualizar rotación con el mouse (solo si está bloqueado)
    if (mouse.current && mouse.current.isLocked) {
      currentRotation.current.y = mouse.current.x;
      currentRotation.current.x = mouse.current.y;
      // Limitar rotación vertical
      currentRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentRotation.current.x));
    }
    
    // Calcular dirección de movimiento basada en la rotación
    const frontVector = new THREE.Vector3(0, 0, -1);
    const sideVector = new THREE.Vector3(1, 0, 0);
    
    // Aplicar rotación Y (horizontal) a los vectores de dirección
    frontVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.current.y);
    sideVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.current.y);
    
    // Calcular velocidad de movimiento
    velocity.current.set(0, 0, 0);
    
    if (forward) velocity.current.add(frontVector);
    if (backward) velocity.current.sub(frontVector);
    if (left) velocity.current.sub(sideVector);
    if (right) velocity.current.add(sideVector);
    
    // Normalizar y calcular dirección de movimiento
    let moveDirection = new THREE.Vector3();
    if (velocity.current.length() > 0) {
      moveDirection = velocity.current.clone().normalize();
    }
    
    // Aplicar movimiento según el modo
    if (usePhysics && rigidBodyRef && rigidBodyRef.current) {
      // Usar física: aplicar velocidad al RigidBody (Character Controller style)
      const currentVel = rigidBodyRef.current.linvel();
      
      // Calcular velocidad horizontal (X y Z) basada en la dirección de movimiento
      // setLinvel espera velocidad en unidades/segundo, no distancia
      const horizontalVelocity = new THREE.Vector3(
        moveDirection.x * speed,
        0,
        moveDirection.z * speed
      );
      
      // IMPORTANTE: Aplicar velocidad CADA FRAME, incluso si no hay input
      // Esto asegura que el RigidBody mantenga la velocidad deseada y no sea afectado por fricción
      // Si no hay input, establecer velocidad en 0 para detener el movimiento
      rigidBodyRef.current.setLinvel({
        x: horizontalVelocity.x,
        y: currentVel.y, // Mantener velocidad Y (gravedad/salto)
        z: horizontalVelocity.z,
      });
      
      
      // Actualizar posición actual desde el RigidBody para mantener sincronización
      const rbPosition = rigidBodyRef.current.translation();
      currentPosition.current.set(rbPosition.x, rbPosition.y, rbPosition.z);
      
      // Aplicar rotación al objeto (solo Y) - rotar el grupo interno
      if (objectRef.current) {
        objectRef.current.rotation.y = currentRotation.current.y;
      }
    } else {
      // Movimiento directo: actualizar posición del objeto
      // Multiplicar velocidad por delta para movimiento suave
      const moveDelta = velocity.current.clone().normalize().multiplyScalar(speed * delta);
      currentPosition.current.add(moveDelta);
      
      if (objectRef.current) {
        objectRef.current.position.copy(currentPosition.current);
        
        // Aplicar rotación al objeto
        objectRef.current.rotation.y = currentRotation.current.y;
      }
    }
  });

  return null; // Este componente no renderiza nada
};

