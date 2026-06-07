/**
 * Excalidraw Panels Extension
 *
 * This package provides two panels for working with Excalidraw diagrams:
 * - ExcalidrawPanel: Full-featured diagram editor
 * - DrawingsListPanel: Diagram browser and manager
 *
 * Diagrams are stored in Alexandria Memory Palace at .alexandria/drawings/
 */

import { ExcalidrawPanel } from './panels/ExcalidrawPanel';
import { DrawingsListPanel } from './panels/DrawingsListPanel';
import type { PanelDefinition, PanelContextValue } from './types';
import {
  excalidrawEditorTools,
  excalidrawListTools,
} from './tools';

/**
 * Export array of panel definitions.
 * This is the required export for panel extensions.
 */
export const panels: PanelDefinition[] = [
  {
    metadata: {
      id: 'principal-ade.excalidraw-editor',
      name: 'Excalidraw Editor',
      icon: '🎨',
      version: '0.1.0',
      author: 'Principal AI',
      description: 'Create and edit Excalidraw diagrams stored in Alexandria Memory Palace',
      surfaces: ['manager', 'agent'],
      slices: ['fileTree'],
      tools: excalidrawEditorTools,
    },
    component: ExcalidrawPanel,

    onMount: async (context: PanelContextValue) => {
      console.log(
        '[ExcalidrawPanel] Mounted for repository:',
        context.currentScope.repository?.path
      );
    },

    onUnmount: async (_context: PanelContextValue) => {
      console.log('[ExcalidrawPanel] Unmounting');
    },
  },
  {
    metadata: {
      id: 'principal-ade.excalidraw-list',
      name: 'Drawings',
      icon: '📋',
      version: '0.1.0',
      author: 'Principal AI',
      description: 'Browse and manage Excalidraw diagrams in the repository',
      surfaces: ['manager'],
      slices: ['fileTree'],
      tools: excalidrawListTools,
    },
    component: DrawingsListPanel,

    onMount: async (context: PanelContextValue) => {
      console.log(
        '[DrawingsListPanel] Mounted for repository:',
        context.currentScope.repository?.path
      );
    },

    onUnmount: async (_context: PanelContextValue) => {
      console.log('[DrawingsListPanel] Unmounting');
    },
  },
];

/**
 * Optional: Called once when the entire package is loaded.
 */
export const onPackageLoad = async () => {
  console.log('[ExcalidrawPanels] Package loaded');
};

/**
 * Optional: Called once when the package is unloaded.
 */
export const onPackageUnload = async () => {
  console.log('[ExcalidrawPanels] Package unloading');
};

/**
 * Export tools for server-safe imports.
 * Use '@industry-theme/excalidraw-panels/tools' to import without React dependencies.
 */
export {
  excalidrawPanelTools,
  excalidrawPanelToolsMetadata,
  excalidrawEditorTools,
  excalidrawEditorToolsMetadata,
  excalidrawListTools,
  excalidrawListToolsMetadata,
  openDiagramTool,
  createDiagramTool,
  listDiagramsTool,
  refreshDiagramsTool,
} from './tools';

// Export event constants
export { DIAGRAM_EVENTS } from './events/diagramEvents';
export type {
  DiagramEventType,
  DiagramCreatedPayload,
  DiagramDeletedPayload,
  OpenDiagramPayload,
  CreateDiagramPayload,
  RefreshListPayload,
} from './events/diagramEvents';

// Export storage hook
export { useExcalidrawStorage } from './hooks/useExcalidrawStorage';
export type { UseExcalidrawStorageResult } from './hooks/useExcalidrawStorage';

// Export components
export { ExcalidrawWrapper } from './components/ExcalidrawWrapper';
export type { ExcalidrawWrapperProps } from './components/ExcalidrawWrapper';

// Export panels
export { ExcalidrawPanel } from './panels/ExcalidrawPanel';
export { DrawingsListPanel } from './panels/DrawingsListPanel';
