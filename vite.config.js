import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // CRITICAL FIX: Set base path to relative root. This fixes blank screens
  // on Netlify/Vercel when serving assets.
  base: './', 
  plugins: [react()],
})