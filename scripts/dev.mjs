// Remove ELECTRON_RUN_AS_NODE (que faz Electron rodar como Node puro)
// e então inicia o electron-vite dev.
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = await import('node:child_process')
const child = spawn('npx', ['electron-vite', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
})

child.on('close', (code) => process.exit(code ?? 0))
