import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Force production JSX runtime to avoid jsxDEV in output
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
  ],
  define: {
    // Ensure NODE_ENV is production for React
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'PanelExtension',
      fileName: 'panels.bundle',
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize peer dependencies - these come from the host application.
      // @excalidraw/excalidraw (~69MB) and industry-theme are shipped by the
      // host; bundling our own copies would bloat the panel and break the
      // shared theme-context singleton. panel-framework-core is type-only.
      // Regex tails so subpath imports (e.g. CSS) are externalized too.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@excalidraw\/excalidraw(\/.*)?$/,
        /^@principal-ade\/industry-theme(\/.*)?$/,
        /^@principal-ade\/panel-framework-core(\/.*)?$/,
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Ensure production mode build
    minify: false,
  },
  // Force production mode for consistent JSX runtime
  mode: 'production',
}));
