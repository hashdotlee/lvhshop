import * as esbuild from 'esbuild'
import { copyFileSync, mkdirSync, cpSync, writeFileSync } from 'fs'

const isWatch = process.argv.includes('--watch')

// Create output directories
for (const dir of ['dist', 'dist/popup', 'dist/options', 'dist/background', 'dist/content', 'dist/icons']) {
  mkdirSync(dir, { recursive: true })
}

// Copy static files
copyFileSync('manifest.json', 'dist/manifest.json')
copyFileSync('src/popup/index.html', 'dist/popup/index.html')
copyFileSync('src/options/index.html', 'dist/options/index.html')
copyFileSync('src/content/content.css', 'dist/content/content.css')
cpSync('icons', 'dist/icons', { recursive: true })

const sharedConfig = {
  bundle: true,
  target: 'chrome99',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
}

// Background service worker (ESM for MV3)
const bgCtx = await esbuild.context({
  ...sharedConfig,
  entryPoints: ['src/background/index.ts'],
  outdir: 'dist/background',
  format: 'esm',
})

// Content script (IIFE - no module scope)
const contentCtx = await esbuild.context({
  ...sharedConfig,
  entryPoints: ['src/content/index.ts'],
  outdir: 'dist/content',
  format: 'iife',
  globalName: 'FbSaverContent',
})

// Popup and Options (React, IIFE)
const uiCtx = await esbuild.context({
  ...sharedConfig,
  entryPoints: {
    'popup/popup': 'src/popup/index.tsx',
    'options/options': 'src/options/index.tsx',
  },
  outdir: 'dist',
  format: 'iife',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
})

if (isWatch) {
  await bgCtx.watch()
  await contentCtx.watch()
  await uiCtx.watch()
  console.log('Watching for changes...')
} else {
  await bgCtx.rebuild()
  await contentCtx.rebuild()
  await uiCtx.rebuild()
  await bgCtx.dispose()
  await contentCtx.dispose()
  await uiCtx.dispose()
  console.log('Build complete → dist/')
}
