/**
 * Hook for Excalidraw diagram storage using Alexandria Memory Palace
 *
 * This hook provides CRUD operations for diagrams stored in .alexandria/drawings/.
 * It uses FileTree-based adapters from the panel context.
 *
 * Required from host:
 * - fileTree slice: FileTree from @principal-ai/repository-abstraction
 * - adapters.readFile: (path: string) => Promise<string>
 * - adapters.writeFile: (path: string, content: string) => Promise<void>
 * - adapters.deleteFile: (path: string) => Promise<void>
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PanelContextValue } from '@principal-ade/panel-framework-core';
import type { FileTree } from '@principal-ai/repository-abstraction';
import type {
  ExcalidrawDiagramData,
  DiagramListItem,
  SaveResult,
  LoadResult,
  ListResult,
  StorageResult,
} from '../types/excalidraw';

/** Directory where drawings are stored relative to repository root */
const DRAWINGS_DIR = '.alexandria/drawings';

export interface UseExcalidrawStorageResult {
  /** Save a diagram (create or update) */
  saveDiagram: (
    name: string,
    data: ExcalidrawDiagramData,
    existingId?: string
  ) => Promise<SaveResult>;
  /** Load a diagram by ID */
  loadDiagram: (diagramId: string) => Promise<LoadResult>;
  /** List all diagrams in the repository */
  listDiagrams: () => Promise<ListResult>;
  /** Delete a diagram */
  deleteDiagram: (diagramId: string) => Promise<StorageResult>;
  /** Check if storage is available */
  isStorageAvailable: boolean;
  /** Repository path */
  repositoryPath: string;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook that provides storage operations for Excalidraw diagrams.
 *
 * Storage location: <repository>/.alexandria/drawings/<uuid>.excalidraw
 * Diagram name is stored in data.appState.name
 */
export function useExcalidrawStorage(
  context: PanelContextValue
): UseExcalidrawStorageResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get repository path
  const repositoryPath =
    context.currentScope.repository?.path ||
    context.currentScope.workspace?.path ||
    '';

  // Get adapters from context
  // Primary: use the simple readFile adapter
  // Fallback: use the full fileSystem adapter
  const readFile = context.adapters?.readFile
    ? (path: string) => Promise.resolve(context.adapters!.readFile!(path))
    : context.adapters?.fileSystem?.readFile
      ? (path: string) => Promise.resolve(context.adapters!.fileSystem!.readFile(path))
      : undefined;

  const writeFile = context.adapters?.fileSystem?.writeFile
    ? (path: string, content: string) =>
        Promise.resolve(context.adapters!.fileSystem!.writeFile(path, content))
    : undefined;

  const deleteFile = context.adapters?.fileSystem?.deleteFile
    ? (path: string) =>
        Promise.resolve(context.adapters!.fileSystem!.deleteFile(path))
    : undefined;

  // Get fileTree slice for listing diagrams
  const fileTreeSlice = context.getSlice<FileTree>('fileTree');
  const fileTree = fileTreeSlice?.data;

  // Check if storage is available (need read, write, and a repository path)
  const isStorageAvailable = useMemo(() => {
    return Boolean(repositoryPath && readFile && writeFile);
  }, [repositoryPath, readFile, writeFile]);

  /**
   * Get the full path for a diagram file
   */
  const getDiagramPath = useCallback(
    (diagramId: string): string => {
      const fileName = diagramId.endsWith('.excalidraw')
        ? diagramId
        : `${diagramId}.excalidraw`;
      return `${repositoryPath}/${DRAWINGS_DIR}/${fileName}`;
    },
    [repositoryPath]
  );

  /**
   * Get the relative path for a diagram file
   */
  const getRelativePath = useCallback((diagramId: string): string => {
    const fileName = diagramId.endsWith('.excalidraw')
      ? diagramId
      : `${diagramId}.excalidraw`;
    return `${DRAWINGS_DIR}/${fileName}`;
  }, []);

  /**
   * Save a diagram (create new or update existing)
   */
  const saveDiagram = useCallback(
    async (
      name: string,
      data: ExcalidrawDiagramData,
      existingId?: string
    ): Promise<SaveResult> => {
      if (!writeFile || !repositoryPath) {
        return {
          success: false,
          error: 'Storage not available. Write adapter or repository path missing.',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        // Generate new ID or use existing
        const diagramId = existingId || uuidv4();
        const filePath = getDiagramPath(diagramId);

        // Ensure name is stored in appState
        const dataToSave: ExcalidrawDiagramData = {
          ...data,
          appState: {
            ...data.appState,
            name,
          },
        };

        // Write the file
        const content = JSON.stringify(dataToSave, null, 2);
        await writeFile(filePath, content);

        return {
          success: true,
          diagramId,
          fileName: `${diagramId}.excalidraw`,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(err instanceof Error ? err : new Error(errorMessage));
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [writeFile, repositoryPath, getDiagramPath]
  );

  /**
   * Load a diagram by ID
   */
  const loadDiagram = useCallback(
    async (diagramId: string): Promise<LoadResult> => {
      if (!readFile || !repositoryPath) {
        return {
          success: false,
          error: 'Storage not available. Read adapter or repository path missing.',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const filePath = getDiagramPath(diagramId);
        const content = await readFile(filePath);
        const data = JSON.parse(content) as ExcalidrawDiagramData;

        return {
          success: true,
          data,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(err instanceof Error ? err : new Error(errorMessage));
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [readFile, repositoryPath, getDiagramPath]
  );

  /**
   * List all diagrams in the repository
   */
  const listDiagrams = useCallback(async (): Promise<ListResult> => {
    if (!repositoryPath) {
      return {
        success: false,
        error: 'No repository path available.',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const diagrams: DiagramListItem[] = [];

      // Strategy 1: Use fileTree if available
      if (fileTree?.allFiles) {
        const drawingFiles = fileTree.allFiles.filter(
          (file) =>
            file.path.includes(`/${DRAWINGS_DIR}/`) &&
            file.extension === '.excalidraw'
        );

        for (const file of drawingFiles) {
          // Extract ID from filename
          const fileName = file.name;
          const id = fileName.replace('.excalidraw', '');

          // Try to get name from file content if readFile is available
          let name = id; // Default to ID
          if (readFile) {
            try {
              const content = await readFile(file.path);
              const data = JSON.parse(content) as ExcalidrawDiagramData;
              name = data.appState?.name || id;
            } catch {
              // If we can't read, use ID as name
            }
          }

          diagrams.push({
            id,
            name,
            relativePath: file.relativePath,
            filePath: file.path,
            updatedAt: file.lastModified,
          });
        }
      }

      // Sort by most recently updated
      diagrams.sort((a, b) => {
        const aTime = a.updatedAt?.getTime() || 0;
        const bTime = b.updatedAt?.getTime() || 0;
        return bTime - aTime;
      });

      return {
        success: true,
        diagrams,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(err instanceof Error ? err : new Error(errorMessage));
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [repositoryPath, fileTree, readFile]);

  /**
   * Delete a diagram
   */
  const deleteDiagram = useCallback(
    async (diagramId: string): Promise<StorageResult> => {
      if (!deleteFile || !repositoryPath) {
        return {
          success: false,
          error: 'Storage not available. Delete adapter or repository path missing.',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const filePath = getDiagramPath(diagramId);
        await deleteFile(filePath);

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(err instanceof Error ? err : new Error(errorMessage));
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [deleteFile, repositoryPath, getDiagramPath]
  );

  return {
    saveDiagram,
    loadDiagram,
    listDiagrams,
    deleteDiagram,
    isStorageAvailable,
    repositoryPath,
    isLoading,
    error,
  };
}
