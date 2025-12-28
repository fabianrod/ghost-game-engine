/**
 * Utilidades para manejo de objetos del juego
 * Centraliza operaciones comunes sobre objetos del nivel
 */

import { OBJECT_CONFIG, LEVEL_DEFAULTS } from '../constants/gameConstants';
import { validateVector } from './mathUtils';

/**
 * Crea un objeto nuevo con valores por defecto
 * @param {Object} overrides - Valores a sobrescribir
 * @returns {Object} Objeto nuevo
 */
export function createNewObject(overrides = {}) {
  const id = overrides.id || `obj-${Date.now()}-${Math.random()}`;
  
  return {
    id,
    type: 'object',
    model: '',
    position: validateVector(overrides.position, OBJECT_CONFIG.DEFAULT_POSITION),
    scale: validateVector(overrides.scale, OBJECT_CONFIG.DEFAULT_SCALE),
    rotation: validateVector(overrides.rotation, OBJECT_CONFIG.DEFAULT_ROTATION),
    castShadow: overrides.castShadow !== undefined ? overrides.castShadow : true,
    receiveShadow: overrides.receiveShadow !== undefined ? overrides.receiveShadow : true,
    hasCollider: overrides.hasCollider !== undefined ? overrides.hasCollider : true,
    colliderScale: validateVector(overrides.colliderScale, OBJECT_CONFIG.DEFAULT_COLLIDER_SCALE),
    ...overrides,
  };
}

/**
 * Crea un collider nuevo con valores por defecto
 * @param {string} colliderType - Tipo de collider ('cylinder' o 'box')
 * @param {Object} overrides - Valores a sobrescribir
 * @returns {Object} Collider nuevo
 */
export function createNewCollider(colliderType = 'cylinder', overrides = {}) {
  const id = overrides.id || `collider-${Date.now()}-${Math.random()}`;
  const defaultScale = colliderType === 'cylinder' ? [2, 2, 2] : [2, 2, 2];
  
  return {
    id,
    type: 'collider',
    colliderType,
    position: validateVector(overrides.position, OBJECT_CONFIG.DEFAULT_POSITION),
    scale: validateVector(overrides.scale, defaultScale),
    rotation: validateVector(overrides.rotation, OBJECT_CONFIG.DEFAULT_ROTATION),
    ...overrides,
  };
}

/**
 * Prepara datos del nivel para guardar (elimina IDs internos del editor)
 * @param {Array} objects - Array de objetos del editor
 * @param {Object} levelData - Datos adicionales del nivel
 * @param {Float32Array} terrainHeightmap - Heightmap del terreno (opcional)
 * @returns {Object} Datos del nivel listos para guardar
 */
export function prepareLevelDataForSave(objects, levelData = {}, terrainHeightmap = null) {
  const data = {
    name: levelData.name || LEVEL_DEFAULTS.NAME,
    description: levelData.description || LEVEL_DEFAULTS.DESCRIPTION,
    objects: objects.map(({ id, colliderScale, ...obj }) => {
      // Si es un collider, eliminar colliderScale
      if (obj.type === 'collider') {
        const { colliderScale: _, ...colliderObj } = obj;
        return colliderObj;
      }
      // Si es un objeto normal, mantener colliderScale si existe
      return colliderScale !== undefined ? { ...obj, colliderScale } : obj;
    }),
  };

  // Incluir heightmap del terreno si existe
  if (terrainHeightmap && terrainHeightmap.length > 0) {
    // Convertir Float32Array a Array normal para JSON
    data.terrain = {
      heightmap: Array.from(terrainHeightmap),
      segments: Math.sqrt(terrainHeightmap.length), // Asumir cuadrado
    };
  }

  return data;
}

/**
 * Normaliza la ruta de un modelo
 * @param {string} modelPath - Ruta del modelo
 * @param {Array} availableModels - Array de modelos disponibles
 * @returns {string} Ruta normalizada
 */
export function normalizeModelPath(modelPath, availableModels = []) {
  if (!modelPath || typeof modelPath !== 'string') {
    return '';
  }
  
  // Si ya es una ruta válida, retornarla
  if (modelPath.startsWith('/') || modelPath.startsWith('http')) {
    return modelPath;
  }
  
  // Si empieza con /src/assets/, intentar normalizar
  if (modelPath.startsWith('/src/assets/')) {
    const fileName = modelPath.split('/').pop();
    const matchingModel = availableModels.find(m => m.path && m.path.includes(fileName));
    if (matchingModel) {
      return matchingModel.path;
    }
  }
  
  return modelPath;
}

/**
 * Duplica un objeto desplazándolo
 * @param {Object} object - Objeto a duplicar
 * @param {number} offsetX - Desplazamiento en X (por defecto 2)
 * @returns {Object} Objeto duplicado
 */
export function duplicateObject(object, offsetX = 2) {
  return {
    ...object,
    id: `obj-${Date.now()}-${Math.random()}`,
    position: [
      object.position[0] + offsetX,
      object.position[1],
      object.position[2],
    ],
  };
}

/**
 * Valida que un objeto tenga las propiedades mínimas requeridas
 * @param {Object} obj - Objeto a validar
 * @param {number} index - Índice del objeto (para mensajes de error)
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateObject(obj, index = 0) {
  if (!obj) {
    return { valid: false, error: `Objeto ${index} es null o undefined` };
  }
  
  if (!obj.position || !Array.isArray(obj.position) || obj.position.length !== 3) {
    return { valid: false, error: `Objeto ${index} tiene posición inválida` };
  }
  
  // Para objetos normales, validar que tengan model
  if (obj.type !== 'collider' && (!obj.model || typeof obj.model !== 'string')) {
    return { valid: false, error: `Objeto ${index} no tiene modelo válido` };
  }
  
  // Para colliders, validar que tengan colliderType
  if (obj.type === 'collider' && (!obj.colliderType || (obj.colliderType !== 'cylinder' && obj.colliderType !== 'box'))) {
    return { valid: false, error: `Collider ${index} tiene tipo inválido` };
  }
  
  return { valid: true };
}

