export let electronVersion = '';
export let nodeVersion = '';

export function setElectronVersionGlobal(electron: string, node: string) {
  electronVersion = electron;
  nodeVersion = node;
}
