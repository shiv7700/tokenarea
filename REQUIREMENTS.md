# Requirements (draft, being gathered)

Package name: `tokenarea`.

## Problem

The host app needs a text input that:

1. Opens a suggestion list when the user types a trigger (today: `{{`).
2. Shows the chosen or typed variable in color (blue) inside the input.

Today the host app uses `react-mentions`, which is no longer maintained.

## Seen in the current host app UI (screenshot, /agent page)

- Trigger `{{` opens a dropdown under the cursor.
- Each row shows: `{x}` icon, the variable name, a truncated value preview
  (`"htt...app"`), and a scope badge (`Global`).
- The first row is highlighted (keyboard selection).
- The input is a multi-line prompt box.

## Decided (from discussion, 2026-10-18)

- **Unstyled (headless).** The package ships no styles. The user composes it
  from parts (`<Root>`, `<Input>`, `<List>`, `<Item>`) and puts their own
  components inside, like the row in the screenshot.
- **Items come from a prop**: an array of suggestion items.
- **The list can be custom markup**: the user renders each row (or the whole
  list) themselves.
- **Custom trigger**: not only `{{`. The user decides when the list opens.
- **Selection callback**: when an item is clicked (or picked with the keyboard),
  a callback is called with that item.
- **Why:** The host app put a lot of work into making react-mentions do this. The
  package should make that work unnecessary.

- **Inserted variable is plain colored text** in a real `<textarea>` (option A).
  Assumed for v1, the user has not confirmed it yet.
- **Trigger** is a string (default `{{`) or a function `(textBeforeCaret) =>
  { start, query } | null`. Assumed for v1, not confirmed yet.

## Open questions

- Should the list support extra markup around the rows (a header, an empty
  state, a "create variable" row)?
- Should the list flip above the caret when there is no room below?
- Package name.

(filled in as we discuss)
