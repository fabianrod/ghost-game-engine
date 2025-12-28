/**
 * Constantes del juego centralizadas
 * Facilita el mantenimiento y evita valores mágicos dispersos
 */

// Configuración del jugador
export const PLAYER_CONFIG = {
  HEIGHT: 1.80, // Altura total del jugador en metros
  EYE_HEIGHT: 1.65, // Altura de los ojos desde el suelo
  COLLIDER_CENTER_Y: 0.9, // Centro del collider del jugador
  COLLIDER_HALF_HEIGHT: 0.75, // Mitad de la altura del collider
  COLLIDER_RADIUS: 0.15, // Radio del collider del jugador
  SPEED: 10, // Velocidad de movimiento
  JUMP_FORCE: 6, // Fuerza de salto
  LINEAR_DAMPING: 0.1, // Amortiguación lineal
};

// Configuración de física
export const PHYSICS_CONFIG = {
  GRAVITY: [0, -9.81, 0],
  GROUND_CHECK_THRESHOLD: 0.5, // Umbral para detectar si está en el suelo
  GROUND_Y_THRESHOLD: 1.0, // Posición Y máxima para considerar que está en el suelo
};

// Configuración de iluminación
export const LIGHTING_CONFIG = {
  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_POSITION: [30, 80, 30],
  DIRECTIONAL_INTENSITY: 1.2,
  SHADOW_MAP_SIZE: 2048,
  SHADOW_CAMERA_FAR: 50,
  SHADOW_CAMERA_LEFT: -10,
  SHADOW_CAMERA_RIGHT: 10,
  SHADOW_CAMERA_TOP: 10,
  SHADOW_CAMERA_BOTTOM: -10,
};

// Configuración del cielo
export const SKY_CONFIG = {
  SUN_POSITION: [30, 80, 30],
  INCLINATION: 0.75,
  AZIMUTH: 0.25,
  TURBIDITY: 3,
  RAYLEIGH: 0.5,
  MIE_COEFFICIENT: 0.003,
  MIE_DIRECTIONAL_G: 0.8,
  DISTANCE: 10000000,
  SUN_SCALE: 0.8,
};

// Configuración de cámara
export const CAMERA_CONFIG = {
  GAME_FOV: 75,
  GAME_POSITION: [0, 1.65, 0],
  EDITOR_FOV: 60,
  EDITOR_POSITION: [20, 15, 20],
};

// Configuración de terreno
export const TERRAIN_CONFIG = {
  SIZE: 100,
  TEXTURE_REPEAT: 10,
  COLLIDER_HALF_X: 50,
  COLLIDER_HALF_Y: 0.1,
  COLLIDER_HALF_Z: 50,
  // Configuración de heightmap
  SEGMENTS: 64, // Número de segmentos por lado (resolución)
  MAX_HEIGHT: 10, // Altura máxima del terreno
  MIN_HEIGHT: -2, // Altura mínima (valles)
  // Configuración de generación procedural
  NOISE_SCALE: 0.1,
  NOISE_OCTAVES: 4,
  NOISE_PERSISTENCE: 0.5,
  SMOOTH_ITERATIONS: 1,
};

// Configuración de objetos
export const OBJECT_CONFIG = {
  DEFAULT_SCALE: [1, 1, 1],
  DEFAULT_ROTATION: [0, 0, 0],
  DEFAULT_POSITION: [0, 0, 0],
  DEFAULT_COLLIDER_SCALE: [0.8, 0.8, 0.8],
  MIN_SCALE: 0.1,
  MAX_SCALE: 100,
  MAX_COLLIDER_SCALE: 1000,
};

// Configuración del editor
export const EDITOR_CONFIG = {
  DEFAULT_SNAP_SIZE: 1,
  SCALE_SNAP_INCREMENT: 0.1,
  ROTATION_SNAP_DEGREES: 45,
  ROTATION_SNAP_RADIANS: Math.PI / 4,
  GRID_SIZE: 100,
  GRID_DIVISIONS: 100,
  TRANSFORM_PROTECTION_TIME: 3000, // Tiempo en ms para proteger contra deselección después de transformar
  DRAG_THRESHOLD: 5, // Píxeles de movimiento para considerar arrastre
  MIN_DRAG_TIME: 500, // Tiempo mínimo en ms para considerar arrastre válido
};

// Configuración de colliders
export const COLLIDER_CONFIG = {
  DEFAULT_TYPE: 'cylinder',
  MIN_RADIUS: 0.1,
  MIN_HEIGHT: 0.1,
  MAX_DIMENSION: 1000,
  CYLINDER_SEGMENTS: 32,
};

// Configuración de efectos post-procesamiento
export const POSTPROCESSING_CONFIG = {
  BLOOM_INTENSITY: 0.5,
};

// Conversiones
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// Valores por defecto para niveles
export const LEVEL_DEFAULTS = {
  NAME: 'Nivel Editado',
  DESCRIPTION: 'Nivel creado en el editor',
  CACHE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 horas en ms
};

// Configuración de localStorage
export const STORAGE_KEYS = {
  LEVEL_PREFIX: 'level_',
  TIMESTAMP_SUFFIX: '_timestamp',
};

