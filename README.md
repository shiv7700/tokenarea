# tokenarea

A headless React textarea with trigger-based suggestions. Type `{{`, pick a variable from a list, and it shows up colored in the text.

- **Unstyled.** You render every row and style every part.
- **A real `<textarea>`.** Undo, paste, IME, selection and screen readers work as usual.
- **The value is a plain string.** No hidden markup or ids in the text.
- **No dependencies** besides React 18 or later.

## Install

```sh
npm install tokenarea
```

## Usage

```tsx
import { useState } from 'react';
import { SuggestInput } from 'tokenarea';

const variables = [
  { name: 'BASE_URL', value: 'https://app.example.com' },
  { name: 'login_email', value: 'qa@example.com' },
];

export function Prompt() {
  const [text, setText] = useState('');

  return (
    <SuggestInput
      value={text}
      onChange={setText}
      items={variables}
      getText={(v) => `{{${v.name}}}`}
    >
      <SuggestInput.Input tokenClassName="token" placeholder="Type {{ to insert a variable" />
      <SuggestInput.List className="menu">
        {(v, { active }) => <div className={active ? 'row active' : 'row'}>{v.name}</div>}
      </SuggestInput.List>
    </SuggestInput>
  );
}
```

```css
.token { color: #2563eb; }
.menu { background: #fff; border: 1px solid #ddd; z-index: 10; }
.row.active { background: #f3f4f6; }
```

Any text that equals `getText(item)` for some item is colored, whether it was picked from the list or typed by hand.

## API

### `<SuggestInput>`

The root. Renders a `div` with `position: relative` that holds the input and the list.

| Prop | Type | |
|---|---|---|
| `value` | `string` | The text. Controlled. |
| `onChange` | `(value: string) => void` | Called with the new text. |
| `items` | `readonly T[]` | Every suggestion. |
| `getText` | `(item: T) => string` | The text inserted for an item, like `` `{{${v.name}}}` ``. |
| `trigger` | `string \| (before: string) => TriggerMatch \| null` | What opens the list. Default `'{{'`. |
| `filter` | `(item: T, query: string) => boolean` | Which items to show for the typed query. Default: `getText(item)` contains the query, ignoring case. |
| `onSelect` | `(item: T) => void` | Called after an item is picked. |
| `className` | `string` | Class for the root `div`. |

### `<SuggestInput.Input>`

The `<textarea>`. Takes every textarea prop except `value` and `defaultValue`, and forwards its `ref`.

| Prop | Type | |
|---|---|---|
| `tokenClassName` | `string` | Class for colored tokens. Change only color or background: a different font, size or padding breaks the alignment. |

Tokens are also marked with `data-token`, so `[data-token]` works as a selector.

### `<SuggestInput.List>`

The suggestion list. Renders only while the list is open, positioned under the trigger. Takes every `div` prop.

Its child is a function that renders one row: `(item, { active, index }) => ReactNode`. Each row is wrapped in an element with `role="option"`, and the highlighted one also has `data-active`.

The list doesn't flip or stay inside the viewport on its own. Use `max-height` and `overflow: auto` for long lists.

### Keyboard

| Key | Action |
|---|---|
| `↓` / `↑` | Move the highlight |
| `Enter` / `Tab` | Pick the highlighted item |
| `Escape` | Close the list (doesn't bubble, so a surrounding dialog stays open) |

## Custom triggers

Pass a function to decide when the list opens. It gets the text before the caret, and returns where the trigger starts and what was typed after it, or `null` when the list should stay closed. Picking an item replaces the text from `start` to the caret.

```tsx
// Open on @, like a mention
const atMention = (before: string) => {
  const m = /@(\w*)$/.exec(before);
  return m ? { start: m.index, query: m[1] } : null;
};

<SuggestInput trigger={atMention} getText={(u) => `@${u.name}`} /* ... */ />
```

The `Trigger` and `TriggerMatch` types are exported.

## How it works

The textarea's own text is made transparent with `-webkit-text-fill-color`. A `div` laid exactly over it paints the same text, with tokens wrapped in `<span data-token>`. The textarea still owns the caret, selection, undo and accessibility. Inserts go through `document.execCommand('insertText')`, so a pick can be undone with Ctrl+Z.

## Development

```sh
npm test            # vitest + jsdom
npm run typecheck
npm run build       # → dist/
```

To try the demo, run `npm run build`, serve the repo root with `python3 -m http.server`, and open http://localhost:8000/docs/.

## License

MIT
