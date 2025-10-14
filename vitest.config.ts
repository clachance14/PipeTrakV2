import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      css: true,
      env: {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
      },
      coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/App.tsx',
        'src/pages/**',
        'src/types/**',
        'src/lib/utils.ts',
        'src/lib/supabase.ts',
        'src/components/Layout.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        'src/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/components/**': {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },
      skipFull: process.env.SKIP_COVERAGE === 'true',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/tests': path.resolve(__dirname, './tests'),
      },
    },
  }
})
