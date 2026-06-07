import React from 'react';
import { ThemeProvider } from '@principal-ade/industry-theme';
import type {
  PanelComponentProps,
  PanelContextValue,
  PanelActions,
  PanelEventEmitter,
  PanelEvent,
  PanelEventType,
  DataSlice,
} from '../types';
import type { FileTree } from '@principal-ai/repository-abstraction';

/**
 * Mock Git Status data for Storybook
 */
const mockGitStatusData = {
  staged: ['src/components/Button.tsx', 'src/styles/theme.css'],
  unstaged: ['README.md', 'package.json'],
  untracked: ['src/new-feature.tsx'],
  deleted: [],
};

/**
 * Mock FileTree data with allFiles for Excalidraw panels
 * Follows the FileTree interface from @principal-ai/repository-abstraction
 */
const mockFileTreeData: FileTree = {
  sha: 'mock-sha-12345',
  root: {
    name: 'my-project',
    path: '/Users/developer/my-project',
    relativePath: '.',
    depth: 0,
    fileCount: 3,
    totalSize: 4608,
    children: [
      {
        name: 'src',
        path: '/Users/developer/my-project/src',
        relativePath: 'src',
        depth: 1,
        fileCount: 0,
        totalSize: 0,
        children: [],
      },
      {
        name: '.alexandria',
        path: '/Users/developer/my-project/.alexandria',
        relativePath: '.alexandria',
        depth: 1,
        fileCount: 2,
        totalSize: 3584,
        children: [
          {
            name: 'drawings',
            path: '/Users/developer/my-project/.alexandria/drawings',
            relativePath: '.alexandria/drawings',
            depth: 2,
            fileCount: 2,
            totalSize: 3584,
            children: [],
          },
        ],
      },
    ],
  },
  allFiles: [
    {
      name: 'package.json',
      path: '/Users/developer/my-project/package.json',
      relativePath: 'package.json',
      extension: '.json',
      size: 1024,
      lastModified: new Date(Date.now() - 86400000),
      isDirectory: false,
    },
    {
      name: 'architecture.excalidraw',
      path: '/Users/developer/my-project/.alexandria/drawings/architecture.excalidraw',
      relativePath: '.alexandria/drawings/architecture.excalidraw',
      extension: '.excalidraw',
      size: 2048,
      lastModified: new Date(Date.now() - 3600000),
      isDirectory: false,
    },
    {
      name: 'flow-diagram.excalidraw',
      path: '/Users/developer/my-project/.alexandria/drawings/flow-diagram.excalidraw',
      relativePath: '.alexandria/drawings/flow-diagram.excalidraw',
      extension: '.excalidraw',
      size: 1536,
      lastModified: new Date(Date.now() - 7200000),
      isDirectory: false,
    },
  ],
  allDirectories: [
    {
      name: 'my-project',
      path: '/Users/developer/my-project',
      relativePath: '.',
      depth: 0,
      fileCount: 3,
      totalSize: 4608,
      children: [],
    },
    {
      name: 'src',
      path: '/Users/developer/my-project/src',
      relativePath: 'src',
      depth: 1,
      fileCount: 0,
      totalSize: 0,
      children: [],
    },
    {
      name: '.alexandria',
      path: '/Users/developer/my-project/.alexandria',
      relativePath: '.alexandria',
      depth: 1,
      fileCount: 2,
      totalSize: 3584,
      children: [],
    },
    {
      name: 'drawings',
      path: '/Users/developer/my-project/.alexandria/drawings',
      relativePath: '.alexandria/drawings',
      depth: 2,
      fileCount: 2,
      totalSize: 3584,
      children: [],
    },
  ],
  stats: {
    totalFiles: 3,
    totalDirectories: 4,
    totalSize: 4608,
    maxDepth: 3,
  },
  metadata: {
    id: 'mock-filetree-id',
    timestamp: new Date(),
    sourceType: 'local',
    sourceInfo: {
      path: '/Users/developer/my-project',
    },
  },
};

/**
 * Mock Excalidraw diagram data
 */
const mockDiagramData = {
  type: 'excalidraw' as const,
  version: 2,
  source: 'excalidraw-panel',
  elements: [],
  appState: {
    name: 'Architecture Diagram',
    theme: 'dark',
  },
  files: {},
};

/**
 * In-memory storage for mock diagrams
 */
const mockDiagramStorage = new Map<string, string>([
  ['architecture', JSON.stringify({ ...mockDiagramData, appState: { ...mockDiagramData.appState, name: 'Architecture Diagram' } })],
  ['flow-diagram', JSON.stringify({ ...mockDiagramData, appState: { ...mockDiagramData.appState, name: 'Flow Diagram' } })],
]);

/**
 * Create mock adapters for Excalidraw storage
 */
export const createMockAdapters = () => ({
  readFile: async (path: string): Promise<string> => {
    console.log('[Mock] Reading file:', path);
    // Extract diagram ID from path
    const match = path.match(/\.alexandria\/drawings\/([^/]+)\.excalidraw$/);
    if (match) {
      const id = match[1];
      const content = mockDiagramStorage.get(id);
      if (content) return content;
    }
    throw new Error(`File not found: ${path}`);
  },
  writeFile: async (path: string, content: string): Promise<void> => {
    console.log('[Mock] Writing file:', path);
    const match = path.match(/\.alexandria\/drawings\/([^/]+)\.excalidraw$/);
    if (match) {
      const id = match[1];
      mockDiagramStorage.set(id, content);
    }
  },
  deleteFile: async (path: string): Promise<void> => {
    console.log('[Mock] Deleting file:', path);
    const match = path.match(/\.alexandria\/drawings\/([^/]+)\.excalidraw$/);
    if (match) {
      const id = match[1];
      mockDiagramStorage.delete(id);
    }
  },
});

/**
 * Create a mock DataSlice
 */
const createMockSlice = <T,>(
  name: string,
  data: T,
  scope: 'workspace' | 'repository' | 'global' = 'repository'
): DataSlice<T> => ({
  scope,
  name,
  data,
  loading: false,
  error: null,
  refresh: async () => {
    console.log(`[Mock] Refreshing slice: ${name}`);
  },
});

/**
 * Mock Panel Context for Storybook
 */
export const createMockContext = (
  overrides?: Partial<PanelContextValue>
): PanelContextValue => {
  const mockAdapters = createMockAdapters();

  // Create mock data slices
  const mockSlices = new Map<string, DataSlice>([
    ['git', createMockSlice('git', mockGitStatusData)],
    [
      'markdown',
      createMockSlice('markdown', [
        {
          path: 'README.md',
          title: 'Project README',
          lastModified: Date.now() - 3600000,
        },
        {
          path: 'docs/API.md',
          title: 'API Documentation',
          lastModified: Date.now() - 86400000,
        },
      ]),
    ],
    ['fileTree', createMockSlice('fileTree', mockFileTreeData)],
    [
      'packages',
      createMockSlice('packages', [
        { name: 'react', version: '19.0.0', path: '/node_modules/react' },
        {
          name: 'typescript',
          version: '5.0.4',
          path: '/node_modules/typescript',
        },
      ]),
    ],
    [
      'quality',
      createMockSlice('quality', {
        coverage: 85,
        issues: 3,
        complexity: 12,
      }),
    ],
  ]);

  const defaultContext: PanelContextValue = {
    currentScope: {
      type: 'repository',
      workspace: {
        name: 'my-workspace',
        path: '/Users/developer/my-workspace',
      },
      repository: {
        name: 'my-project',
        path: '/Users/developer/my-project',
      },
    },
    slices: mockSlices,
    adapters: mockAdapters,
    getSlice: <T,>(name: string): DataSlice<T> | undefined => {
      return mockSlices.get(name) as DataSlice<T> | undefined;
    },
    getWorkspaceSlice: <T,>(name: string): DataSlice<T> | undefined => {
      const slice = mockSlices.get(name);
      return slice?.scope === 'workspace'
        ? (slice as DataSlice<T>)
        : undefined;
    },
    getRepositorySlice: <T,>(name: string): DataSlice<T> | undefined => {
      const slice = mockSlices.get(name);
      return slice?.scope === 'repository'
        ? (slice as DataSlice<T>)
        : undefined;
    },
    hasSlice: (name: string, scope?: 'workspace' | 'repository'): boolean => {
      const slice = mockSlices.get(name);
      if (!slice) return false;
      if (!scope) return true;
      return slice.scope === scope;
    },
    isSliceLoading: (
      name: string,
      scope?: 'workspace' | 'repository'
    ): boolean => {
      const slice = mockSlices.get(name);
      if (!slice) return false;
      if (scope && slice.scope !== scope) return false;
      return slice.loading;
    },
    refresh: async (
      scope?: 'workspace' | 'repository',
      slice?: string
    ): Promise<void> => {
      console.log('[Mock] Context refresh called', { scope, slice });
    },
  };

  return { ...defaultContext, ...overrides };
};

/**
 * Mock Panel Actions for Storybook
 */
export const createMockActions = (
  overrides?: Partial<PanelActions>
): PanelActions => ({
  openFile: (filePath: string) => {
    console.log('[Mock] Opening file:', filePath);
  },
  openGitDiff: (filePath: string, status) => {
    console.log('[Mock] Opening git diff:', filePath, status);
  },
  navigateToPanel: (panelId: string) => {
    console.log('[Mock] Navigating to panel:', panelId);
  },
  notifyPanels: (event) => {
    console.log('[Mock] Notifying panels:', event);
  },
  ...overrides,
});

/**
 * Mock Event Emitter for Storybook
 */
export const createMockEvents = (): PanelEventEmitter => {
  const handlers = new Map<
    PanelEventType,
    Set<(event: PanelEvent<unknown>) => void>
  >();

  return {
    emit: (event) => {
      console.log('[Mock] Emitting event:', event);
      const eventHandlers = handlers.get(event.type);
      if (eventHandlers) {
        eventHandlers.forEach((handler) => handler(event));
      }
    },
    on: (type, handler) => {
      console.log('[Mock] Subscribing to event:', type);
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler as (event: PanelEvent<unknown>) => void);

      return () => {
        console.log('[Mock] Unsubscribing from event:', type);
        handlers
          .get(type)
          ?.delete(handler as (event: PanelEvent<unknown>) => void);
      };
    },
    off: (type, handler) => {
      console.log('[Mock] Removing event handler:', type);
      handlers
        .get(type)
        ?.delete(handler as (event: PanelEvent<unknown>) => void);
    },
  };
};

/**
 * Mock Panel Props Provider
 * Wraps components with mock context and ThemeProvider for Storybook
 */
export const MockPanelProvider: React.FC<{
  children: (props: PanelComponentProps) => React.ReactNode;
  contextOverrides?: Partial<PanelContextValue>;
  actionsOverrides?: Partial<PanelActions>;
}> = ({ children, contextOverrides, actionsOverrides }) => {
  const context = createMockContext(contextOverrides);
  const actions = createMockActions(actionsOverrides);
  const events = createMockEvents();

  return <ThemeProvider>{children({ context, actions, events })}</ThemeProvider>;
};

/**
 * Mock Panel Provider with no repository (for testing empty states)
 */
export const MockPanelProviderNoRepo: React.FC<{
  children: (props: PanelComponentProps) => React.ReactNode;
}> = ({ children }) => {
  const context = createMockContext({
    currentScope: {
      type: 'workspace',
      workspace: {
        name: 'my-workspace',
        path: '/Users/developer/my-workspace',
      },
      repository: undefined,
    },
  });
  const actions = createMockActions();
  const events = createMockEvents();

  return <ThemeProvider>{children({ context, actions, events })}</ThemeProvider>;
};
