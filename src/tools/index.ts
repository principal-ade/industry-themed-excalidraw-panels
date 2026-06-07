/**
 * Excalidraw Panel Tools
 *
 * UTCP-compatible tools for the Excalidraw panel extension.
 * These tools can be invoked by AI agents and emit events that panels listen for.
 *
 * IMPORTANT: This file should NOT import any React components to ensure
 * it can be imported server-side without pulling in React dependencies.
 */

import type { PanelTool, PanelToolsMetadata } from '@principal-ade/utcp-panel-event';
import { DIAGRAM_EVENTS } from '../events/diagramEvents';

/**
 * Tool: Open Diagram
 * Opens an Excalidraw diagram in the editor panel
 */
export const openDiagramTool: PanelTool = {
  name: 'open_diagram',
  description: 'Opens an Excalidraw diagram in the editor panel by its ID',
  inputs: {
    type: 'object',
    properties: {
      diagramId: {
        type: 'string',
        description: 'The UUID of the diagram to open (without .excalidraw extension)',
      },
    },
    required: ['diagramId'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  tags: ['excalidraw', 'diagram', 'open', 'editor'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: DIAGRAM_EVENTS.OPEN_DIAGRAM,
  },
};

/**
 * Tool: Create Diagram
 * Creates a new blank Excalidraw diagram
 */
export const createDiagramTool: PanelTool = {
  name: 'create_diagram',
  description: 'Creates a new blank Excalidraw diagram in the editor panel',
  inputs: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Optional name for the new diagram (defaults to auto-generated Draft #N)',
      },
    },
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      diagramId: { type: 'string' },
      message: { type: 'string' },
    },
  },
  tags: ['excalidraw', 'diagram', 'create', 'new'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: DIAGRAM_EVENTS.CREATE_DIAGRAM,
  },
};

/**
 * Tool: List Diagrams
 * Returns a list of all Excalidraw diagrams in the repository
 */
export const listDiagramsTool: PanelTool = {
  name: 'list_diagrams',
  description: 'Lists all Excalidraw diagrams in the current repository',
  inputs: {
    type: 'object',
    properties: {},
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      diagrams: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            relativePath: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
      message: { type: 'string' },
    },
  },
  tags: ['excalidraw', 'diagram', 'list', 'browse'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: DIAGRAM_EVENTS.REFRESH_LIST,
  },
};

/**
 * Tool: Refresh Diagrams List
 * Refreshes the diagrams list panel
 */
export const refreshDiagramsTool: PanelTool = {
  name: 'refresh_diagrams',
  description: 'Refreshes the diagrams list to show any newly created or modified diagrams',
  inputs: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force refresh even if data is fresh',
      },
    },
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  tags: ['excalidraw', 'diagram', 'refresh', 'list'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: DIAGRAM_EVENTS.REFRESH_LIST,
  },
};

/**
 * All tools exported as an array for the editor panel
 */
export const excalidrawEditorTools: PanelTool[] = [
  openDiagramTool,
  createDiagramTool,
];

/**
 * All tools exported as an array for the list panel
 */
export const excalidrawListTools: PanelTool[] = [
  listDiagramsTool,
  refreshDiagramsTool,
];

/**
 * All excalidraw tools combined
 */
export const excalidrawPanelTools: PanelTool[] = [
  openDiagramTool,
  createDiagramTool,
  listDiagramsTool,
  refreshDiagramsTool,
];

/**
 * Panel tools metadata for the editor panel
 */
export const excalidrawEditorToolsMetadata: PanelToolsMetadata = {
  id: 'principal-ade.excalidraw-editor',
  name: 'Excalidraw Editor',
  description: 'Tools for creating and editing Excalidraw diagrams',
  tools: excalidrawEditorTools,
};

/**
 * Panel tools metadata for the list panel
 */
export const excalidrawListToolsMetadata: PanelToolsMetadata = {
  id: 'principal-ade.excalidraw-list',
  name: 'Excalidraw Drawings List',
  description: 'Tools for browsing and managing Excalidraw diagrams',
  tools: excalidrawListTools,
};

/**
 * Combined tools metadata
 */
export const excalidrawPanelToolsMetadata: PanelToolsMetadata = {
  id: 'industry-theme.excalidraw-panels',
  name: 'Excalidraw Panels',
  description: 'Tools provided by the Excalidraw panel extension',
  tools: excalidrawPanelTools,
};
