import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { usePlayerControls } from '../../hooks/usePlayerControls';
import { PLAYER_CONFIG, PHYSICS_CONFIG } from '../../constants/gameConstants';
import * as THREE from 'three';

/**
 * Componente del jugador con controles WASD y cámara FPS
 * Personaje de 1.80 metros de altura
 * Posición Y=0.9 es el centro del collider (personaje parado en el suelo)
 */
export const Player = ({ position = [0, 0.9, 0] }) => {
  const { camera } = useThree();
  const rigidBodyRef = useRef(null);
  
  // Obtener la función get para leer el estado directamente en cada frame
  const [, get] = useKeyboardControls();
  
  const { mouse } = usePlayerControls();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  // Configurar cámara FPS
  useEffect(() => {
    camera.position.set(...position);
    camera.rotation.order = 'YXZ';
  }, [camera, position]);

  // Detectar si está en el suelo
  const isOnGround = useRef(false);
  const canJump = useRef(true);

  // Manejar movimiento del jugador y rotación de cámara
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    // Leer controles directamente desde el estado en cada frame
    const keyboardState = get();
    const forward = keyboardState.forward || false;
    const backward = keyboardState.backward || false;
    const left = keyboardState.left || false;
    const right = keyboardState.right || false;
    const jump = keyboardState.jump || false;

    // Rotar cámara con el mouse (leer desde el ref)
    camera.rotation.y = mouse.current.x;
    camera.rotation.x = mouse.current.y;

    // Obtener velocidad y posición actual
    const currentVelocity = rigidBodyRef.current.linvel();
    const playerPosition = rigidBodyRef.current.translation();

    // Verificar si está en el suelo (velocidad Y muy pequeña y posición Y cerca del suelo)
    // El personaje mide 1.80m, así que está en el suelo si Y está cerca de 0.9 (centro del collider)
    isOnGround.current = 
      Math.abs(currentVelocity.y) < PHYSICS_CONFIG.GROUND_CHECK_THRESHOLD && 
      playerPosition.y < PHYSICS_CONFIG.GROUND_Y_THRESHOLD;
    
    // Permitir salto si está en el suelo
    if (isOnGround.current) {
      canJump.current = true;
    }

    // Manejar salto
    if (jump && canJump.current && isOnGround.current) {
      const jumpVelocity = currentVelocity.clone();
      jumpVelocity.y = PLAYER_CONFIG.JUMP_FORCE;
      rigidBodyRef.current.setLinvel(jumpVelocity);
      canJump.current = false;
    }

    // Movimiento del jugador - velocidad aumentada para FPS
    const speed = PLAYER_CONFIG.SPEED;
    const directionVector = direction.current;

    // Resetear dirección
    directionVector.set(0, 0, 0);

    // Calcular dirección basada en las teclas presionadas
    if (forward) directionVector.z -= 1;
    if (backward) directionVector.z += 1;
    if (left) directionVector.x -= 1;
    if (right) directionVector.x += 1;

    // Normalizar dirección y aplicar velocidad
    if (directionVector.length() > 0) {
      directionVector.normalize();
      directionVector.multiplyScalar(speed);

      // Aplicar rotación de la cámara a la dirección
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

      const moveDirection = new THREE.Vector3();
      moveDirection.addScaledVector(cameraDirection, -directionVector.z);
      moveDirection.addScaledVector(right, directionVector.x);

      // Aplicar velocidad directamente - esto es más responsivo para FPS
      rigidBodyRef.current.setLinvel({
        x: moveDirection.x,
        y: currentVelocity.y,
        z: moveDirection.z,
      });
    } else {
      // Detener movimiento horizontal más rápido si no hay teclas presionadas
      rigidBodyRef.current.setLinvel({
        x: currentVelocity.x * 0.5,
        y: currentVelocity.y,
        z: currentVelocity.z * 0.5,
      });
    }

    // Sincronizar cámara con la posición del jugador
    // Altura de los ojos: 1.65m desde el suelo (para persona de 1.80m)
    // El centro del collider está en Y = 0.9, así que los ojos están a 0.9 + 0.75 = 1.65m
    const eyeOffset = PLAYER_CONFIG.EYE_HEIGHT - PLAYER_CONFIG.COLLIDER_CENTER_Y;
    camera.position.set(
      playerPosition.x,
      playerPosition.y + eyeOffset,
      playerPosition.z
    );
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders={false}
      enabledRotations={[false, false, false]} // Prevenir rotación del cuerpo
      lockRotations
      canSleep={false} // Evitar que el cuerpo se duerma y no responda
      linearDamping={PLAYER_CONFIG.LINEAR_DAMPING} // Amortiguación mínima para movimiento más rápido y responsivo
    >
      {/* CapsuleCollider: args son [halfHeight, radius] */}
      {/* Personaje de 1.80m: halfHeight=0.75, radius=0.15 */}
      {/* Altura total = halfHeight*2 + radius*2 = 1.5 + 0.3 = 1.8m */}
      {/* Centro del collider en Y=0.9 para que la parte inferior esté en Y=0 */}
      <CapsuleCollider 
        args={[PLAYER_CONFIG.COLLIDER_HALF_HEIGHT, PLAYER_CONFIG.COLLIDER_RADIUS]} 
        position={[0, PLAYER_CONFIG.COLLIDER_CENTER_Y, 0]} 
      />
      {/* No renderizamos el jugador visualmente ya que es un FPS (primera persona) */}
    </RigidBody>
  );
};

