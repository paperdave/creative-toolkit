import { createArray } from '@paperdave/utils';

/* eslint-disable no-console */
const warningFilters = [
  'https://kit.svelte.dev/docs/load#making-fetch-requests',
  'Placing %sveltekit.body% directly inside <body> is not recommended',
];
const _warn = console.warn;
console.warn = (...args) => {
  if (
    warningFilters.some(filter => args.some(arg => typeof arg === 'string' && arg.includes(filter)))
  ) {
    return;
  }
  _warn(...args);
};
const status = await fetch('http://localhost:2004/status').then(x => x.json());
const line2 = 'now featuring the two step process!';
console.log(
  `%cdave's creative toolkit %c${status.version}%c\n   ` +
    line2
      .split('')
      .map(c => `%c${c}`)
      .join(''),
  `
    font-size: 1.3em;
    font-weight: bold;
    color: #6ffc71;
    background: #333;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    padding-left: 5px;
    padding-top: 3px;
  `,
  `
    font-size: 1.3em;
    font-weight: bold;
    color: white;
    background: #333;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    padding-right: 5px;
    padding-top: 3px;
  `,
  '',
  ...createArray(
    line2.length,
    i => `
      font-size: 1em;
      font-weight: bold;
      font-style: italic;
      text-decoration: ${i > 17 && i < 34 ? 'underline' : 'none'};
      color: hsl(${(i * 7 + 102) % 360}, ${i > 17 ? 70 : 50}%, ${i > 17 ? 70 : 80}%);
      background: #333;
      padding-bottom: 3px;
      ${
        i === line2.length - 1
          ? `
          border-bottom-right-radius: 8px;
          padding-right: 8px;
        `
          : i === 0
          ? `
          border-bottom-left-radius: 8px;
          padding-left: 8px;
        `
          : ''
      }
    `
  )
);
