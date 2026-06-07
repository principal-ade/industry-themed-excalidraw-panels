/**
 * DrawingsListPanel - Diagram browser and manager panel
 *
 * This panel provides:
 * - List of all Excalidraw diagrams in the repository
 * - Search/filter functionality
 * - Click to open in ExcalidrawPanel
 * - Delete diagram functionality
 * - Last modified display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Clock, Plus, Copy, Search, X } from 'lucide-react';
import { useTheme } from '@principal-ade/industry-theme';
import type { PanelComponentProps } from '../types';
import { useExcalidrawStorage } from '../hooks/useExcalidrawStorage';
import {
  DIAGRAM_EVENTS,
  type DiagramCreatedPayload,
  type RefreshListPayload,
} from '../events/diagramEvents';
import type { DiagramListItem } from '../types/excalidraw';

/**
 * DrawingsListPanel - Diagram browser panel component
 */
export const DrawingsListPanel: React.FC<PanelComponentProps> = ({
  context,
  actions,
  events,
}) => {
  const { theme } = useTheme();
  const storage = useExcalidrawStorage(context);

  // State
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load diagrams list
  const loadDiagrams = useCallback(async () => {
    setIsLoading(true);
    const result = await storage.listDiagrams();
    if (result.success && result.diagrams) {
      setDiagrams(result.diagrams);
    } else {
      setDiagrams([]);
    }
    setIsLoading(false);
  }, [storage]);

  // Initial load
  useEffect(() => {
    loadDiagrams();
  }, [loadDiagrams]);

  // Listen for diagram events to refresh list
  useEffect(() => {
    const unsubscribers = [
      events.on<DiagramCreatedPayload>(DIAGRAM_EVENTS.DIAGRAM_CREATED, (event) => {
        loadDiagrams();
        if (event.payload?.id) {
          setSelectedDiagramId(event.payload.id);
        }
      }),

      events.on(DIAGRAM_EVENTS.DIAGRAM_SAVED, () => {
        loadDiagrams();
      }),

      events.on(DIAGRAM_EVENTS.DIAGRAM_DELETED, () => {
        loadDiagrams();
      }),

      events.on<RefreshListPayload>(DIAGRAM_EVENTS.REFRESH_LIST, () => {
        loadDiagrams();
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [events, loadDiagrams]);

  // Handle diagram click - emit event to open in editor
  const handleDiagramClick = (diagram: DiagramListItem) => {
    setSelectedDiagramId(diagram.id);

    // Emit event to open diagram
    events.emit({
      type: DIAGRAM_EVENTS.OPEN_DIAGRAM,
      source: 'principal-ade.excalidraw-list',
      timestamp: Date.now(),
      payload: { diagramId: diagram.id },
    });
  };

  // Handle create new
  const handleCreateNew = () => {
    events.emit({
      type: DIAGRAM_EVENTS.CREATE_DIAGRAM,
      source: 'principal-ade.excalidraw-list',
      timestamp: Date.now(),
      payload: {},
    });
  };

  // Handle copy path
  const handleCopyPath = async (diagram: DiagramListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (diagram.filePath) {
      try {
        await navigator.clipboard.writeText(diagram.filePath);
      } catch (err) {
        console.error('Failed to copy path:', err);
      }
    }
  };

  // Handle delete
  const handleDelete = async (diagram: DiagramListItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${diagram.name}"?`)) {
      return;
    }

    const result = await storage.deleteDiagram(diagram.id);
    if (result.success) {
      // Emit delete event
      events.emit({
        type: DIAGRAM_EVENTS.DIAGRAM_DELETED,
        source: 'principal-ade.excalidraw-list',
        timestamp: Date.now(),
        payload: {
          id: diagram.id,
          repositoryPath: storage.repositoryPath,
        },
      });

      if (selectedDiagramId === diagram.id) {
        setSelectedDiagramId(null);
      }
    }
  };

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  // Filter diagrams
  const filteredDiagrams = filterText
    ? diagrams.filter((d) =>
        d.name.toLowerCase().includes(filterText.toLowerCase())
      )
    : diagrams;

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
          gap: '8px',
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
          Select a repository to view its drawings.
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.textSecondary,
          fontFamily: theme.fonts.body,
          backgroundColor: theme.colors.background,
        }}
      >
        Loading drawings...
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
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: theme.colors.backgroundLight,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Pencil size={16} color={theme.colors.primary} />
          <span
            style={{
              fontSize: theme.fontSizes[1],
              fontWeight: theme.fontWeights.semibold,
              color: theme.colors.text,
            }}
          >
            Drawings ({diagrams.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: showSearch ? `${theme.colors.primary}20` : 'transparent',
              color: showSearch ? theme.colors.primary : theme.colors.textSecondary,
              cursor: 'pointer',
            }}
            title="Search"
          >
            <Search size={16} />
          </button>

          <button
            onClick={handleCreateNew}
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
              fontWeight: theme.fontWeights.medium,
            }}
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Search input */}
        {showSearch && (
          <div
            style={{
              width: '100%',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Filter drawings..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                fontSize: theme.fontSizes[0],
                fontFamily: theme.fonts.body,
                outline: 'none',
              }}
              autoFocus
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Diagrams List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {filteredDiagrams.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: theme.colors.textSecondary,
              fontSize: theme.fontSizes[1],
              gap: '16px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <Pencil size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontWeight: theme.fontWeights.medium }}>
              {filterText ? 'No matching drawings' : 'No drawings yet'}
            </div>
            {!filterText && (
              <>
                <div
                  style={{
                    fontSize: theme.fontSizes[0],
                    opacity: 0.7,
                    maxWidth: '300px',
                  }}
                >
                  Create your first drawing to get started.
                </div>
                <button
                  onClick={handleCreateNew}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.background,
                    cursor: 'pointer',
                    fontSize: theme.fontSizes[1],
                    fontWeight: theme.fontWeights.medium,
                  }}
                >
                  <Plus size={16} />
                  Create Drawing
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredDiagrams.map((diagram) => (
              <div
                key={diagram.id}
                onClick={() => handleDiagramClick(diagram)}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    selectedDiagramId === diagram.id
                      ? theme.colors.primary
                      : theme.colors.border
                  }`,
                  backgroundColor:
                    selectedDiagramId === diagram.id
                      ? `${theme.colors.primary}15`
                      : theme.colors.backgroundSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (selectedDiagramId !== diagram.id) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundLight;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDiagramId !== diagram.id) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Pencil size={14} color={theme.colors.primary} />
                    <span
                      style={{
                        fontSize: theme.fontSizes[1],
                        fontWeight: theme.fontWeights.medium,
                        color: theme.colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {diagram.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {diagram.filePath && (
                      <button
                        onClick={(e) => handleCopyPath(diagram, e)}
                        title="Copy file path"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: theme.colors.textSecondary,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${theme.colors.primary}20`;
                          e.currentTarget.style.color = theme.colors.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = theme.colors.textSecondary;
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(diagram, e)}
                      title="Delete drawing"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: theme.colors.textSecondary,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.colors.error}20`;
                        e.currentTarget.style.color = theme.colors.error;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {diagram.updatedAt && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: theme.fontSizes[0],
                      color: theme.colors.textSecondary,
                    }}
                  >
                    <Clock size={10} />
                    <span>{formatDate(diagram.updatedAt)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
