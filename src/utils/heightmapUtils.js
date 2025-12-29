/**
 * Utilidades para trabajar con heightmaps
 * Permite crear, modificar y manipular mapas de altura para terrenos
 */

/**
 * Crea un heightmap vacío (todos los valores en 0)
 * @param {number} width - Ancho del heightmap (número de segmentos)
 * @param {number} height - Alto del heightmap (número de segmentos)
 * @returns {Float32Array} Array de valores de altura
 */
export function createEmptyHeightmap(width, height) {
  return new Float32Array(width * height);
}

/**
 * Crea un heightmap con valores aleatorios suaves
 * @param {number} width - Ancho del heightmap
 * @param {number} height - Alto del heightmap
 * @param {number} maxHeight - Altura máxima
 * @returns {Float32Array} Array de valores de altura
 */
export function createRandomHeightmap(width, height, maxHeight = 1) {
  const heightmap = createEmptyHeightmap(width, height);
  for (let i = 0; i < heightmap.length; i++) {
    heightmap[i] = (Math.random() - 0.5) * maxHeight;
  }
  return heightmap;
}

/**
 * Normaliza un heightmap a un rango específico
 * @param {Float32Array} heightmap - Heightmap a normalizar
 * @param {number} minHeight - Altura mínima deseada
 * @param {number} maxHeight - Altura máxima deseada
 * @returns {Float32Array} Heightmap normalizado
 */
export function normalizeHeightmap(heightmap, minHeight = 0, maxHeight = 1) {
  const normalized = new Float32Array(heightmap.length);
  
  // Encontrar min y max actuales
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < heightmap.length; i++) {
    if (heightmap[i] < min) min = heightmap[i];
    if (heightmap[i] > max) max = heightmap[i];
  }
  
  // Normalizar al rango deseado
  const range = max - min;
  if (range === 0) {
    // Si todos los valores son iguales, establecer al valor medio
    const mid = (minHeight + maxHeight) / 2;
    normalized.fill(mid);
  } else {
    for (let i = 0; i < heightmap.length; i++) {
      normalized[i] = minHeight + ((heightmap[i] - min) / range) * (maxHeight - minHeight);
    }
  }
  
  return normalized;
}

/**
 * Aplica suavizado (smoothing) a un heightmap usando un kernel gaussiano
 * @param {Float32Array} heightmap - Heightmap original
 * @param {number} width - Ancho del heightmap
 * @param {number} height - Alto del heightmap
 * @param {number} iterations - Número de iteraciones de suavizado
 * @returns {Float32Array} Heightmap suavizado
 */
export function smoothHeightmap(heightmap, width, height, iterations = 1) {
  let smoothed = new Float32Array(heightmap);
  
  for (let iter = 0; iter < iterations; iter++) {
    const newHeightmap = new Float32Array(smoothed);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Promedio de los 8 vecinos
        let sum = smoothed[idx] * 4; // Centro con peso 4
        sum += smoothed[(y - 1) * width + (x - 1)]; // Top-left
        sum += smoothed[(y - 1) * width + x]; // Top
        sum += smoothed[(y - 1) * width + (x + 1)]; // Top-right
        sum += smoothed[y * width + (x - 1)]; // Left
        sum += smoothed[y * width + (x + 1)]; // Right
        sum += smoothed[(y + 1) * width + (x - 1)]; // Bottom-left
        sum += smoothed[(y + 1) * width + x]; // Bottom
        sum += smoothed[(y + 1) * width + (x + 1)]; // Bottom-right
        
        newHeightmap[idx] = sum / 12; // Promedio ponderado
      }
    }
    
    smoothed = newHeightmap;
  }
  
  return smoothed;
}

/**
 * Modifica un heightmap en una región específica
 * @param {Float32Array} heightmap - Heightmap original
 * @param {number} width - Ancho del heightmap
 * @param {number} height - Alto del heightmap
 * @param {number} centerX - Coordenada X del centro (en unidades del mundo)
 * @param {number} centerZ - Coordenada Z del centro (en unidades del mundo)
 * @param {number} radius - Radio de influencia (en unidades del mundo)
 * @param {number} intensity - Intensidad de la modificación (-1 a 1)
 * @param {number} terrainSize - Tamaño total del terreno (en unidades del mundo)
 * @param {Function} falloffFunction - Función de caída (opcional)
 * @returns {Float32Array} Heightmap modificado
 */
export function modifyHeightmap(
  heightmap,
  width,
  height,
  centerX,
  centerZ,
  radius,
  intensity,
  terrainSize,
  falloffFunction = null
) {
  const modified = new Float32Array(heightmap);
  const halfSize = terrainSize / 2;
  const segmentSize = terrainSize / (width - 1);
  
  // Función de caída por defecto (suave)
  const defaultFalloff = (distance, r) => {
    const normalizedDist = Math.min(distance / r, 1);
    return 1 - normalizedDist * normalizedDist; // Caída cuadrática
  };
  
  const falloff = falloffFunction || defaultFalloff;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Convertir índice a coordenadas del mundo
      const worldX = (x / (width - 1)) * terrainSize - halfSize;
      const worldZ = (y / (height - 1)) * terrainSize - halfSize;
      
      // Calcular distancia desde el centro
      const dx = worldX - centerX;
      const dz = worldZ - centerZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance <= radius) {
        const idx = y * width + x;
        const influence = falloff(distance, radius);
        modified[idx] += intensity * influence;
      }
    }
  }
  
  return modified;
}

/**
 * Convierte un heightmap a una imagen (para exportar)
 * @param {Float32Array} heightmap - Heightmap a convertir
 * @param {number} width - Ancho del heightmap
 * @param {number} height - Alto del heightmap
 * @returns {ImageData} Datos de imagen
 */
export function heightmapToImageData(heightmap, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  
  // Normalizar heightmap a 0-255
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < heightmap.length; i++) {
    if (heightmap[i] < min) min = heightmap[i];
    if (heightmap[i] > max) max = heightmap[i];
  }
  
  const range = max - min;
  
  for (let i = 0; i < heightmap.length; i++) {
    const value = range > 0 ? ((heightmap[i] - min) / range) * 255 : 128;
    const idx = i * 4;
    imageData.data[idx] = value; // R
    imageData.data[idx + 1] = value; // G
    imageData.data[idx + 2] = value; // B
    imageData.data[idx + 3] = 255; // A
  }
  
  return imageData;
}

/**
 * Carga un heightmap desde una imagen
 * @param {ImageData|HTMLImageElement|HTMLCanvasElement} image - Imagen a cargar
 * @param {number} width - Ancho deseado del heightmap
 * @param {number} height - Alto deseado del heightmap
 * @param {number} maxHeight - Altura máxima para normalizar
 * @returns {Float32Array} Heightmap cargado
 */
export function loadHeightmapFromImage(image, width, height, maxHeight = 10) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Dibujar imagen en el canvas
  if (image instanceof ImageData) {
    ctx.putImageData(image, 0, 0);
  } else if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
    ctx.drawImage(image, 0, 0, width, height);
  }
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const heightmap = new Float32Array(width * height);
  
  // Convertir píxeles a valores de altura
  for (let i = 0; i < heightmap.length; i++) {
    const idx = i * 4;
    // Usar el canal rojo (o promedio RGB) como altura
    const value = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
    heightmap[i] = (value / 255) * maxHeight;
  }
  
  return heightmap;
}

/**
 * Obtiene la altura en un punto específico del heightmap usando interpolación bilineal
 * @param {Float32Array} heightmap - Heightmap
 * @param {number} width - Ancho del heightmap
 * @param {number} height - Alto del heightmap
 * @param {number} x - Coordenada X (0 a width-1)
 * @param {number} z - Coordenada Z (0 a height-1)
 * @returns {number} Altura interpolada
 */
export function getHeightAt(heightmap, width, height, x, z) {
  // Clamp a los límites
  x = Math.max(0, Math.min(width - 1, x));
  z = Math.max(0, Math.min(height - 1, z));
  
  const x1 = Math.floor(x);
  const x2 = Math.min(width - 1, x1 + 1);
  const z1 = Math.floor(z);
  const z2 = Math.min(height - 1, z1 + 1);
  
  const fx = x - x1;
  const fz = z - z1;
  
  // Interpolación bilineal
  const h11 = heightmap[z1 * width + x1];
  const h21 = heightmap[z1 * width + x2];
  const h12 = heightmap[z2 * width + x1];
  const h22 = heightmap[z2 * width + x2];
  
  const h1 = h11 * (1 - fx) + h21 * fx;
  const h2 = h12 * (1 - fx) + h22 * fx;
  
  return h1 * (1 - fz) + h2 * fz;
}

/**
 * Obtiene la altura del terreno en coordenadas del mundo (X, Z)
 * @param {Float32Array} heightmap - Heightmap del terreno
 * @param {number} segments - Número de segmentos del heightmap (ancho y alto, asume cuadrado)
 * @param {number} terrainSize - Tamaño total del terreno en unidades del mundo
 * @param {number} worldX - Coordenada X del mundo
 * @param {number} worldZ - Coordenada Z del mundo
 * @returns {number} Altura del terreno en esa posición, o 0 si no hay heightmap
 */
export function getTerrainHeightAtWorldPosition(heightmap, segments, terrainSize, worldX, worldZ) {
  if (!heightmap || heightmap.length === 0) {
    return 0; // Sin heightmap, terreno plano en Y=0
  }
  
  const halfSize = terrainSize / 2;
  
  // Convertir coordenadas del mundo a índices del heightmap
  const heightmapX = ((worldX + halfSize) / terrainSize) * (segments - 1);
  const heightmapZ = ((worldZ + halfSize) / terrainSize) * (segments - 1);
  
  // Obtener altura usando interpolación bilineal
  const height = getHeightAt(heightmap, segments, segments, heightmapX, heightmapZ);
  
  return height;
}

