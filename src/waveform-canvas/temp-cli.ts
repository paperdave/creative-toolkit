// this runs in node.js, since bun does not support importing `canvas`
import path from 'path';
import { loadProject } from '$/project';
import { nodejs_renderWaveformSequence } from './waveform';

const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const project = await loadProject(projectRoot);
if (!project) {
  throw new Error('Project not found');
}
await nodejs_renderWaveformSequence(project);
