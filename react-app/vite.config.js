import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// base './' lets the built site run from any folder (public_html, a subfolder or GitHub Pages)
export default defineConfig({plugins:[react()],base:'./'});
