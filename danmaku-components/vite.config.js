import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    react(),
    dts({
      outDir: ['dist/types', 'dist/vue/types', 'dist/react/types', 'dist/core/types'],
      include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue', 'src/**/*.js', 'src/**/*.jsx']
    })
  ],
  build: {
    target: 'es2015',
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DanmakuComponents',
      fileName: (format) => `danmaku-components.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'react', 'react-dom'],
      output: {
        globals: {
          vue: 'Vue',
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})