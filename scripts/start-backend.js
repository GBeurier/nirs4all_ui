#!/usr/bin/env node
// Start backend helper
// Reads BACKEND_CMD from environment and spawns it in a shell.

const { spawn } = require('child_process');

const cmd = process.env.BACKEND_CMD;

if (!cmd) {
  console.error('\nERROR: No BACKEND_CMD defined.\n');
  console.error('Set the BACKEND_CMD environment variable to the command that starts your backend.');
  console.error('Example (bash):');
  console.error('  export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"');
  console.error('Example (PowerShell):');
  console.error('  $env:BACKEND_CMD = "cd ..\\nirs4all && uvicorn main:app --reload --port 8000"');
  process.exit(1);
}

console.log('Starting backend: ' + cmd);

const p = spawn(cmd, { stdio: 'inherit', shell: true });

p.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code);
});

p.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
