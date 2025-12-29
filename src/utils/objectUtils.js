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
    // Componentes
    components: overrides.components || [],
    componentProps: overrides.componentProps || {},
    // Tags y Layers
    tag: overrides.tag || 'Untagged',
    layer: overrides.layer !== undefined ? overrides.layer : 0,
    name: overrides.name || `Object_${id.slice(-6)}`,
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
  
  // Escalas por defecto según el tipo
  let defaultScale;
  if (colliderType === 'sphere') {
    defaultScale = [1, 1, 1]; // Radio uniforme
  } else if (colliderType === 'capsule') {
    defaultScale = [0.5, 2, 0.5]; // Radio y altura
  } else {
    defaultScale = [2, 2, 2]; // Para cylinder y box
  }
  
  return {
    id,
    type: 'collider',
    colliderType,
    position: validateVector(overrides.position, OBJECT_CONFIG.DEFAULT_POSITION),
    scale: validateVector(overrides.scale, defaultScale),
    rotation: validateVector(overrides.rotation, OBJECT_CONFIG.DEFAULT_ROTATION),
    // Propiedades de física
    isTrigger: overrides.isTrigger !== undefined ? overrides.isTrigger : false,
    isSensor: overrides.isSensor !== undefined ? overrides.isSensor : false,
    physicsMaterial: overrides.physicsMaterial || {
      friction: 0.7,
      restitution: 0.0,
    },
    // Visibilidad en modo juego
    visibleInGame: overrides.visibleInGame !== undefined ? overrides.visibleInGame : false,
    // Componentes
    components: overrides.components || [],
    componentProps: overrides.componentProps || {},
    // Tags y Layers
    tag: overrides.tag || 'Untagged',
    layer: overrides.layer !== undefined ? overrides.layer : 0,
    name: overrides.name || `Collider_${colliderType}_${id.slice(-6)}`,
    ...overrides,
  };
}

/**
 * Crea una cámara nueva con valores por defecto
 * @param {Object} overrides - Valores a sobrescribir
 * @returns {Object} Cámara nueva
 */
export function createNewCamera(overrides = {}) {
  const id = overrides.id || `camera-${Date.now()}-${Math.random()}`;
  
  return {
    id,
    type: 'camera',
    position: validateVector(overrides.position, [0, 1.65, 0]),
    rotation: validateVector(overrides.rotation, [0, 0, 0]),
    fov: overrides.fov !== undefined ? overrides.fov : 75,
    near: overrides.near !== undefined ? overrides.near : 0.1,
    far: overrides.far !== undefined ? overrides.far : 1000,
    mode: overrides.mode || 'firstPerson', // 'firstPerson' | 'thirdPerson' | 'free'
    height: overrides.height !== undefined ? overrides.height : 1.65,
    distance: overrides.distance !== undefined ? overrides.distance : 5,
    offset: validateVector(overrides.offset, [0, 0.5, 0]), // Offset Y por defecto para tercera persona
    targetId: overrides.targetId || null,
    active: overrides.active !== undefined ? overrides.active : false,
    // Tags y Layers
    tag: overrides.tag || 'MainCamera',
    layer: overrides.layer !== undefined ? overrides.layer : 0,
    name: overrides.name || `Camera_${overrides.mode || 'firstPerson'}_${id.slice(-6)}`,
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
    objects: objects.map((obj) => {
      // IMPORTANTE: Preservar el ID para mantener referencias como targetId
      // El ID es necesario para que las referencias entre objetos funcionen correctamente
      const objToSave = { ...obj };
      
      // Si es un collider, eliminar colliderScale (no aplica a colliders)
      if (obj.type === 'collider') {
        const { colliderScale: _, ...colliderObj } = objToSave;
        return colliderObj;
      }
      
      // Si es una cámara, asegurar que targetId se incluya y preserve correctamente
      if (obj.type === 'camera') {
        // Asegurar que targetId esté presente y no sea undefined
        // Si es undefined, establecerlo como null explícitamente
        if (objToSave.targetId === undefined || !('targetId' in objToSave)) {
          objToSave.targetId = null;
        }
        // Preservar targetId tal como está (puede ser null o un ID válido)
        return objToSave;
      }
      
      // Si es un objeto normal, mantener todas las propiedades incluyendo colliderScale si existe
      return objToSave;
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
  
  // Para objetos normales, validar que tengan model (no aplica a colliders ni cámaras)
  if (obj.type !== 'collider' && obj.type !== 'camera' && (!obj.model || typeof obj.model !== 'string')) {
    return { valid: false, error: `Objeto ${index} no tiene modelo válido` };
  }
  
  // Para colliders, validar que tengan colliderType válido
  const validColliderTypes = ['cylinder', 'box', 'sphere', 'capsule'];
  if (obj.type === 'collider' && (!obj.colliderType || !validColliderTypes.includes(obj.colliderType))) {
    return { valid: false, error: `Collider ${index} tiene tipo inválido: ${obj.colliderType}` };
  }
  
  // Para cámaras, validar propiedades básicas
  if (obj.type === 'camera') {
    if (obj.fov !== undefined && (typeof obj.fov !== 'number' || obj.fov <= 0 || obj.fov > 180)) {
      return { valid: false, error: `Cámara ${index} tiene FOV inválido` };
    }
    if (obj.mode && !['firstPerson', 'thirdPerson', 'free'].includes(obj.mode)) {
      return { valid: false, error: `Cámara ${index} tiene modo inválido` };
    }
  }
  
  return { valid: true };
}

