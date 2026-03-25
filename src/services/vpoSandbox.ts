import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import type { VpoFileResult, VpoParserOutput } from '../types/vpo.js';

type SandboxRequest =
  | { type: 'parseWorkbook'; filePath: string; fileName: string }
  | { type: 'buildWorkbook'; output: VpoParserOutput };

type SandboxResponse =
  | { ok: true; result?: VpoFileResult; bufferBase64?: string }
  | { ok: false; error: string };

const DEFAULT_SANDBOX_TIMEOUT_MS = 20_000;

function sandboxTimeoutMs(): number {
  const value = Number.parseInt(String(process.env.VPO_SANDBOX_TIMEOUT_MS ?? ''), 10);
  if (!Number.isFinite(value)) return DEFAULT_SANDBOX_TIMEOUT_MS;
  return Math.min(120_000, Math.max(5_000, value));
}

function sandboxWorkerPath(): string {
  return fileURLToPath(new URL('../sandbox/vpoSandboxWorker.js', import.meta.url));
}

function invokeSandbox(request: SandboxRequest): Promise<SandboxResponse> {
  return new Promise((resolve, reject) => {
    const child = fork(sandboxWorkerPath(), {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });

    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (child.connected) child.disconnect();
      child.removeAllListeners();
      child.kill();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('VPO sandbox timed out')));
    }, sandboxTimeoutMs());

    child.once('message', (message: SandboxResponse) => {
      finish(() => resolve(message));
    });

    child.once('error', (err) => {
      finish(() => reject(err));
    });

    child.once('exit', (code, signal) => {
      if (settled) return;
      finish(() => reject(new Error(`VPO sandbox exited before reply (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)));
    });

    child.send(request);
  });
}

export async function parseVpoWorkbookInSandbox(filePath: string, fileName: string): Promise<VpoFileResult> {
  const response = await invokeSandbox({ type: 'parseWorkbook', filePath, fileName });
  if (!response.ok || !response.result) {
    throw new Error(response.ok ? 'VPO sandbox returned an empty parse result' : response.error);
  }
  return response.result;
}

export async function buildVpoWorkbookBufferInSandbox(output: VpoParserOutput): Promise<Buffer> {
  const response = await invokeSandbox({ type: 'buildWorkbook', output });
  if (!response.ok || !response.bufferBase64) {
    throw new Error(response.ok ? 'VPO sandbox returned an empty workbook buffer' : response.error);
  }
  return Buffer.from(response.bufferBase64, 'base64');
}
