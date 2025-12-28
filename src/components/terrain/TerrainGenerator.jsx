import { useMemo, useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping, PlaneGeometry, Vector3 } from 'three';
import { RigidBody, HeightfieldCollider, CuboidCollider } from '@react-three/rapier';
import { TERRAIN_CONFIG } from '../../constants/gameConstants';
import grassTexture from '../../assets/textures/grass-min.jpg';
import { getHeightAt } from '../../utils/heightmapUtils';

/**
 * Componente de terreno con heightmap
 * Permite terrenos con elevaciones y protuberancias realistas
 * 
 * @param {Object} props
 * @param {Float32Array} props.heightmap - Heightmap del terreno (opcional, genera uno procedural si no se proporciona)
 * @param {boolean} props.hasPhysics - Si incluye física (default: true)
 * @param {number} props.size - Tamaño del terreno (default: TERRAIN_CONFIG.SIZE)
 * @param {number} props.segments - Número de segmentos (default: TERRAIN_CONFIG.SEGMENTS)
 * @param {number} props.maxHeight - Altura máxima (default: TERRAIN_CONFIG.MAX_HEIGHT)
 * @param {Function} props.onHeightmapChange - Callback cuando cambia el heightmap
 */
export const TerrainGenerator = ({
  heightmap = null,
  hasPhysics = true,
  size = TERRAIN_CONFIG.SIZE,
  segments = TERRAIN_CONFIG.SEGMENTS,
  maxHeight = TERRAIN_CONFIG.MAX_HEIGHT,
  onHeightmapChange = null,
}) => {
  const texture = useLoader(TextureLoader, grassTexture);
  const meshRef = useRef();
  const geometryRef = useRef();

  // Configurar textura
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(TERRAIN_CONFIG.TEXTURE_REPEAT, TERRAIN_CONFIG.TEXTURE_REPEAT);

  // Crear o usar heightmap proporcionado
  const currentHeightmap = useMemo(() => {
    if (heightmap && heightmap.length === segments * segments) {
      return heightmap;
    }
    // Si no hay heightmap, crear uno plano
    return new Float32Array(segments * segments).fill(0);
  }, [heightmap, segments]);

  // Crear geometría del terreno
  const geometry = useMemo(() => {
    const geom = new PlaneGeometry(size, size, segments - 1, segments - 1);
    geom.rotateX(-Math.PI / 2); // Rotar para que esté horizontal
    
    // Aplicar heightmap a los vértices
    const positions = geom.attributes.position;
    const halfSize = size / 2;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      
      // Convertir coordenadas del mundo a índices del heightmap
      const heightmapX = ((x + halfSize) / size) * (segments - 1);
      const heightmapZ = ((z + halfSize) / size) * (segments - 1);
      
      // Obtener altura usando interpolación
      const height = getHeightAt(currentHeightmap, segments, segments, heightmapX, heightmapZ);
      
      // Aplicar altura al vértice
      positions.setY(i, height);
    }
    
    // Recalcular normales para iluminación correcta
    geom.computeVertexNormals();
    geom.attributes.position.needsUpdate = true;
    geom.attributes.normal.needsUpdate = true;
    
    return geom;
  }, [currentHeightmap, size, segments]);

  // Guardar referencia a la geometría
  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current = geometry;
    }
  }, [geometry]);

  // Notificar cambios en el heightmap
  useEffect(() => {
    if (onHeightmapChange) {
      onHeightmapChange(currentHeightmap);
    }
  }, [currentHeightmap, onHeightmapChange]);

  // Preparar datos para HeightfieldCollider
  // Rapier espera un array plano de alturas (Float32Array)
  // El formato es: heights[z * ncols + x] donde z es la fila y x es la columna
  const heightfieldHeights = useMemo(() => {
    const heights = new Float32Array(segments * segments);
    
    // Copiar heightmap asegurándonos de que esté en el formato correcto
    // El heightmap está indexado como [y * segments + x]
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const idx = z * segments + x;
        heights[idx] = currentHeightmap[idx] || 0;
      }
    }
    
    return heights;
  }, [currentHeightmap, segments]);

  const terrainMesh = (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      position={[0, 0, 0]}
      name="terrain"
    >
      <meshStandardMaterial map={texture} />
    </mesh>
  );

  // Si no hay física, solo retornar el mesh
  if (!hasPhysics) {
    return terrainMesh;
  }

  // Calcular altura promedio para usar como fallback
  const averageHeight = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < currentHeightmap.length; i++) {
      sum += currentHeightmap[i] || 0;
    }
    return sum / currentHeightmap.length;
  }, [currentHeightmap]);

  // Determinar si usar HeightfieldCollider o fallback
  // Por ahora, deshabilitado debido a problemas con la API
  const USE_HEIGHTFIELD = false; // Cambiar a true cuando se verifique la API correcta

  return (
    <>
      {terrainMesh}
      
      {/* Colisión del terreno */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        {USE_HEIGHTFIELD && segments > 1 && heightfieldHeights.length === segments * segments ? (
          // Intentar usar HeightfieldCollider (deshabilitado por ahora)
          <HeightfieldCollider
            args={[
              segments, // nrows
              segments, // ncols  
              heightfieldHeights, // heights: Float32Array
              { x: size, y: maxHeight * 2, z: size }, // scale
            ]}
          />
        ) : (
          // Fallback: CuboidCollider plano (no refleja elevaciones, pero funciona)
          <CuboidCollider 
            args={[size / 2, Math.max(0.1, Math.abs(averageHeight) + maxHeight / 2), size / 2]} 
            position={[0, averageHeight / 2, 0]} 
          />
        )}
      </RigidBody>
    </>
  );
};

