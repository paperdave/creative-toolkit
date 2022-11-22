<script>
  import '@paperdave/ui/base.scss';
  import './app.scss';
  import * as data from '$data';
  import PopupManager from '$components/popup/PopupManager.svelte';
  import { ThemeRoot } from '@paperdave/ui';
  import Titlebar from './Titlebar.svelte';
  Object.assign(window, { ...data });
</script>

<ThemeRoot primary='#AF7EFF' background='#232030' foreground='#DACAFF'>
  <Titlebar/>
  <slot></slot>

  <PopupManager />
</ThemeRoot>
