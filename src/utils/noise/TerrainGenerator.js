/**
 * Generador de terreno procedural usando ruido
 * Combina múltiples octavas de ruido para crear terrenos realistas
 */

import { createNoiseGenerator } from './SimplexNoise.js';
import { createEmptyHeightmap, normalizeHeightmap, smoothHeightmap } from '../heightmapUtils.js';

/**
 * Configuración para generación de terreno
 */
export const TERRAIN_GENERATION_CONFIG = {
  DEFAULT_SEGMENTS: 64, // Número de segmentos por lado
  DEFAULT_SCALE: 0.1, // Escala base del ruido
  DEFAULT_OCTAVES: 4, // Número de octavas
  DEFAULT_PERSISTENCE: 0.5, // Persistencia entre octavas
  DEFAULT_HEIGHT: 10, // Altura máxima del terreno
  DEFAULT_SMOOTH_ITERATIONS: 1, // Iteraciones de suavizado
};

/**
 * Genera un heightmap procedural usando ruido
 * @param {Object} config - Configuración de generación
 * @param {number} config.segments - Número de segmentos (resolución)
 * @param {number} config.scale - Escala del ruido (menor = más detalle)
 * @param {number} config.octaves - Número de octavas
 * @param {number} config.persistence - Persistencia (0-1)
 * @param {number} config.height - Altura máxima
 * @param {number} config.seed - Semilla para el generador
 * @param {number} config.smoothIterations - Iteraciones de suavizado
 * @returns {Float32Array} Heightmap generado
 */
export function generateProceduralTerrain(config = {}) {
  const {
    segments = TERRAIN_GENERATION_CONFIG.DEFAULT_SEGMENTS,
    scale = TERRAIN_GENERATION_CONFIG.DEFAULT_SCALE,
    octaves = TERRAIN_GENERATION_CONFIG.DEFAULT_OCTAVES,
    persistence = TERRAIN_GENERATION_CONFIG.DEFAULT_PERSISTENCE,
    height = TERRAIN_GENERATION_CONFIG.DEFAULT_HEIGHT,
    seed = Math.random(),
    smoothIterations = TERRAIN_GENERATION_CONFIG.DEFAULT_SMOOTH_ITERATIONS,
  } = config;

  const noise = createNoiseGenerator(seed);
  const heightmap = createEmptyHeightmap(segments, segments);

  // Generar ruido para cada punto
  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const idx = y * segments + x;
      
      // Generar ruido fractal
      const noiseValue = noise.noise2DOctave(x, y, octaves, persistence, scale);
      
      // Convertir de [-1, 1] a [0, height]
      heightmap[idx] = (noiseValue + 1) * 0.5 * height;
    }
  }

  // Aplicar suavizado si es necesario
  let finalHeightmap = heightmap;
  if (smoothIterations > 0) {
    finalHeightmap = smoothHeightmap(heightmap, segments, segments, smoothIterations);
  }

  return finalHeightmap;
}

/**
 * Genera un terreno con colinas suaves
 * @param {Object} config - Configuración
 * @returns {Float32Array} Heightmap generado
 */
export function generateHillsTerrain(config = {}) {
  return generateProceduralTerrain({
    ...config,
    scale: config.scale || 0.05,
    octaves: config.octaves || 3,
    persistence: config.persistence || 0.6,
    height: config.height || 8,
  });
}

/**
 * Genera un terreno montañoso
 * @param {Object} config - Configuración
 * @returns {Float32Array} Heightmap generado
 */
export function generateMountainTerrain(config = {}) {
  return generateProceduralTerrain({
    ...config,
    scale: config.scale || 0.08,
    octaves: config.octaves || 6,
    persistence: config.persistence || 0.5,
    height: config.height || 20,
  });
}

/**
 * Genera un terreno plano con pequeñas variaciones
 * @param {Object} config - Configuración
 * @returns {Float32Array} Heightmap generado
 */
export function generateFlatTerrain(config = {}) {
  return generateProceduralTerrain({
    ...config,
    scale: config.scale || 0.2,
    octaves: config.octaves || 2,
    persistence: config.persistence || 0.3,
    height: config.height || 2,
  });
}

/**
 * Genera un terreno con valles y ríos
 * @param {Object} config - Configuración
 * @returns {Float32Array} Heightmap generado
 */
export function generateValleyTerrain(config = {}) {
  const {
    segments = TERRAIN_GENERATION_CONFIG.DEFAULT_SEGMENTS,
    height = 15,
    seed = Math.random(),
  } = config;

  const noise = createNoiseGenerator(seed);
  const heightmap = createEmptyHeightmap(segments, segments);

  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const idx = y * segments + x;
      
      // Ruido base para montañas
      const baseNoise = noise.noise2DOctave(x, y, 4, 0.5, 0.1);
      
      // Crear valles usando distancia desde el centro
      const centerX = segments / 2;
      const centerY = segments / 2;
      const dx = (x - centerX) / segments;
      const dy = (y - centerY) / segments;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      
      // Función de valle (más bajo en el centro)
      const valleyFactor = 1 - Math.min(distFromCenter * 2, 1);
      
      // Combinar ruido con valle
      const heightValue = (baseNoise + 1) * 0.5 * height * (0.3 + valleyFactor * 0.7);
      
      heightmap[idx] = heightValue;
    }
  }

  return heightmap;
}

