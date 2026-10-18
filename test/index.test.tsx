import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SuggestInput } from '../src/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no layout; positioning is checked in docs/ with a real browser.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect(10, 20, 8, 16);

interface Variable { name: string }
const variables: Variable[] = [{ name: 'API_CONFIG' }, { name: 'BASE_URL' }, { name: 'baseurl_var' }];

let root: Root;
let container: HTMLDivElement;
let onSelect: ReturnType<typeof vi.fn>;

function Editor({ initial = '' }: { initial?: string }) {
  const [text, setText] = useState(initial);
  return (
    <SuggestInput value={text} onChange={setText} items={variables} getText={(v) => `{{${v.name}}}`} onSelect={onSelect}>
      <SuggestInput.Input tokenClassName="tok" />
      <SuggestInput.List className="list">{(v: Variable, { active }) => <b>{active ? `>${v.name}` : v.name}</b>}</SuggestInput.List>
    </SuggestInput>
  );
}

const textarea = () => container.querySelector('textarea')!;
const options = () => [...container.querySelectorAll('[role=option]')].map((o) => o.textContent);

function type(value: string) {
  const el = textarea();
  act(() => {
    el.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
    el.setSelectionRange(value.length, value.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function key(k: string) {
  act(() => { textarea().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
}

beforeEach(() => {
  onSelect = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('opens a filtered list after the trigger', () => {
  act(() => root.render(<Editor />));
  expect(container.querySelector('[role=listbox]')).toBeNull();
  type('go {{base');
  expect(options()).toEqual(['>BASE_URL', 'baseurl_var']);
  expect(textarea().getAttribute('aria-expanded')).toBe('true');
});

it('moves with arrows and inserts with Enter, calling onSelect with the item', () => {
  act(() => root.render(<Editor />));
  type('go {{base');
  key('ArrowDown');
  expect(options()).toEqual(['BASE_URL', '>baseurl_var']);
  key('Enter');
  expect(textarea().value).toBe('go {{baseurl_var}}');
  expect(textarea().selectionStart).toBe(18);
  expect(onSelect).toHaveBeenCalledWith(variables[2]);
  expect(container.querySelector('[role=listbox]')).toBeNull();
});

it('inserts the clicked item', () => {
  act(() => root.render(<Editor />));
  type('{{');
  act(() => { (container.querySelectorAll('[role=option]')[1] as HTMLElement).click(); });
  expect(textarea().value).toBe('{{BASE_URL}}');
  expect(onSelect).toHaveBeenCalledWith(variables[1]);
});

it('closes on Escape until a new trigger is typed', () => {
  act(() => root.render(<Editor />));
  type('{{b');
  key('Escape');
  expect(container.querySelector('[role=listbox]')).toBeNull();
  type('{{ba');
  expect(container.querySelector('[role=listbox]')).toBeNull();
  type('{{ba ');
  type('{{ba {{');
  expect(options()).toHaveLength(3);
});

it('colors known tokens, including ones typed by hand', () => {
  act(() => root.render(<Editor initial="use {{BASE_URL}} and {{nope}}" />));
  const tokens = [...container.querySelectorAll('[data-token]')];
  expect(tokens.map((t) => t.textContent)).toEqual(['{{BASE_URL}}']);
  expect(tokens[0]!.className).toBe('tok');
});
