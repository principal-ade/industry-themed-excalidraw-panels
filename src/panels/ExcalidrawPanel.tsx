/**
 * ExcalidrawPanel - Main Excalidraw diagram editor panel
 *
 * This panel provides a full-featured Excalidraw editor with:
 * - Diagram creation and editing
 * - Auto-save to Alexandria Memory Palace
 * - Integration with panel events system
 * - Dark theme integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Plus, ArrowLeft } from 'lucide-react';
import { useTheme } from '@principal-ade/industry-theme';
import type { PanelComponentProps } from '../types';
import { ExcalidrawWrapper } from '../components/ExcalidrawWrapper';
import { useExcalidrawStorage } from '../hooks/useExcalidrawStorage';
import {
  DIAGRAM_EVENTS,
  type OpenDiagramPayload,
  type CreateDiagramPayload,
  type DiagramDeletedPayload,
} from '../events/diagramEvents';
import type { ExcalidrawDiagramData, DiagramListItem } from '../types/excalidraw';

/**
 * ExcalidrawPanel - Main editor panel component
 */
export const ExcalidrawPanel: React.FC<PanelComponentProps> = ({
  context,
  actions,
  events,
}) => {
  const { theme } = useTheme();
  const storage = useExcalidrawStorage(context);

  // State
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [currentDiagramName, setCurrentDiagramName] = useState<string>('Untitled Diagram');
  const [initialData, setInitialData] = useState<ExcalidrawDiagramData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([]);

  // Ref for ExcalidrawWrapper save function
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  // Load diagrams list for draft numbering
  const loadDiagramsList = useCallback(async () => {
    const result = await storage.listDiagrams();
    if (result.success && result.diagrams) {
      setDiagrams(result.diagrams);
    }
  }, [storage]);

  useEffect(() => {
    loadDiagramsList();
  }, [loadDiagramsList]);

  // Load a diagram by ID
  const loadDiagram = useCallback(
    async (diagramId: string) => {
      setIsLoading(true);
      setError(null);

      const result = await storage.loadDiagram(diagramId);

      if (result.success && result.data) {
        setCurrentDiagramId(diagramId);
        setCurrentDiagramName(result.data.appState?.name || diagramId);
        setInitialData(result.data);

        // Emit opened event
        events.emit({
          type: DIAGRAM_EVENTS.DIAGRAM_OPENED,
          source: 'principal-ade.excalidraw-editor',
          timestamp: Date.now(),
          payload: { id: diagramId, name: result.data.appState?.name || diagramId },
        });
      } else {
        setError(result.error || 'Failed to load diagram');
      }

      setIsLoading(false);
    },
    [storage, events]
  );

  // Create a new diagram
  const createNewDiagram = useCallback(() => {
    setCurrentDiagramId(null);
    setCurrentDiagramName('Untitled Diagram');
    setInitialData(null);
    setError(null);
  }, []);

  // Save handler for ExcalidrawWrapper
  const handleSave = useCallback(
    async (
      name: string,
      data: ExcalidrawDiagramData,
      existingId?: string
    ): Promise<string> => {
      const result = await storage.saveDiagram(name, data, existingId);

      if (result.success && result.diagramId) {
        // Emit appropriate event
        const eventType = existingId
          ? DIAGRAM_EVENTS.DIAGRAM_SAVED
          : DIAGRAM_EVENTS.DIAGRAM_CREATED;

        events.emit({
          type: eventType,
          source: 'principal-ade.excalidraw-editor',
          timestamp: Date.now(),
          payload: {
            id: result.diagramId,
            name,
            repositoryPath: storage.repositoryPath,
          },
        });

        // Refresh diagrams list
        loadDiagramsList();

        return result.diagramId;
      }

      throw new Error(result.error || 'Failed to save diagram');
    },
    [storage, events, loadDiagramsList]
  );

  // Get next draft number
  const getNextDraftNumber = useCallback(async (): Promise<number> => {
    const draftNumbers = diagrams
      .filter((d) => d.name.startsWith('Draft #'))
      .map((d) => {
        const match = d.name.match(/Draft #(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
    return draftNumbers.length > 0 ? Math.max(...draftNumbers) + 1 : 1;
  }, [diagrams]);

  // Listen for panel events
  useEffect(() => {
    const unsubscribers = [
      // Open diagram tool event
      events.on<OpenDiagramPayload>(DIAGRAM_EVENTS.OPEN_DIAGRAM, (event) => {
        if (event.payload?.diagramId) {
          loadDiagram(event.payload.diagramId);
        }
      }),

      // Create diagram tool event
      events.on<CreateDiagramPayload>(DIAGRAM_EVENTS.CREATE_DIAGRAM, () => {
        createNewDiagram();
      }),

      // Listen for deletions to clear editor if current diagram is deleted
      events.on<DiagramDeletedPayload>(DIAGRAM_EVENTS.DIAGRAM_DELETED, (event) => {
        if (event.payload?.id === currentDiagramId) {
          createNewDiagram();
        }
        loadDiagramsList();
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [events, loadDiagram, createNewDiagram, currentDiagramId, loadDiagramsList]);

  // No repository available
  if (!storage.repositoryPath) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
          fontSize: theme.fontSizes[1],
          fontFamily: theme.fonts.body,
          gap: '12px',
          backgroundColor: theme.colors.background,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <Pencil size={48} style={{ opacity: 0.3 }} />
        <div style={{ fontWeight: theme.fontWeights.medium }}>
          No repository selected
        </div>
        <div
          style={{
            fontSize: theme.fontSizes[0],
            opacity: 0.7,
            maxWidth: '400px',
          }}
        >
          Select a repository to create and edit diagrams.
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
          color: theme.colors.textSecondary,
          fontFamily: theme.fonts.body,
        }}
      >
        Loading diagram...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
          color: theme.colors.error,
          fontFamily: theme.fonts.body,
          gap: '12px',
          padding: '20px',
        }}
      >
        <div>Error: {error}</div>
        <button
          onClick={createNewDiagram}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            cursor: 'pointer',
            fontFamily: theme.fonts.body,
          }}
        >
          Create New Diagram
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: theme.colors.backgroundLight,
          flexShrink: 0,
        }}
      >
        <Pencil size={16} color={theme.colors.primary} />
        <span
          style={{
            fontSize: theme.fontSizes[1],
            fontWeight: theme.fontWeights.medium,
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentDiagramName}
        </span>
        <button
          onClick={createNewDiagram}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            cursor: 'pointer',
            fontSize: theme.fontSizes[0],
            fontFamily: theme.fonts.body,
            fontWeight: theme.fontWeights.medium,
          }}
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {/* Excalidraw Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ExcalidrawWrapper
          key={currentDiagramId || 'new'}
          diagramId={currentDiagramId || undefined}
          diagramName={currentDiagramName}
          initialData={initialData || undefined}
          onSave={handleSave}
          onDiagramCreated={(id) => {
            setCurrentDiagramId(id);
          }}
          onDiagramNameChange={(name) => {
            setCurrentDiagramName(name);
          }}
          saveRef={saveRef}
          getNextDraftNumber={getNextDraftNumber}
          showSaveButton={true}
        />
      </div>
    </div>
  );
};
