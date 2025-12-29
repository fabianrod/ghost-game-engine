import { useRef, useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';

/**
 * Hook personalizado para manejar los controles del jugador (WASD y mouse)
 * Usa KeyboardControls de @react-three/drei para los controles de teclado estándar
 * @returns {Object} Objeto con los refs de las teclas y movimiento del mouse
 */
export const usePlayerControls = () => {
  // Obtener la función get para leer el estado directamente en cada frame
  const [, get] = useKeyboardControls();
  
  // Crear refs para mantener los valores actuales de las teclas
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  const mouse = useRef({
    x: 0,
    y: 0,
    isLocked: false,
  });

  // Función helper para actualizar los valores desde el estado
  // Esta función se puede llamar directamente desde useFrame para máxima eficiencia
  const updateKeys = () => {
    const state = get();
    keys.current = {
      forward: state.forward || false,
      backward: state.backward || false,
      left: state.left || false,
      right: state.right || false,
      jump: state.jump || false,
    };
  };

  // Exponer la función de actualización para que se pueda llamar desde useFrame
  // Esto es más eficiente que usar useEffect ya que se actualiza en cada frame de todas formas
  keys.current.update = updateKeys;

  // Manejar movimiento del mouse y pointer lock
  useEffect(() => {
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isTracking = false;

    const handleMouseMove = (event) => {
      if (mouse.current.isLocked) {
        // Pointer lock activo: usar movementX/Y (más preciso)
        // Movimiento horizontal: mouse a la izquierda = mirar a la izquierda
        // Invertimos el signo para que el movimiento sea natural
        mouse.current.x -= event.movementX * 0.002;
        // Movimiento vertical: mouse arriba = mirar arriba
        mouse.current.y -= event.movementY * 0.002;
        mouse.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouse.current.y));
      } else {
        // Pointer lock no activo: usar posición relativa (para tercera persona)
        // Esto permite rotar el personaje moviendo el mouse (sin necesidad de presionar)
        if (!isTracking) {
          lastMouseX = event.clientX;
          lastMouseY = event.clientY;
          isTracking = true;
          return;
        }
        
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Solo actualizar si hay movimiento significativo (evitar drift)
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Actualizar rotación basada en el movimiento del mouse
          // Sensibilidad ajustada para movimiento sin pointer lock
          mouse.current.x -= deltaX * 0.002;
          mouse.current.y -= deltaY * 0.002;
          mouse.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouse.current.y));
        }
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    };

    const handleMouseDown = (event) => {
      // Resetear tracking al presionar cualquier botón del mouse
      // Esto permite un control más preciso cuando el usuario quiere reposicionar
      if (event.button === 0 || event.button === 2) {
        isTracking = false;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    };

    const handleMouseUp = () => {
      // No hacer nada especial al soltar
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      mouse.current.isLocked = isLocked;
      // Actualizar atributo del body para CSS
      document.body.setAttribute('data-pointer-locked', isLocked);
      
      // Resetear tracking cuando cambia el estado del pointer lock
      isTracking = false;
    };

    const handleClick = () => {
      // Solo activar pointer lock si no está ya activo
      if (!mouse.current.isLocked) {
        document.body.requestPointerLock().catch(() => {
          // Si falla el pointer lock, permitir rotación con mouse presionado
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Retornar los refs directamente para que se puedan leer en cada frame
  return { keys, mouse };
};

