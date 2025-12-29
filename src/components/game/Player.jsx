import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import { usePlayerControls } from '../../hooks/usePlayerControls';
import { PLAYER_CONFIG, PHYSICS_CONFIG, TERRAIN_CONFIG } from '../../constants/gameConstants';
import { getHeightAt, getTerrainHeightAtWorldPosition } from '../../utils/heightmapUtils';
import * as THREE from 'three';

/**
 * Componente del jugador con Character Controller Profesional
 * Implementa Kinematic RigidBody + Raycasting para movimiento preciso
 * 
 * Características:
 * - Detección de suelo con raycasting
 * - Ground snapping para mantener al personaje en el suelo
 * - Sistema de slopes (subir/bajar pendientes)
 * - Colisiones horizontales mejoradas
 * - Coyote time y jump buffering
 * 
 * Personaje de 1.80 metros de altura
 * Posición Y=0.9 es el centro del collider (personaje parado en el suelo)
 */
export const Player = ({ position = [0, 0.9, 0] }) => {
  const { camera, scene } = useThree();
  const { world } = useRapier();
  const rigidBodyRef = useRef(null);
  
  // Obtener la función get para leer el estado directamente en cada frame
  const [, get] = useKeyboardControls();
  
  const { mouse } = usePlayerControls();
  
  // Estado del character controller
  const isOnGround = useRef(false);
  const canJump = useRef(true);
  const groundDistance = useRef(0);
  const groundNormal = useRef(new THREE.Vector3(0, 1, 0));
  const slopeAngle = useRef(0);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const coyoteTime = useRef(0);
  const jumpBufferTime = useRef(0);
  
  // Caching para optimización
  const raycaster = useRef(new THREE.Raycaster());
  const terrainMeshRef = useRef(null);
  const terrainGeometryRef = useRef(null);
  const terrainHeightmapRef = useRef(null);
  const lastRaycastPosition = useRef(new THREE.Vector3());
  const raycastCache = useRef({ hit: null, distance: Infinity, normal: null, timestamp: 0 });
  const CACHE_DURATION = 0.05; // Cache válido por 50ms (3 frames a 60fps)
  
  // Buscar el mesh del terreno y extraer información del heightmap
  useEffect(() => {
    const findTerrain = () => {
      scene.traverse((obj) => {
        if (obj.name === 'terrain' && obj.isMesh) {
          terrainMeshRef.current = obj;
          terrainGeometryRef.current = obj.geometry;
          
          // Extraer heightmap de userData si está disponible
          if (obj.userData?.heightmap) {
            terrainHeightmapRef.current = obj.userData.heightmap;
          }
        }
      });
    };
    
    // Buscar inmediatamente
    findTerrain();
    
    // Reintentar después de un delay (por si el terreno se carga después)
    const timer = setTimeout(findTerrain, 500);
    const timer2 = setTimeout(findTerrain, 1000); // Segundo intento
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [scene]);
  
  /**
   * Obtener altura del terreno usando heightmap directamente (más eficiente)
   */
  const getTerrainHeightFromHeightmap = (x, z) => {
    if (!terrainHeightmapRef.current) return null;
    
    const heightmap = terrainHeightmapRef.current;
    const segments = TERRAIN_CONFIG.SEGMENTS;
    const size = TERRAIN_CONFIG.SIZE;
    const halfSize = size / 2;
    
    // Convertir coordenadas del mundo a índices del heightmap
    const heightmapX = ((x + halfSize) / size) * (segments - 1);
    const heightmapZ = ((z + halfSize) / size) * (segments - 1);
    
    // Obtener altura usando interpolación bilineal
    const height = getHeightAt(heightmap, segments, segments, heightmapX, heightmapZ);
    return height;
  };
  
  /**
   * Calcular normal del terreno usando heightmap (aproximación)
   */
  const getTerrainNormalFromHeightmap = (x, z) => {
    if (!terrainHeightmapRef.current) return null;
    
    const epsilon = 0.1; // Pequeño offset para calcular gradiente
    const h1 = getTerrainHeightFromHeightmap(x - epsilon, z);
    const h2 = getTerrainHeightFromHeightmap(x + epsilon, z);
    const h3 = getTerrainHeightFromHeightmap(x, z - epsilon);
    const h4 = getTerrainHeightFromHeightmap(x, z + epsilon);
    
    if (h1 === null || h2 === null || h3 === null || h4 === null) return null;
    
    // Calcular gradiente (normal aproximada)
    const dx = (h2 - h1) / (2 * epsilon);
    const dz = (h4 - h3) / (2 * epsilon);
    
    // Normal = (-dx, 1, -dz) normalizada
    const normal = new THREE.Vector3(-dx, 1, -dz);
    normal.normalize();
    
    return normal;
  };

  // Configurar cámara FPS y posición inicial sobre el terreno
  useEffect(() => {
    const updatePositionOnTerrain = () => {
      // Calcular altura del terreno en la posición inicial
      let initialY = position[1];
      
      // Intentar obtener altura del terreno
      if (terrainHeightmapRef.current) {
        const terrainHeight = getTerrainHeightAtWorldPosition(
          terrainHeightmapRef.current,
          TERRAIN_CONFIG.SEGMENTS,
          TERRAIN_CONFIG.SIZE,
          position[0],
          position[2]
        );
        // Posición Y = altura del terreno + centro del collider
        initialY = terrainHeight + PLAYER_CONFIG.COLLIDER_CENTER_Y;
      } else {
        // Si no hay heightmap aún, intentar usar getTerrainHeightFromHeightmap
        const heightmapHeight = getTerrainHeightFromHeightmap(position[0], position[2]);
        if (heightmapHeight !== null) {
          initialY = heightmapHeight + PLAYER_CONFIG.COLLIDER_CENTER_Y;
        }
      }
      
      // Actualizar posición del RigidBody si está disponible
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setTranslation({
          x: position[0],
          y: initialY,
          z: position[2]
        });
      }
      
      camera.position.set(position[0], initialY + (PLAYER_CONFIG.EYE_HEIGHT - PLAYER_CONFIG.COLLIDER_CENTER_Y), position[2]);
      camera.rotation.order = 'YXZ';
    };
    
    // Ejecutar inmediatamente
    updatePositionOnTerrain();
    
    // Reintentar después de delays para cuando el terreno se carga después
    const timer1 = setTimeout(updatePositionOnTerrain, 100);
    const timer2 = setTimeout(updatePositionOnTerrain, 500);
    const timer3 = setTimeout(updatePositionOnTerrain, 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [camera, position]);

  /**
   * Detección de suelo optimizada con múltiples rayos y caching
   * Usa múltiples rayos para mayor precisión y caching para mejor rendimiento
   */
  const checkGround = (currentPos, delta) => {
    if (!delta) delta = 0.016; // Fallback a 60fps si no se proporciona
    const currentTime = performance.now() / 1000;
    const posVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    
    // Verificar cache: si la posición no cambió mucho y el cache es reciente, reutilizar
    const positionDelta = posVec.distanceTo(lastRaycastPosition.current);
    const cacheAge = currentTime - raycastCache.current.timestamp;
    
    if (positionDelta < 0.1 && cacheAge < CACHE_DURATION && raycastCache.current.hit !== null) {
      // Usar cache
      const cached = raycastCache.current;
      if (cached.distance < PLAYER_CONFIG.GROUND_RAY_DISTANCE) {
        const normalVec = new THREE.Vector3(cached.normal.x, cached.normal.y, cached.normal.z);
        const angle = Math.acos(Math.max(-1, Math.min(1, normalVec.y))) * (180 / Math.PI);
        
        if (angle <= PLAYER_CONFIG.MAX_SLOPE_ANGLE) {
          isOnGround.current = true;
          groundDistance.current = cached.distance;
          slopeAngle.current = angle;
          groundNormal.current.copy(normalVec);
          coyoteTime.current = PLAYER_CONFIG.COYOTE_TIME;
          return true;
        }
      }
    }
    
    // Intentar usar heightmap primero (más eficiente si está disponible)
    let hit = null;
    let distance = Infinity;
    let normal = { x: 0, y: 1, z: 0 };
    
    const terrainHeight = getTerrainHeightFromHeightmap(currentPos.x, currentPos.z);
    const terrainNormal = getTerrainNormalFromHeightmap(currentPos.x, currentPos.z);
    
    if (terrainHeight !== null) {
      // Usar heightmap para obtener altura
      const playerBottomY = currentPos.y - PLAYER_CONFIG.COLLIDER_CENTER_Y + PLAYER_CONFIG.COLLIDER_HALF_HEIGHT;
      distance = Math.max(0, playerBottomY - terrainHeight);
      
      if (distance < PLAYER_CONFIG.GROUND_RAY_DISTANCE) {
        // Usar normal del heightmap o calcular desde raycasting
        if (terrainNormal) {
          normal = { x: terrainNormal.x, y: terrainNormal.y, z: terrainNormal.z };
        }
        hit = { toi: distance, normal };
      }
    }
    
    // Si no hay heightmap o el resultado no es válido, usar raycasting
    if (!hit || distance >= PLAYER_CONFIG.GROUND_RAY_DISTANCE) {
      const radius = PLAYER_CONFIG.COLLIDER_RADIUS;
      const rayOrigins = [
        new THREE.Vector3(currentPos.x, currentPos.y + 0.1, currentPos.z), // Centro
        new THREE.Vector3(currentPos.x + radius * 0.7, currentPos.y + 0.1, currentPos.z), // Derecha
        new THREE.Vector3(currentPos.x - radius * 0.7, currentPos.y + 0.1, currentPos.z), // Izquierda
        new THREE.Vector3(currentPos.x, currentPos.y + 0.1, currentPos.z + radius * 0.7), // Adelante
        new THREE.Vector3(currentPos.x, currentPos.y + 0.1, currentPos.z - radius * 0.7), // Atrás
      ];
      
      const rayDirection = new THREE.Vector3(0, -1, 0);
      const maxDistance = PLAYER_CONFIG.GROUND_RAY_DISTANCE;
      const allHits = [];
      
      // Priorizar el mesh del terreno si está disponible
      const targetObjects = terrainMeshRef.current 
        ? [terrainMeshRef.current] 
        : scene.children;
      
      // Lanzar múltiples rayos
      for (const origin of rayOrigins) {
        raycaster.current.set(origin, rayDirection);
        const intersects = raycaster.current.intersectObjects(targetObjects, true);
        
        // Filtrar intersecciones válidas
        const validHits = intersects.filter(intersect => {
          return !intersect.object.userData?.isPlayer && intersect.distance < maxDistance;
        });
        
        if (validHits.length > 0) {
          allHits.push(...validHits);
        }
      }
      
      // Encontrar el hit más cercano
      if (allHits.length > 0) {
        allHits.sort((a, b) => a.distance - b.distance);
        const closestHit = allHits[0];
        distance = closestHit.distance;
        
        // Calcular normal promedio de los hits cercanos para mayor estabilidad
        const nearbyHits = allHits.filter(h => Math.abs(h.distance - distance) < 0.1);
        let normalSum = new THREE.Vector3(0, 0, 0);
        
        nearbyHits.forEach(h => {
          if (h.face && h.face.normal) {
            normalSum.add(h.face.normal);
          }
        });
        
        if (nearbyHits.length > 0) {
          normalSum.divideScalar(nearbyHits.length);
          normalSum.normalize();
          normal = { x: normalSum.x, y: normalSum.y, z: normalSum.z };
        } else {
          normal = closestHit.face?.normal || { x: 0, y: 1, z: 0 };
        }
        
        hit = { toi: distance, normal };
      }
    }
    
    // Actualizar cache
    lastRaycastPosition.current.copy(posVec);
    raycastCache.current = {
      hit,
      distance,
      normal,
      timestamp: currentTime
    };
    
    if (hit && distance < PLAYER_CONFIG.GROUND_RAY_DISTANCE) {
      // Calcular ángulo de la pendiente
      const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);
      const angle = Math.acos(Math.max(-1, Math.min(1, normalVec.y))) * (180 / Math.PI);
      slopeAngle.current = angle;
      groundNormal.current.copy(normalVec);
      
      // Verificar si la pendiente es transitable
      const canWalkOnSlope = angle <= PLAYER_CONFIG.MAX_SLOPE_ANGLE;
      
      if (canWalkOnSlope) {
        isOnGround.current = true;
        groundDistance.current = distance;
        coyoteTime.current = PLAYER_CONFIG.COYOTE_TIME;
        return true;
      }
    }
    
    // Si no hay hit o la pendiente es muy empinada, no está en el suelo
    isOnGround.current = false;
    
    // Decrementar coyote time
    if (coyoteTime.current > 0) {
      coyoteTime.current -= delta; // Usar delta real en lugar de valor fijo
    }
    
    return false;
  };

  /**
   * Verificar colisiones horizontales usando raycasting
   */
  const checkHorizontalCollision = (currentPos, direction, distance) => {
    if (!rigidBodyRef.current || distance <= 0) return distance;
    
    // Normalizar dirección
    const dirLength = Math.sqrt(direction.x ** 2 + direction.z ** 2);
    if (dirLength === 0) return distance;
    
    const normalizedDir = {
      x: direction.x / dirLength,
      y: 0,
      z: direction.z / dirLength
    };
    
    // Usar Three.js raycaster para detectar colisiones
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    const rayDirection = new THREE.Vector3(normalizedDir.x, 0, normalizedDir.z);
    raycaster.set(rayOrigin, rayDirection);
    
    const checkDistance = distance + PLAYER_CONFIG.SWEEP_TEST_MARGIN;
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filtrar intersecciones válidas
    const validHits = intersects.filter(intersect => {
      return !intersect.object.userData?.isPlayer && intersect.distance < checkDistance;
    });
    
    if (validHits.length > 0) {
      const closestHit = validHits[0];
      return Math.max(0, closestHit.distance - PLAYER_CONFIG.SWEEP_TEST_MARGIN);
    }
    
    return distance;
  };

  /**
   * Ground snapping: mantiene al personaje pegado al suelo
   * Usa la altura del terreno directamente para asegurar que siempre esté sobre el grass
   */
  const applyGroundSnapping = (position) => {
    // Si está en el suelo, SIEMPRE posicionar sobre el terreno
    if (isOnGround.current) {
      // Obtener altura del terreno en esta posición
      let terrainHeight = 0;
      
      // Intentar usar heightmap primero (más eficiente)
      const heightmapHeight = getTerrainHeightFromHeightmap(position.x, position.z);
      if (heightmapHeight !== null) {
        terrainHeight = heightmapHeight;
      } else if (terrainHeightmapRef.current) {
        // Usar la función helper si está disponible
        terrainHeight = getTerrainHeightAtWorldPosition(
          terrainHeightmapRef.current,
          TERRAIN_CONFIG.SEGMENTS,
          TERRAIN_CONFIG.SIZE,
          position.x,
          position.z
        );
      } else {
        // Fallback: usar groundDistance si no hay heightmap
        if (groundDistance.current <= PLAYER_CONFIG.GROUND_SNAP_DISTANCE) {
          const colliderBottomOffset = PLAYER_CONFIG.COLLIDER_CENTER_Y - PLAYER_CONFIG.COLLIDER_HALF_HEIGHT;
          const targetY = position.y - groundDistance.current + colliderBottomOffset;
          return {
            x: position.x,
            y: targetY,
            z: position.z
          };
        }
        return position;
      }
      
      // Calcular posición Y objetivo: altura del terreno + centro del collider
      // El collider tiene su centro en COLLIDER_CENTER_Y, así que la posición Y del RigidBody
      // debe ser: altura del terreno + COLLIDER_CENTER_Y
      const targetY = terrainHeight + PLAYER_CONFIG.COLLIDER_CENTER_Y;
      
      // Suavizar el ajuste con interpolación para evitar saltos bruscos
      const currentY = position.y;
      const newY = THREE.MathUtils.lerp(
        currentY, 
        targetY, 
        PLAYER_CONFIG.GROUND_SNAP_SPEED
      );
      
      return {
        x: position.x,
        y: newY,
        z: position.z
      };
    }
    
    // Si no está en el suelo (saltando/cayendo), no aplicar snapping
    return position;
  };

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

    // Obtener posición actual
    const currentPosition = rigidBodyRef.current.translation();
    
    // Detectar suelo con raycasting optimizado
    checkGround(currentPosition, delta);
    
    // Actualizar coyote time y jump buffer
    if (jump) {
      jumpBufferTime.current = PLAYER_CONFIG.JUMP_BUFFER_TIME;
    } else {
      jumpBufferTime.current = Math.max(0, jumpBufferTime.current - delta);
    }

    // Manejar salto
    const canJumpNow = isOnGround.current || coyoteTime.current > 0;
    const shouldJump = jumpBufferTime.current > 0 && canJumpNow;
    
    if (shouldJump && canJump.current) {
      // Aplicar fuerza de salto
      velocity.current.y = PLAYER_CONFIG.JUMP_FORCE;
      canJump.current = false;
      jumpBufferTime.current = 0;
      coyoteTime.current = 0;
    }
    
    // Aplicar gravedad (solo si no está en el suelo)
    if (!isOnGround.current) {
      velocity.current.y -= PHYSICS_CONFIG.GRAVITY_STRENGTH * delta;
    } else {
      // Si está en el suelo y no está saltando, mantener velocidad Y en 0
      if (velocity.current.y < 0) {
        velocity.current.y = 0;
      }
      canJump.current = true;
    }
    
    // Calcular dirección de movimiento horizontal
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (left) moveDirection.x -= 1;
    if (right) moveDirection.x += 1;
    
    // Normalizar dirección
    if (moveDirection.length() > 0) {
      moveDirection.normalize();

      // Aplicar rotación de la cámara a la dirección
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

      const finalDirection = new THREE.Vector3();
      finalDirection.addScaledVector(cameraDirection, -moveDirection.z);
      finalDirection.addScaledVector(right, moveDirection.x);
      finalDirection.normalize();
      
      // Calcular velocidad horizontal
      const speed = PLAYER_CONFIG.SPEED;
      const horizontalVelocity = finalDirection.multiplyScalar(speed * delta);
      
      // Verificar colisiones horizontales
      const safeDistance = checkHorizontalCollision(
        currentPosition,
        { x: horizontalVelocity.x, y: 0, z: horizontalVelocity.z },
        horizontalVelocity.length()
      );
      
      // Ajustar velocidad horizontal según el resultado
      if (safeDistance < horizontalVelocity.length()) {
        const scale = safeDistance / horizontalVelocity.length();
        horizontalVelocity.multiplyScalar(scale);
      }
      
      // Aplicar movimiento horizontal
      velocity.current.x = horizontalVelocity.x / delta;
      velocity.current.z = horizontalVelocity.z / delta;
    } else {
      // Detener movimiento horizontal si no hay teclas presionadas
      velocity.current.x = 0;
      velocity.current.z = 0;
    }
    
    // Calcular nueva posición
    const newPosition = {
      x: currentPosition.x + velocity.current.x * delta,
      y: currentPosition.y + velocity.current.y * delta,
      z: currentPosition.z + velocity.current.z * delta
    };
    
    // Aplicar ground snapping si está en el suelo
    const snappedPosition = applyGroundSnapping(newPosition);
    
    // Aplicar movimiento con setTranslation (Kinematic)
    rigidBodyRef.current.setTranslation(snappedPosition);

    // Sincronizar cámara con la posición del jugador
    const eyeOffset = PLAYER_CONFIG.EYE_HEIGHT - PLAYER_CONFIG.COLLIDER_CENTER_Y;
    camera.position.set(
      snappedPosition.x,
      snappedPosition.y + eyeOffset,
      snappedPosition.z
    );
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="kinematicPositionBased" // Cambiado a kinematic para control total
      colliders={false}
      enabledRotations={[false, false, false]} // Prevenir rotación del cuerpo
      lockRotations
      canSleep={false} // Evitar que el cuerpo se duerma
      userData={{ isPlayer: true }} // Marcar como jugador para raycasting
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
