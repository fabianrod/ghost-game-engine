import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { usePlayerControls } from '../../hooks/usePlayerControls';
import * as THREE from 'three';

/**
 * Componente que maneja los controles de movimiento para una cámara activa
 * Solo funciona cuando hay KeyboardControls provider (modo juego)
 * 
 * @param {Object} props
 * @param {Object} props.cameraRef - Ref a la cámara a controlar
 * @param {string} props.mode - Modo de cámara: 'firstPerson' | 'thirdPerson' | 'free'
 * @param {number} props.height - Altura de la cámara desde el suelo
 * @param {Object} props.currentPosition - Ref a la posición actual
 * @param {Object} props.currentRotation - Ref a la rotación actual
 * @param {boolean} props.active - Si la cámara está activa
 */
export const CameraControls = ({
  cameraRef,
  mode,
  height,
  currentPosition,
  currentRotation,
  active,
}) => {
  const { camera } = useThree();
  
  // Obtener controles de teclado y mouse
  // Estos hooks solo funcionan si hay KeyboardControls provider
  const [, get] = useKeyboardControls();
  const { mouse } = usePlayerControls();
  
  const velocity = useRef(new THREE.Vector3());
  const SPEED = 5; // unidades por segundo
  const JUMP_FORCE = 5; // para modo free (vuelo)

  // Inicializar rotación del mouse con la rotación inicial de la cámara
  useEffect(() => {
    if (mouse.current && currentRotation.current) {
      mouse.current.x = currentRotation.current.y;
      mouse.current.y = currentRotation.current.x;
    }
  }, []);

  // Manejar movimiento y rotación cada frame
  useFrame((state, delta) => {
    if (!active || !cameraRef.current) return;

    const cam = cameraRef.current;
    
    // Leer controles de teclado
    const keyboardState = get();
    const forward = keyboardState.forward || false;
    const backward = keyboardState.backward || false;
    const left = keyboardState.left || false;
    const right = keyboardState.right || false;
    const jump = keyboardState.jump || false;
    
    // Actualizar rotación con el mouse (solo si está bloqueado)
    if (mouse.current && mouse.current.isLocked) {
      currentRotation.current.y = mouse.current.x;
      currentRotation.current.x = mouse.current.y;
      // Limitar rotación vertical
      currentRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentRotation.current.x));
    }
    
    // Calcular dirección de movimiento basada en la rotación de la cámara
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
    
    // Normalizar y aplicar velocidad
    if (velocity.current.length() > 0) {
      velocity.current.normalize();
      velocity.current.multiplyScalar(SPEED * delta);
    }
    
    // Aplicar movimiento vertical (solo en modo free)
    if (mode === 'free') {
      if (jump) {
        velocity.current.y += JUMP_FORCE * delta;
      }
    }
    
    // Actualizar posición
    currentPosition.current.add(velocity.current);
    
    // Aplicar posición y rotación según el modo
    if (mode === 'firstPerson') {
      // Primera persona: la cámara sigue la posición directamente
      cam.position.set(
        currentPosition.current.x,
        currentPosition.current.y + height,
        currentPosition.current.z
      );
      cam.rotation.set(currentRotation.current.x, currentRotation.current.y, 0);
      cam.rotation.order = 'YXZ';
    } else if (mode === 'free') {
      // Cámara libre: usar posición y rotación directamente con controles
      cam.position.copy(currentPosition.current);
      cam.rotation.set(currentRotation.current.x, currentRotation.current.y, 0);
      cam.rotation.order = 'YXZ';
    }
    // thirdPerson no necesita controles aquí, se maneja en CameraComponent

    // Sincronizar con la cámara principal si esta cámara está activa
    camera.position.copy(cam.position);
    camera.rotation.copy(cam.rotation);
    camera.fov = cam.fov;
    camera.near = cam.near;
    camera.far = cam.far;
    camera.updateProjectionMatrix();
  });

  return null; // Este componente no renderiza nada
};

