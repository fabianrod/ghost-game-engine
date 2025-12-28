import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TerrainEditorTab } from '../terrain/TerrainEditorTab';
import './ToolsPanel.css';

/**
 * Panel de herramientas en la parte inferior del editor
 * Contiene diferentes herramientas organizadas en pestañas
 * Siempre visible pero colapsable
 * 
 * @param {Object} props
 * @param {boolean} props.collapsed - Si el panel está colapsado
 * @param {Function} props.onToggleCollapse - Callback para colapsar/expandir el panel
 * @param {Float32Array} props.terrainHeightmap - Heightmap del terreno
 * @param {Function} props.onTerrainHeightmapChange - Callback cuando cambia el heightmap
 * @param {Function} props.onTerrainPaintSettingsChange - Callback cuando cambian los ajustes de pintura
 */
export const ToolsPanel = ({
  collapsed = false,
  onToggleCollapse,
  terrainHeightmap,
  onTerrainHeightmapChange,
  onTerrainPaintSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState('terrain');

  return (
    <div className={`tools-panel ${collapsed ? 'tools-panel-collapsed' : ''}`}>
      <div className="tools-panel-header">
        <div className="tools-panel-header-left">
          <h3 className="tools-panel-title">Herramientas</h3>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="tools-panel-tabs-inline">
            <TabsList className="tools-panel-tabs-list-inline">
              <TabsTrigger value="terrain" className="text-xs">🗻 Terreno</TabsTrigger>
              {/* Se pueden agregar más pestañas aquí en el futuro */}
            </TabsList>
          </Tabs>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="tools-panel-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {!collapsed && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="tools-panel-tabs">
          <TabsContent value="terrain" className="tools-panel-content">
            <TerrainEditorTab
              heightmap={terrainHeightmap}
              onHeightmapChange={onTerrainHeightmapChange}
              onPaintSettingsChange={onTerrainPaintSettingsChange}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

