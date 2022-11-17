import PopupSimpleAlertBox from './PopupSimpleAlertBox.svelte';
import { showPopup } from './popup';

export interface ShowMessageOptions {
  title?: string;
  message: string;
  buttonLabel?: string;
}

export async function showMessage(opts: ShowMessageOptions): Promise<string> {
  const { title, ...props } = opts;
  return showPopup<string>({
    title,
    props,
    contentComponent: PopupSimpleAlertBox,
  });
}
