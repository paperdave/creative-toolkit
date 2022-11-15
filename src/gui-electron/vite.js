import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startViteDevServer() {
  const port = 18325;
  const server = await createServer({
    configFile: path.join(dirname, '../gui-frontend/vite.config.js'),
    root: path.join(dirname, '../gui-frontend'),
    server: {
      port,
    },
  });
  await server.listen();
  return { url: `http://localhost:${port}`, stop: () => server.close() };
}
