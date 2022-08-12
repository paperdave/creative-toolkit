/* eslint-disable @typescript-eslint/require-await */
import { exec } from 'bun-utilities/spawn';
import { spawnSync } from 'child_process';
import path from 'path';
import { Command } from '../cmd';
import { CT_SOURCE_ROOT } from '../paths';

export const GUICommand = new Command({
  usage: 'ct gui',
  desc: 'we use electron',
  async run() {
    const electron = (await import('electron')).default;
    const electronBoot = path.join(CT_SOURCE_ROOT, '../electron-boot.cjs');

    if (typeof electron === 'string') {
      spawnSync(electron, [
        electronBoot,
      ], {
        stdio: 'inherit',
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        }
      });
    } else {
      await import(electronBoot);
    }
  },
});
