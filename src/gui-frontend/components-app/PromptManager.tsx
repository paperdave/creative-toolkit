import React from 'react';
import { deferred } from '@paperdave/utils';
import { State } from '../utils';

interface Prompt<T = unknown> {
  id: string;
  component(props: { onClose(data: T): void }): JSX.Element;
  onClose(data: T): void;
  container?(props: PromptContainerProps): JSX.Element;
  escapeCloses?: boolean;
}

interface PromptContainerProps {
  children: JSX.Element;
}

const activePrompts = new State({
  initialState: () => [] as Prompt[],
});

activePrompts.get();

export function PromptManager() {
  const prompts = activePrompts.use();
  return (
    <>
      {prompts.map((prompt, i) => {
        const close = (data: unknown) => {
          activePrompts.set(activePrompts.get()!.filter(p => p !== prompt));
          prompt.onClose(data);
        };
        const Comp = prompt.component;
        const Container =
          prompt.container ??
          (({ children }: PromptContainerProps) => (
            <div
              style={{
                background: 'white',
                padding: '0.5rem',
                border: '1px solid black',
                borderRadius: '0.5rem',
              }}>
              {children}
            </div>
          ));
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(50, 50, 50, 0.2)',
              zIndex: 100000 + i,
              backdropFilter: 'blur(1px)',
            }}>
            <Container>
              <Comp key={prompt.id} onClose={close} />
            </Container>
          </div>
        );
      })}
    </>
  );
}

export async function promptCustom<T>(component: Prompt<T>['component']) {
  const [promise, resolve] = deferred<T>();
  const id = crypto.randomUUID();
  const prompt: Prompt<T> = {
    id,
    component,
    onClose: resolve,
  };
  activePrompts.set([...activePrompts.get()!, prompt]);
  return promise;
}

export async function promptString(message: string) {
  const result = await promptCustom(({ onClose }) => (
    <div>
      <p
        style={{
          margin: 0,
          fontWeight: 'bold',
        }}>
        {message}
      </p>
      <input
        type='text'
        autoFocus={true}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onClose(e.currentTarget.value);
          }
        }}
      />
    </div>
  ));
  return result as string;
}

export async function promptNumber(message: string) {
  const string = await promptString(message);
  const number = parseFloat(string);
  if (isNaN(number)) {
    throw new Error(`"${string}" is not a number`);
  }
  return number;
}
