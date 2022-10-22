/* eslint-disable @typescript-eslint/require-await */
import path from 'path';
import { spawnSync } from 'child_process';
import { Command } from '../cmd';
import { CT_SOURCE_ROOT } from '../paths';

export const GUICommand = new Command({
  usage: 'ct gui',
  desc: 'we use electron',
  async run() {
    // Use imported install, or fallback to globally installed electron (nixos)
    const electron = 'electron';

    // get rained on xdf
    // i dont think this import is needed anyways
    // it is commented out for now because on nixos the system electron MUST be used
    // and on other systems it's just gonna use the nix-shell one

    // try {
    //   electron = (await import('electron')).default as any;
    // } catch {}

    // TODO: fix upstream so this usage works.
    // const electron = tryOrFallback(import('electron'), { default: 'electron' }).default;

    const electronBoot = path.join(CT_SOURCE_ROOT, '../electron-boot.cjs');
    if (typeof electron === 'string') {
      spawnSync(electron, [electronBoot], {
        stdio: 'inherit',
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
      });
    } else {
      await import(electronBoot);
    }
  },
});
