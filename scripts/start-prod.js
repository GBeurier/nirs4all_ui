#!/usr/bin/env node
/**
 * Production launcher script for nirs4all UI
 * Starts the backend and desktop app in production mode
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Check if dist folder exists
const distPath = join(rootDir, 'dist');
if (!existsSync(distPath)) {
  console.error('❌ ERROR: dist folder not found!');
  console.error('   Please run: npm run build');
  process.exit(1);
}

console.log('========================================');
console.log('Starting nirs4all in Production Mode');
console.log('========================================\n');

// Determine Python command
const pythonCmd = existsSync(join(rootDir, '.venv', 'Scripts', 'python.exe'))
  ? join(rootDir, '.venv', 'Scripts', 'python.exe')
  : 'python';

const pythonwCmd = existsSync(join(rootDir, '.venv', 'Scripts', 'pythonw.exe'))
  ? join(rootDir, '.venv', 'Scripts', 'pythonw.exe')
  : 'pythonw';

// Start backend in a new console window
console.log('[1/2] Starting backend server in new console...');
console.log('      (Backend console will show pipeline logs)\n');

const backend = spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', pythonCmd, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: rootDir,
  env: {
    ...process.env,
    TF_CPP_MIN_LOG_LEVEL: '2',
    TF_ENABLE_ONEDNN_OPTS: '0'
  },
  detached: true,
  stdio: 'ignore'
});

backend.unref();

// Wait for backend to start
console.log('      Waiting for backend to initialize...');
await new Promise(resolve => setTimeout(resolve, 4000));

// Start desktop app with python (not pythonw) so it can see the backend console
console.log('[2/2] Launching application window...\n');

const launcher = spawn(pythonCmd, ['launcher.py'], {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('========================================');
console.log('✅ Application Started!');
console.log('========================================');
console.log('\nWindows opened:');
console.log('  • Backend Console - Shows nirs4all pipeline logs');
console.log('  • Application Window - Main UI');
console.log('\nBackend: http://127.0.0.1:8000');
console.log('API Docs: http://127.0.0.1:8000/docs');
console.log('\nClose the application window to stop.');
console.log('========================================\n');

// Wait for launcher to exit (when app window is closed)
launcher.on('exit', (code) => {
  console.log('\nApplication window closed.');
  console.log('Cleaning up...');
  
  // Kill the backend server
  spawn('taskkill', ['/F', '/IM', 'python.exe', '/FI', 'WINDOWTITLE eq *uvicorn*'], {
    stdio: 'ignore'
  });
  
  process.exit(code || 0);
});

// Handle cleanup on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  launcher.kill();
  spawn('taskkill', ['/F', '/IM', 'python.exe', '/FI', 'WINDOWTITLE eq *uvicorn*'], {
    stdio: 'ignore'
  });
  process.exit(0);
});
