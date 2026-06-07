/**
 * Diagram Event Constants
 *
 * These events are used for communication between Excalidraw panels
 * and for UTCP tool invocations.
 */

/**
 * Event types for diagram lifecycle
 */
export const DIAGRAM_EVENTS = {
  /** Emitted when a new diagram is created */
  DIAGRAM_CREATED: 'excalidraw:diagram-created',
  /** Emitted when a diagram is saved */
  DIAGRAM_SAVED: 'excalidraw:diagram-saved',
  /** Emitted when a diagram is deleted */
  DIAGRAM_DELETED: 'excalidraw:diagram-deleted',
  /** Emitted when a diagram is opened */
  DIAGRAM_OPENED: 'excalidraw:diagram-opened',

  // Tool-invoked events
  /** Tool event: Open a specific diagram */
  OPEN_DIAGRAM: 'excalidraw:open-diagram',
  /** Tool event: Create a new diagram */
  CREATE_DIAGRAM: 'excalidraw:create-diagram',
  /** Tool event: Refresh the diagrams list */
  REFRESH_LIST: 'excalidraw:refresh-list',
} as const;

/**
 * Event type union
 */
export type DiagramEventType = (typeof DIAGRAM_EVENTS)[keyof typeof DIAGRAM_EVENTS];

/**
 * Payload for diagram created/saved events
 */
export interface DiagramCreatedPayload {
  id: string;
  name: string;
  repositoryPath?: string;
}

/**
 * Payload for diagram deleted events
 */
export interface DiagramDeletedPayload {
  id: string;
  repositoryPath?: string;
}

/**
 * Payload for open diagram tool event
 */
export interface OpenDiagramPayload {
  diagramId: string;
}

/**
 * Payload for create diagram tool event
 */
export interface CreateDiagramPayload {
  name?: string;
}

/**
 * Payload for refresh list tool event
 */
export interface RefreshListPayload {
  force?: boolean;
}
