import { Clip } from '../clip';
import { BoolNum, FormatID } from '../enum';
import { FuId } from '../fuid';
import { Input } from '../input';
import { Tool } from '../tool';

export class SaverTool extends Tool {
  get Clip() {
    return this.Inputs.get('Clip').valueAs(Clip);
  }
  set Clip(value: Clip) {
    this.Inputs.set('Clip', Input.from(value));
  }
  get CreateDir(): BoolNum {
    return this.Inputs.get('CreateDir')?.Value ?? false;
  }
  set CreateDir(value: BoolNum) {
    this.Inputs.set('CreateDir', Input.from(value));
  }
  get OutputFormat() {
    return this.Inputs.get('OutputFormat', Input).valueAs(FuId<FormatID>)?.value ?? undefined;
  }
  set OutputFormat(value: FormatID) {
    this.Inputs.set('OutputFormat', Input.from(FuId.from(value)));
  }
}
