export interface SpawnScriptOpts<Wait extends boolean> {
  script: string;
  env?: Record<string, string>;
  onData?(data: any): void;
  onLine?(line: string): void;
  wait?: Wait;
}
