# ⚠️ Instalación de Dependencias Requerida

Los errores que estás viendo son porque las dependencias aún no se han instalado. Necesitas ejecutar:

## Solución Rápida

```bash
npm install
```

Si tienes problemas de permisos, intenta:

```bash
sudo npm install
```

O si prefieres usar yarn:

```bash
yarn install
```

## Dependencias que se instalarán

### Principales:
- `@radix-ui/react-*` - Componentes primitivos
- `lucide-react` - Iconos
- `clsx` y `tailwind-merge` - Utilidades CSS
- `class-variance-authority` - Variantes de componentes

### DevDependencies:
- `tailwindcss` - Framework CSS
- `postcss` y `autoprefixer` - Procesamiento CSS
- `tailwindcss-animate` - Animaciones

## Verificación

Después de instalar, verifica que todo esté correcto:

```bash
npm list tailwindcss clsx lucide-react
```

Si todo está bien, deberías ver las versiones instaladas.

## Si persisten los errores

1. Elimina `node_modules` y `package-lock.json`:
```bash
rm -rf node_modules package-lock.json
```

2. Reinstala:
```bash
npm install
```

3. Reinicia el servidor de desarrollo:
```bash
npm run dev
```

