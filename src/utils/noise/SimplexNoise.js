/**
 * Implementación simple de Simplex Noise
 * Alternativa ligera a la librería simplex-noise
 * Basado en el algoritmo de Ken Perlin
 */

/**
 * Generador de ruido Simplex
 */
export class SimplexNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.perm = this.generatePermutation(seed);
    this.gradP = new Array(512);
    this.init();
  }

  generatePermutation(seed) {
    const perm = [];
    for (let i = 0; i < 256; i++) {
      perm[i] = i;
    }
    
    // Shuffle usando el seed
    let rng = seed;
    const random = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };
    
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    
    return perm;
  }

  init() {
    for (let i = 0; i < 512; i++) {
      this.gradP[i] = this.perm[i % 256];
    }
  }

  // Gradientes 2D
  grad2hash(hash, x, y) {
    const h = hash & 3;
    return h === 0 ? x : h === 1 ? y : h === 2 ? -x : -y;
  }

  // Fade function
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Lerp
  lerp(a, b, t) {
    return a + t * (b - a);
  }

  /**
   * Genera ruido 2D
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {number} Valor de ruido entre -1 y 1
   */
  noise2D(x, y) {
    // Implementación simplificada de Perlin Noise 2D
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.perm[X] + Y;
    const AA = this.perm[A];
    const AB = this.perm[A + 1];
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B];
    const BB = this.perm[B + 1];
    
    return this.lerp(
      this.lerp(
        this.grad2hash(this.perm[AA], x, y),
        this.grad2hash(this.perm[BA], x - 1, y),
        u
      ),
      this.lerp(
        this.grad2hash(this.perm[AB], x, y - 1),
        this.grad2hash(this.perm[BB], x - 1, y - 1),
        u
      ),
      v
    );
  }

  /**
   * Genera ruido octave (fractal noise)
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} octaves - Número de octavas
   * @param {number} persistence - Persistencia (0-1)
   * @param {number} scale - Escala base
   * @returns {number} Valor de ruido combinado
   */
  noise2DOctave(x, y, octaves = 4, persistence = 0.5, scale = 1) {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return value / maxValue;
  }
}

/**
 * Crea una instancia de SimplexNoise
 * Si simplex-noise está instalado, intenta usarlo, sino usa la implementación local
 * @param {number} seed - Semilla para el generador
 * @returns {SimplexNoise} Instancia del generador de ruido
 */
export function createNoiseGenerator(seed = Math.random()) {
  // Intentar usar la librería externa si está disponible
  try {
    // eslint-disable-next-line no-undef
    const SimplexNoiseLib = require('simplex-noise');
    return new SimplexNoiseLib({ seed });
  } catch (e) {
    // Si no está disponible, usar la implementación local
    return new SimplexNoise(seed);
  }
}

