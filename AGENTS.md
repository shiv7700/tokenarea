# AGENTS.md

This is the guide for anyone working on this repo, human or AI agent. `CLAUDE.md` imports this file.

## What this is

**tokenarea** is a headless React textarea with trigger-based suggestions, like typing `{{` to pick a variable. Picked or typed tokens are colored. It ships no styles: the app renders every row and styles every part. No runtime dependencies besides React. The package exports one component, `SuggestInput`.

How coloring works: the textarea's own text is made transparent (`-webkit-text-fill-color`), and a backdrop `div` laid exactly over it paints the same text with tokens in `<span data-token>`. The textarea keeps the caret, selection, undo and accessibility.

## Commands

```sh
npm test            # vitest + jsdom
npm run typecheck   # tsc --noEmit
npm run build       # tsc → dist/
```

To try it in a real browser: run `npm run build`, serve the repo root (`python3 -m http.server`), and open `/docs/`.

## Layout

```
src/
  index.tsx    SuggestInput, SuggestInput.Input, SuggestInput.List; the package entry
  core.ts      internal helpers: findTrigger, insertAt, segments (pure), syncBackdrop, rectAt (DOM)
test/          core.test.ts (helpers), index.test.tsx (component with real React)
docs/          index.html, a demo
REQUIREMENTS.md  requirements as agreed so far
```

## Rules

1. **No runtime dependencies.** React is the only peer.
2. **Helpers stay React-free.** `src/core.ts` imports nothing, so it can be tested without React. It is not exported.
3. **Unstyled.** Only the inline styles needed to work: positioning and the backdrop overlay. Everything visual is the app's.
4. **The value is a plain string.** No hidden markup, no ids in the text.
5. **Keep native textarea behavior.** Undo, paste, IME, screen readers. Inserts go through `execCommand('insertText')` so they land on the undo stack.
6. **Keep the API small.** Every new option needs a real use case. Say no by default.
7. **Tests cover behavior.** jsdom has no layout, and the tests stub it. Alignment and list placement must be checked in `docs/` with a real browser.

## Code style

- TypeScript strict mode, ESM, and `.js` extensions in relative imports (required by NodeNext).
- Small named functions. Write a comment only when the code can't explain *why*.
- If you take a known shortcut, mark it: `// shortcut: <the limit>, <when to upgrade>`.

## Git

Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
