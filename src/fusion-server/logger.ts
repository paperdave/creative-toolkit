import { Logger } from '@paperdave/logger';

const serverLogger = new Logger('fusion:Server');
const renderLogger = new Logger('fusion:RenderNode');
const scriptLogger = new Logger('fusion:Script');

const hide: Array<string | RegExp> = [
  //
  'sh: line 1: python2: command not found',
];

function runFilter(line: string) {
  if (hide.some(x => (typeof x === 'string' ? x === line : x.test(line)))) {
    return false;
  }
  return true;
}

export function logFusionServer(line: string) {
  if (runFilter(line)) {
    serverLogger(line);
  }
}

export function logFusionRenderNode(line: string) {
  if (runFilter(line)) {
    renderLogger(line);
  }
}

export function logFusionScript(line: string) {
  if (runFilter(line)) {
    scriptLogger(line);
  }
}
