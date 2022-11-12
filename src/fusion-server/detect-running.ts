export function isFusionServerRunning() {
  try {
    const server = Bun.listen({
      port: 1144,
      hostname: '127.0.0.1',
      data: undefined,
      socket: { data() {} } as any,
    });
    server.unref();
    server.stop();
    return false;
  } catch (error) {
    return true;
  }
}

const td = new TextDecoder();
export function getFusionRenderNodePid() {
  const { stdout } = Bun.spawnSync({
    cmd: ['pgrep', '-f', 'FusionRenderNode'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const id = td.decode(stdout).trim().split('\n')[0];
  return id ? parseInt(id, 10) : null;
}
