import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { encryptedRawPlugin } from './scripts/vite-decrypt-plugin'

export default defineConfig({
  plugins: [encryptedRawPlugin(), react()],
  base: '/RCIS-26/',
})
