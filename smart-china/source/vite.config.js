import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const LIVE = process.env.VITE_USE_MOCK === 'false'

/** Live build: the catalogue comes from the server, so the bundled sample catalogue is replaced by empty data. */
const dropMockCatalogue = {
  name: 'drop-mock-catalogue',
  enforce: 'pre',
  resolveId(id) { if (LIVE && /mocks\/(products|descriptions)\.json$/.test(id)) return `\0empty:${id.includes('products') ? 'array' : 'object'}` },
  load(id) { if (id.startsWith('\0empty:')) return `export default ${id.endsWith('array') ? '[]' : '{}'}` },
}

// VITE_BASE lets the same build run at a domain root (/) or under GitHub Pages (/repo-name/)
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [dropMockCatalogue, react(), tailwindcss()],
  server: { port: 5173 },
})
