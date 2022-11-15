/* eslint-disable no-alert */
import { RunCommand } from '$/cli';
import { bun_renderWaveformSequence } from '$/waveform-canvas/temp-compat';

export const run: RunCommand = async ({ project }) => {
  await bun_renderWaveformSequence(project);
};
