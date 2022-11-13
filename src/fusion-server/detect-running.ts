export async function isFusionServerRunning() {
  try {
    const socket = await Bun.connect({
      port: 1144,
      hostname: '127.0.0.1',
      data: undefined,
      socket: {
        open(s) {
          s.end();
        },
        data() {},
      },
    });
    socket.stop();
    return true;
  } catch (error) {
    return false;
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
