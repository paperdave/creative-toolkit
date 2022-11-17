import PopupSimpleTextBox from './PopupSimpleTextBox.svelte';
import { showPopup } from './popup';

export interface PromptStringOptions {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  validate?(value: string): string | null;
  buttonLabel?: string;
  cancelable?: boolean;
}

export async function promptString(opts: PromptStringOptions): Promise<string | null> {
  const { title, cancelable, ...props } = opts;
  return showPopup<string>({
    title,
    props,
    cancelable,
    contentComponent: PopupSimpleTextBox,
  });
}

export interface PromptNumberOptions {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: number;
  placeholder?: string;
  validate?(value: number): string | null;
  buttonLabel?: string;
  cancelable?: boolean;
}

export async function promptNumber(opts: PromptNumberOptions): Promise<number | null> {
  const { validate, defaultValue, ...stringArgs } = opts;
  const string = await promptString({
    ...stringArgs,
    defaultValue: defaultValue?.toString(),
    validate: value => {
      const num = Number(value);
      if (Number.isNaN(num)) {
        return 'Input must be a number.';
      }
      return validate?.(num) ?? null;
    },
  });
  const parsed = Number(string);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}
