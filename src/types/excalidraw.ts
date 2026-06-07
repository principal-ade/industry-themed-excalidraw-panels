/**
 * Excalidraw Panel Type Definitions
 *
 * These types define the data structures for Excalidraw diagrams
 * stored in Alexandria Memory Palace.
 */

import type {
  AppState as ExcalidrawAppState,
  BinaryFiles,
  LibraryItem,
} from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

/**
 * Raw Excalidraw diagram data as stored in .excalidraw files
 */
export interface ExcalidrawDiagramData {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: readonly OrderedExcalidrawElement[];
  /** App state - name can be string, null, or undefined */
  appState: Partial<ExcalidrawAppState> & { name?: string | null };
  files: BinaryFiles;
  libraryItems?: readonly LibraryItem[];
}

/**
 * Diagram list item for displaying in the drawings list panel
 */
export interface DiagramListItem {
  /** UUID-based diagram ID (filename without extension) */
  id: string;
  /** Human-readable name from appState.name */
  name: string;
  /** Relative path to the .excalidraw file */
  relativePath: string;
  /** Full absolute path to the file */
  filePath?: string;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last modification timestamp */
  updatedAt?: Date;
}

/**
 * Result type for storage operations
 */
export interface StorageResult {
  success: boolean;
  error?: string;
}

/**
 * Result type for save operations
 */
export interface SaveResult extends StorageResult {
  diagramId?: string;
  fileName?: string;
}

/**
 * Result type for load operations
 */
export interface LoadResult extends StorageResult {
  data?: ExcalidrawDiagramData;
}

/**
 * Result type for list operations
 */
export interface ListResult extends StorageResult {
  diagrams?: DiagramListItem[];
}

// Re-export Excalidraw types for convenience
export type { ExcalidrawAppState, BinaryFiles, LibraryItem, OrderedExcalidrawElement };
