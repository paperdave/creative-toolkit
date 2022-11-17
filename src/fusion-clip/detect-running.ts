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
