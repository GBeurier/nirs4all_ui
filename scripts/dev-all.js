#!/usr/bin/env node
// dev-all: spawn both frontend (Vite) and backend commands in parallel
// Requires BACKEND_CMD environment variable (or edit package.json to hardcode a command)

import { spawn } from 'child_process';

const backendCmd = process.env.BACKEND_CMD;
const envForChildren = { ...process.env, VITE_DEV: 'true' };

if (!backendCmd) {
  console.error('\nERROR: BACKEND_CMD is not set.');
  console.error('Set BACKEND_CMD environment variable to the command that starts your backend.');
  console.error('Examples:');
  console.error('  Bash:   export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"');
  console.error('  PS:     $env:BACKEND_CMD = "cd ..\\nirs4all && uvicorn main:app --reload --port 8000"');
  console.error('\nAlternatively, set BACKEND_CMD in your shell or CI to the appropriate command.');
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

console.log('Starting frontend (Vite) and backend:');
console.log(' - frontend: npm run dev (with VITE_DEV=true)');
console.log(' - backend: ' + backendCmd + '\n');

const frontend = spawn('npm', ['run', 'dev'], { env: envForChildren, shell: true });
const backend = spawn(backendCmd, { env: envForChildren, shell: true });

prefixStream('frontend', frontend.stdout);
prefixStream('frontend', frontend.stderr);
prefixStream('backend', backend.stdout);
prefixStream('backend', backend.stderr);

let exiting = false;

function shutdown(code) {
  if (exiting) return;
  exiting = true;
  console.log('\nShutting down children...');
  try { frontend.kill(); } catch (e) { /* ignore */ }
  try { backend.kill(); } catch (e) { /* ignore */ }
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
