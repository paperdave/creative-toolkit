import path from 'path';
import { Project } from '$/project';

export async function bun_renderWaveformSequence(project: Project | string) {
  const root = typeof project === 'string' ? project : project.root;
  const proc = Bun.spawn({
    cmd: [
      'node',
      '--loader',
      require.resolve('@esbuild-kit/esm-loader'),
      path.join(import.meta.dir + '/temp-cli.ts'),
      root,
    ],
    cwd: path.join(import.meta.dir, '../..'),
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      // TODO: wait for bun to fix process.env spread
      // ...process.env,
      NODE_NO_WARNINGS: '1',
      PATH: process.env.PATH,
      TERM: process.env.TERM,
    },
  });
  await proc.exited;
}
