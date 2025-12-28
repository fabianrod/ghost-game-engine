# Instalación de Dependencias para la Nueva UI

Se ha migrado completamente la UI del editor a **shadcn/ui + Radix UI + Lucide React**. 

## Pasos de Instalación

1. **Instalar todas las dependencias:**
```bash
npm install
```

2. **Verificar que todas las dependencias se instalaron correctamente:**
```bash
npm list @radix-ui/react-dialog @radix-ui/react-dropdown-menu lucide-react tailwindcss
```

## Dependencias Agregadas

### Dependencias principales:
- `@radix-ui/react-*` - Componentes primitivos accesibles
- `lucide-react` - Iconos modernos
- `class-variance-authority` - Para variantes de componentes
- `clsx` y `tailwind-merge` - Utilidades para clases CSS

### DevDependencies:
- `tailwindcss` - Framework CSS
- `postcss` y `autoprefixer` - Procesamiento de CSS
- `tailwindcss-animate` - Animaciones de Tailwind

## Componentes UI Creados

Todos los componentes de shadcn/ui están en `src/components/ui/`:
- Button, Input, Label, Checkbox
- Dialog, Tooltip, DropdownMenu
- Select, Separator, Card
- Toast, Switch, Slider, Tabs
- ScrollArea

## Componentes del Editor Actualizados

Todos los componentes del editor ahora usan shadcn/ui:
- ✅ Toolbar - Con iconos Lucide y tooltips
- ✅ ObjectLibrary - Con Cards y ScrollArea
- ✅ PropertiesPanel - Con Inputs, Labels y Checkboxes mejorados
- ✅ LevelSelector - Con DropdownMenu y Dialog para confirmaciones
- ✅ EditorControls - Con Cards y mejor organización

## Características Nuevas

1. **Sistema de Notificaciones (Toast)**: Notificaciones elegantes para acciones del usuario
2. **Modales de Confirmación**: Diálogos para acciones destructivas
3. **Tooltips**: Información contextual en todos los controles
4. **Iconos Consistentes**: Lucide React en lugar de emojis
5. **Tema Oscuro Mejorado**: Variables CSS para fácil personalización

## Notas

- Los archivos CSS antiguos han sido eliminados (excepto LevelEditor.css y EditorCanvas.css que tienen estilos mínimos)
- El tema oscuro está configurado en `src/index.css` usando variables CSS
- Todos los componentes son accesibles y siguen las mejores prácticas de ARIA

## Si hay problemas

Si encuentras errores después de instalar:
1. Elimina `node_modules` y `package-lock.json`
2. Ejecuta `npm install` nuevamente
3. Verifica que Vite esté usando la configuración correcta en `vite.config.js`

