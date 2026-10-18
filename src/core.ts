/** Where an open trigger starts and what was typed after it. */
export interface TriggerMatch {
  start: number;
  query: string;
}

/** A trigger string like `{{`, or a function that decides from the text before the caret. */
export type Trigger = string | ((before: string) => TriggerMatch | null);

/** Finds an open trigger before the caret: `"hi {{ba|"` → `{ start: 3, query: "ba" }`. */
export function findTrigger(text: string, caret: number, trigger: Trigger = '{{'): TriggerMatch | null {
  const before = text.slice(0, caret);
  if (typeof trigger === 'function') return trigger(before);
  const start = before.lastIndexOf(trigger);
  if (start === -1) return null;
  const query = before.slice(start + trigger.length);
  // Whitespace or a brace ends the query, so `{{a}} b|` is no longer an open trigger.
  if (/[\s{}]/.test(query)) return null;
  return { start, query };
}

/** Replaces `text[start, end)` with `insert` and returns the new value and caret. */
export function insertAt(text: string, start: number, end: number, insert: string) {
  return { value: text.slice(0, start) + insert + text.slice(end), caret: start + insert.length };
}

export interface Segment {
  text: string;
  token: boolean;
}

/** Splits text into plain and token parts, where tokens are exact occurrences of `tokens`. */
export function segments(text: string, tokens: readonly string[]): Segment[] {
  const parts = [...new Set(tokens)].filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRegExp);
  if (!parts.length) return text ? [{ text, token: false }] : [];
  const re = new RegExp(parts.join('|'), 'g');
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), token: false });
    out.push({ text: m[0], token: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), token: false });
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Everything that changes where glyphs land. Colors are left out on purpose.
const MIRRORED = [
  'direction', 'fontFamily', 'fontSize', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
  'fontKerning', 'fontFeatureSettings', 'fontVariationSettings', 'letterSpacing', 'wordSpacing',
  'lineHeight', 'textAlign', 'textIndent', 'textTransform', 'tabSize', 'whiteSpace', 'overflowWrap',
  'wordBreak', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
] as const;

/**
 * Lays `backdrop` exactly over `textarea` so its text lines up glyph for glyph.
 * Both must share a positioned parent. Call again after resize, font or style changes.
 */
export function syncBackdrop(textarea: HTMLTextAreaElement, backdrop: HTMLElement) {
  const cs = getComputedStyle(textarea);
  const s = backdrop.style;
  for (const p of MIRRORED) s[p] = cs[p];
  Object.assign(s, {
    position: 'absolute',
    top: `${textarea.offsetTop}px`,
    left: `${textarea.offsetLeft}px`,
    width: `${textarea.offsetWidth}px`,
    height: `${textarea.offsetHeight}px`,
    boxSizing: 'border-box',
    margin: '0',
    borderStyle: 'solid',
    borderColor: 'transparent',
    overflow: 'hidden',
    pointerEvents: 'none',
    color: cs.color,
  });
  // A visible scrollbar narrows the textarea's text area; widen the right padding to match.
  const scrollbar = textarea.offsetWidth - textarea.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
  if (scrollbar > 0) s.paddingRight = `${parseFloat(cs.paddingRight) + scrollbar}px`;
  backdrop.scrollTop = textarea.scrollTop;
  backdrop.scrollLeft = textarea.scrollLeft;
}

/** The on-screen box of the character at `index` in `container`'s text, or null. */
export function rectAt(container: HTMLElement, index: number): DOMRect | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let left = index;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (left < node.length) {
      const range = document.createRange();
      range.setStart(node, left);
      range.setEnd(node, left + 1);
      return range.getClientRects()[0] ?? range.getBoundingClientRect();
    }
    left -= node.length;
  }
  return null;
}
