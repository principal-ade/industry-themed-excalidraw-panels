/**
 * ExcalidrawWrapper - Core Excalidraw component wrapper
 *
 * This component wraps the Excalidraw library and provides:
 * - Auto-save with debouncing
 * - Content hash tracking to skip redundant saves
 * - Draft naming for new diagrams
 * - Dark theme integration
 * - Manual save button with keyboard shortcut (Cmd/Ctrl+S)
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { useTheme } from '@principal-ade/industry-theme';
import { debounce } from 'lodash';
import type {
  ExcalidrawDiagramData,
  ExcalidrawAppState,
  LibraryItem,
  OrderedExcalidrawElement,
} from '../types/excalidraw';

export interface ExcalidrawWrapperProps {
  /** Called when scene changes */
  onChange?: (
    elements: readonly OrderedExcalidrawElement[],
    appState: ExcalidrawAppState
  ) => void;
  /** Initial diagram data to load */
  initialData?: ExcalidrawDiagramData;
  /** Called when close is requested */
  onClose?: () => void;
  /** Library items to load */
  libraryItems?: LibraryItem[];
  /** Existing diagram ID (if editing) */
  diagramId?: string;
  /** Diagram name */
  diagramName?: string;
  /** Save handler - returns the diagram ID */
  onSave?: (
    name: string,
    data: ExcalidrawDiagramData,
    existingId?: string
  ) => Promise<string>;
  /** Called when a new diagram is created */
  onDiagramCreated?: (diagramId: string) => void;
  /** Called when diagram name changes (e.g., auto-generated draft name) */
  onDiagramNameChange?: (name: string) => void;
  /** Show save button */
  showSaveButton?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Expose save function to parent */
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  /** Function to get next draft number */
  getNextDraftNumber?: () => Promise<number>;
}

export const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({
  onChange,
  initialData,
  onClose,
  libraryItems,
  diagramId,
  diagramName = 'Untitled Diagram',
  onSave,
  onDiagramCreated,
  onDiagramNameChange,
  showSaveButton = true,
  readOnly = false,
  saveRef,
  getNextDraftNumber,
}) => {
  const { theme } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState(diagramId);
  const currentDiagramIdRef = useRef(diagramId);
  const [currentLibraryItems, setCurrentLibraryItems] = useState<readonly LibraryItem[]>(
    libraryItems || initialData?.libraryItems || []
  );
  const [currentDiagramName, setCurrentDiagramName] = useState(diagramName);

  // Track last saved content hash to avoid unnecessary saves
  const lastSavedContentRef = useRef<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Track if diagram has been deleted to prevent saving
  const isDeletedRef = useRef(false);
  // Track if we've done the initial save for new diagrams
  const hasPerformedInitialSaveRef = useRef(false);
  // Track if this is the initial mount/load
  const isInitialLoadRef = useRef(true);
  // Track if we're loading a diagram
  const [isLoadingDiagram, setIsLoadingDiagram] = useState(false);
  // Track draft number for new diagrams
  const draftNumberRef = useRef<number | null>(null);

  // Update refs when props change
  useEffect(() => {
    if (diagramId !== currentDiagramIdRef.current) {
      currentDiagramIdRef.current = diagramId;
      setCurrentDiagramId(diagramId);
      draftNumberRef.current = null;
      isInitialLoadRef.current = true;
      setHasUnsavedChanges(false);
      isDeletedRef.current = false;
      hasPerformedInitialSaveRef.current = false;

      if (!diagramId && excalidrawAPI) {
        excalidrawAPI.resetScene();
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    }
    if (diagramName !== currentDiagramName) {
      setCurrentDiagramName(diagramName);
    }
  }, [diagramId, diagramName, excalidrawAPI, currentDiagramName]);

  // Load initial data when API is ready
  useEffect(() => {
    if (!excalidrawAPI) return;

    if (!initialData) {
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
      return;
    }

    let data = initialData;
    if (typeof initialData === 'string') {
      try {
        data = JSON.parse(initialData);
      } catch (e) {
        console.error('[ExcalidrawWrapper] Failed to parse initialData:', e);
        return;
      }
    }

    setIsLoadingDiagram(true);
    setTimeout(() => {
      try {
        excalidrawAPI.resetScene();

        setTimeout(() => {
          const { width, height, offsetLeft, offsetTop, scrollX, scrollY, ...cleanAppState } =
            (data.appState || {}) as Record<string, unknown>;

          excalidrawAPI.updateScene({
            elements: data.elements || [],
            appState: {
              ...cleanAppState,
              showWelcomeScreen: false,
              collaborators: new Map(),
            } as unknown as ExcalidrawAppState,
          });

          if (cleanAppState.name && typeof cleanAppState.name === 'string') {
            setCurrentDiagramName(cleanAppState.name);
          }

          setTimeout(() => {
            excalidrawAPI.refresh();
            window.dispatchEvent(new Event('resize'));
          }, 100);

          setIsLoadingDiagram(false);
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 500);
        }, 50);
      } catch (error) {
        console.error('[ExcalidrawWrapper] Error loading scene:', error);
        setIsLoadingDiagram(false);
        isInitialLoadRef.current = false;
      }
    }, 100);
  }, [excalidrawAPI, initialData, diagramId]);

  // Set dark theme
  useEffect(() => {
    if (excalidrawAPI && theme) {
      excalidrawAPI.updateScene({
        appState: { theme: 'dark' } as unknown as ExcalidrawAppState,
      });
    }
  }, [theme, excalidrawAPI]);

  // Update library items
  useEffect(() => {
    if (excalidrawAPI && libraryItems) {
      excalidrawAPI.updateLibrary({ libraryItems, merge: true });
    }
  }, [excalidrawAPI, libraryItems]);

  // Create refs to hold latest values for save function
  const saveDataRef = useRef({
    excalidrawAPI,
    diagramName: currentDiagramName,
    currentLibraryItems,
  });

  useEffect(() => {
    saveDataRef.current = {
      excalidrawAPI,
      diagramName: currentDiagramName,
      currentLibraryItems,
    };
  }, [excalidrawAPI, currentDiagramName, currentLibraryItems]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (isDeletedRef.current || !onSave) return;

    const { excalidrawAPI, currentLibraryItems } = saveDataRef.current;
    let { diagramName } = saveDataRef.current;

    if (!excalidrawAPI) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      setIsSaving(true);

      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      // Remove non-serializable properties
      const { collaborators, width, height, offsetLeft, offsetTop, scrollX, scrollY, ...serializableAppState } =
        appState as Record<string, unknown>;

      // Generate draft name if needed
      let saveName = diagramName;
      const existingDiagramId = currentDiagramIdRef.current;

      if (!existingDiagramId && saveName === 'Untitled Diagram' && getNextDraftNumber) {
        if (!draftNumberRef.current) {
          draftNumberRef.current = await getNextDraftNumber();
        }
        saveName = `Draft #${draftNumberRef.current}`;
        setCurrentDiagramName(saveName);
        saveDataRef.current.diagramName = saveName;
        onDiagramNameChange?.(saveName);

        excalidrawAPI.updateScene({
          appState: { name: saveName } as unknown as ExcalidrawAppState,
        });
      }

      const data: ExcalidrawDiagramData = {
        elements,
        appState: {
          ...serializableAppState,
          name: saveName,
        } as ExcalidrawAppState,
        files: files || {},
        libraryItems: currentLibraryItems,
        type: 'excalidraw',
        version: 2,
        source: 'excalidraw-panel',
      };

      const savedId = await onSave(saveName, data, existingDiagramId);

      if (!currentDiagramIdRef.current) {
        currentDiagramIdRef.current = savedId;
        setCurrentDiagramId(savedId);
        onDiagramCreated?.(savedId);
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[ExcalidrawWrapper] Failed to save diagram:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onDiagramCreated, onDiagramNameChange, getNextDraftNumber]);

  // Debounced auto-save
  const debouncedSave = useMemo(() => debounce(handleSave, 2000), [handleSave]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    isInitialLoadRef.current = false;
    await handleSave();
  }, [handleSave]);

  // Expose save function to parent
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleManualSave;
    }
  }, [saveRef, handleManualSave]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Initial save for new diagrams
  useEffect(() => {
    const performInitialSave = async () => {
      if (
        excalidrawAPI &&
        !diagramId &&
        !hasPerformedInitialSaveRef.current &&
        !initialData &&
        onSave
      ) {
        hasPerformedInitialSaveRef.current = true;
        setTimeout(async () => {
          isInitialLoadRef.current = false;
          await handleSave();
        }, 300);
      }
    };

    performInitialSave();
  }, [excalidrawAPI, diagramId, initialData, handleSave, onSave]);

  // Cleanup debounced save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: theme.colors.background,
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={
          initialData
            ? (() => {
                let data = initialData;
                if (typeof initialData === 'string') {
                  try {
                    data = JSON.parse(initialData);
                  } catch {
                    return undefined;
                  }
                }

                const { width, height, offsetLeft, offsetTop, scrollX, scrollY, ...cleanAppState } =
                  (data.appState || {}) as Record<string, unknown>;

                return {
                  elements: data.elements || [],
                  appState: {
                    ...cleanAppState,
                    collaborators: new Map(),
                  },
                  libraryItems: data.libraryItems || libraryItems || [],
                  files: data.files || {},
                };
              })()
            : undefined
        }
        onChange={(elements, appState) => {
          if (onChange && !isLoadingDiagram) {
            onChange(elements as OrderedExcalidrawElement[], appState);
          }

          // Auto-save on content changes
          if (!isInitialLoadRef.current && !isLoadingDiagram && !readOnly) {
            const contentHash = JSON.stringify(
              (elements as OrderedExcalidrawElement[]).map((el) => ({
                id: el.id,
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                text: 'text' in el ? el.text : undefined,
                points: 'points' in el ? el.points : undefined,
              }))
            );

            if (contentHash !== lastSavedContentRef.current) {
              setHasUnsavedChanges(true);
              lastSavedContentRef.current = contentHash;
              debouncedSave();
            }
          }
        }}
        onLibraryChange={(items) => {
          setCurrentLibraryItems(items);
        }}
        theme="dark"
        viewModeEnabled={readOnly}
        UIOptions={{
          canvasActions: {
            saveAsImage: false,
            saveToActiveFile: false,
            loadScene: false,
            export: {
              saveFileToDisk: true,
            },
          },
        }}
        renderTopRightUI={() =>
          showSaveButton && hasUnsavedChanges && !readOnly ? (
            <div style={{ marginRight: '10px' }}>
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isSaving
                    ? theme.colors.backgroundSecondary
                    : theme.colors.primary,
                  color: theme.colors.background,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  opacity: isSaving ? 0.6 : 1,
                }}
                title="Save (Cmd/Ctrl+S)"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : null
        }
      >
        <MainMenu />
      </Excalidraw>
    </div>
  );
};
