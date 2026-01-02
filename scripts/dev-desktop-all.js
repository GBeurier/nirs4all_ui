#!/usr/bin/env node
// Dev desktop all: start frontend (Vite), backend (BACKEND_CMD) and then launcher.py (pywebview)
// Usage: set BACKEND_CMD env variable before running, e.g.:
//   Bash: export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"
//   PS:   $env:BACKEND_CMD = "cd ..\\nirs4all && uvicorn main:app --reload --port 8000"

import { spawn } from 'child_process';
import http from 'http';

const backendCmd = process.env.BACKEND_CMD;
const viteUrl = process.env.VITE_URL || 'http://localhost:5173';
const maxWaitMs = 60000; // wait up to 60s for Vite

if (!backendCmd) {
  console.error('\nERROR: BACKEND_CMD is not set.');
  console.error('Set BACKEND_CMD environment variable to the command that starts your backend.');
  console.error('Examples:');
  console.error('  Bash:   export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"');
  console.error('  PS:     $env:BACKEND_CMD = "cd ..\\nirs4all && uvicorn main:app --reload --port 8000"');
  process.exit(1);
}

function prefixStream(prefix, stream) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) console.log(`[${prefix}] ${lines[i]}`);
    }
  });
}

console.log('Starting frontend (Vite), backend and launcher...');
console.log(' - frontend: npm run dev');
console.log(' - backend: ' + backendCmd);
console.log(' - launcher: python launcher.py (started once frontend is reachable)\n');

const envForChildren = { ...process.env, VITE_DEV: 'true' };

const frontend = spawn('npm', ['run', 'dev'], { env: envForChildren, shell: true });
prefixStream('frontend', frontend.stdout);
prefixStream('frontend', frontend.stderr);

const backend = spawn(backendCmd, { env: envForChildren, shell: true });
prefixStream('backend', backend.stdout);
prefixStream('backend', backend.stderr);

let launcher = null;
let exiting = false;

function shutdown(code) {
  if (exiting) return;
  exiting = true;
  console.log('\nShutting down children...');
  try { frontend.kill(); } catch (e) {}
  try { backend.kill(); } catch (e) {}
  try { if (launcher) launcher.kill(); } catch (e) {}
  process.exit(code || 0);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

frontend.on('exit', (code) => {
  console.log('[frontend] exited with', code);
  shutdown(code);
});

backend.on('exit', (code) => {
  console.log('[backend] exited with', code);
  shutdown(code);
});

function checkViteReady(timeoutMs = maxWaitMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const req = http.get(viteUrl, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timeout waiting for Vite dev server'));
        } else {
          setTimeout(attempt, 500);
        }
      });
    }
    attempt();
  });
}

(async () => {
  try {
    await checkViteReady();
    console.log('Vite dev server is ready. Launching desktop launcher...');
    launcher = spawn('python', ['launcher.py'], { env: envForChildren, shell: true });
    prefixStream('launcher', launcher.stdout);
    prefixStream('launcher', launcher.stderr);

    launcher.on('exit', (code) => {
      console.log('[launcher] exited with', code);
      shutdown(code);
    });
  } catch (err) {
    console.error('Failed to detect Vite ready:', err.message || err);
    shutdown(1);
  }
})();
