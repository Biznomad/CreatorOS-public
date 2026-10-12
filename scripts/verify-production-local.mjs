import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const port = process.env.CREATOROS_VERIFY_PORT || '3100';
const appBase = (process.env.CREATOROS_APP_BASE || `http://localhost:${port}`).replace(/\/$/, '');
const shouldStartLocalServer = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appBase);
const shouldKeepExistingServer = process.env.CREATOROS_VERIFY_KEEP_EXISTING_SERVER === 'true';
const execFileAsync = promisify(execFile);

let serverProcess = null;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...(options.env || {}) },
      stdio: options.stdio || 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? signal}`));
    });
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 45_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function getListeningPids(port) {
  try {
    const { stdout } = await execFileAsync('lsof', [
      `-tiTCP:${port}`,
      '-sTCP:LISTEN',
    ]);
    return stdout
      .split(/\s+/)
      .map((value) => Number.parseInt(value, 10))
      .filter(Number.isFinite);
  } catch {
    return [];
  }
}

async function waitForServerToStop(port) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await getListeningPids(port)).length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for port ${port} to become available`);
}

async function stopExistingLocalServer() {
  if (!shouldStartLocalServer || shouldKeepExistingServer) return;
  const pids = await getListeningPids(port);
  for (const pid of pids) {
    if (pid !== process.pid) {
      process.kill(pid, 'SIGTERM');
    }
  }
  if (pids.length > 0) {
    await waitForServerToStop(port);
  }
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) return;
  try {
    process.kill(-serverProcess.pid, 'SIGTERM');
  } catch {
    serverProcess.kill('SIGTERM');
  }
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    serverProcess.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  if (!serverProcess.killed && serverProcess.exitCode === null) {
    try {
      process.kill(-serverProcess.pid, 'SIGKILL');
    } catch {
      serverProcess.kill('SIGKILL');
    }
  }
  for (const pid of await getListeningPids(port)) {
    if (pid !== process.pid) {
      process.kill(pid, 'SIGTERM');
    }
  }
  await waitForServerToStop(port);
}

process.on('SIGINT', async () => {
  await stopServer();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(143);
});

try {
  await stopExistingLocalServer();
  await run('npm', ['run', 'lint']);
  await run('npm', ['run', 'build']);

  if (shouldStartLocalServer && !(await isServerReady(`${appBase}/dashboard`))) {
    serverProcess = spawn('npm', ['run', 'start', '--', '-p', port], {
      env: process.env,
      stdio: 'inherit',
      shell: false,
      detached: true,
    });
    await waitForServer(`${appBase}/dashboard`);
  }

  await run('npm', ['run', 'verify:shopify']);
} finally {
  await stopServer();
}
