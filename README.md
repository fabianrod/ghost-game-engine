# Zombie FPS Game

Un juego FPS desarrollado con React, Three.js y React Three Fiber.

## 🚀 Características

- **Motor 3D**: Three.js con React Three Fiber
- **Física**: Rapier Physics Engine para colisiones y gravedad
- **Controles FPS**: Movimiento WASD y rotación de cámara con mouse
- **Terreno**: Escenario básico con colisiones
- **Post-procesamiento**: Efectos visuales con Bloom

## 📦 Instalación

```bash
npm install
```

## 🎮 Ejecutar el proyecto

```bash
npm run dev
```

## 🎯 Controles

- **W, A, S, D**: Movimiento del personaje
- **Mouse**: Rotación de la cámara (haz clic para activar)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   └── game/
│       ├── Scene.jsx      # Componente principal de la escena
│       ├── Player.jsx     # Componente del jugador con controles
│       └── Terrain.jsx    # Componente del terreno
├── hooks/
│   └── usePlayerControls.js  # Hook para manejar controles WASD y mouse
├── App.jsx                # Componente principal de la aplicación
└── main.jsx               # Punto de entrada
```

## 🛠️ Tecnologías

- **React 19**: Framework UI
- **Vite**: Build tool y dev server
- **Three.js**: Motor 3D
- **@react-three/fiber**: Renderer de React para Three.js
- **@react-three/drei**: Utilidades y helpers
- **@react-three/rapier**: Motor de física
- **@react-three/postprocessing**: Efectos visuales

## 🎨 Próximas Mejoras

- Sistema de armas
- Enemigos (zombies)
- Sistema de salud
- Más elementos del escenario
- Sonidos y música
- Menú principal
