import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type TextareaHTMLAttributes,
} from 'react';
import { findTrigger, insertAt, rectAt, segments, syncBackdrop, type Trigger } from './core.js';
export type { Trigger, TriggerMatch } from './core.js';

export interface SuggestInputProps<T> {
  value: string;
  onChange(value: string): void;
  /** Every suggestion. The list shows the ones that pass `filter` for the typed query. */
  items: readonly T[];
  /** The text inserted for an item, e.g. ``(v) => `{{${v.name}}}` ``. Typed text equal to it is colored too. */
  getText(item: T): string;
  /** Opens the list. A string like `{{` (the default), or a function for custom conditions. */
  trigger?: Trigger;
  /** Default: `getText(item)` contains the query, ignoring case. */
  filter?(item: T, query: string): boolean;
  /** Called after an item is picked by click, Enter or Tab. */
  onSelect?(item: T): void;
  className?: string;
  children: ReactNode;
}

interface Context {
  value: string;
  tokens: string[];
  open: boolean;
  visible: readonly any[];
  active: number;
  position: { top: number; left: number } | null;
  listId: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
  place(): void;
  change(value: string, caret: number | null): void;
  setCaret(caret: number | null): void;
  setActive(index: number): void;
  select(item: any): void;
  keyDown(e: KeyboardEvent<HTMLTextAreaElement>): void;
}

const SuggestContext = createContext<Context | null>(null);

function useSuggest() {
  const ctx = useContext(SuggestContext);
  if (!ctx) throw new Error('SuggestInput.Input and SuggestInput.List must be inside <SuggestInput>.');
  return ctx;
}

const optionId = (listId: string, index: number) => `${listId}-${index}`;

function Root<T>({ value, onChange, items, getText, trigger, filter, onSelect, className, children }: SuggestInputProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const listId = useId();
  const [caret, setCaret] = useState<number | null>(null); // null while the textarea is not focused
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<Context['position']>(null);

  const match = caret === null ? null : findTrigger(value, caret, trigger);
  const visible = match
    ? items.filter((item) => (filter ? filter(item, match.query) : getText(item).toLowerCase().includes(match.query.toLowerCase())))
    : [];
  const open = !!match && match.start !== dismissedAt && visible.length > 0;
  const activeIndex = Math.min(active, visible.length - 1);
  const tokens = useMemo(() => items.map(getText), [items, getText]);

  // A new query resets the highlighted row; closing the trigger forgets a past Escape.
  const queryKey = match ? `${match.start}:${match.query}` : '';
  const [prevKey, setPrevKey] = useState(queryKey);
  if (queryKey !== prevKey) {
    setPrevKey(queryKey);
    setActive(0);
    if (!match) setDismissedAt(null);
  }

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    textareaRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    setCaret(pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  const start = open ? match.start : null;
  const place = useCallback(() => {
    const root = rootRef.current;
    const rect = start !== null && backdropRef.current ? rectAt(backdropRef.current, start) : null;
    if (!root || !rect) return setPosition(null);
    const base = root.getBoundingClientRect();
    setPosition({ top: rect.bottom - base.top, left: rect.left - base.left });
  }, [start]);
  useLayoutEffect(place, [place, value]);

  function select(item: T) {
    const el = textareaRef.current;
    if (!el || !match || caret === null) return;
    const text = getText(item);
    el.focus();
    el.setSelectionRange(match.start, caret);
    // execCommand keeps the insert on the browser's undo stack, and React sees a normal input event.
    if (!document.execCommand?.('insertText', false, text)) {
      const next = insertAt(value, match.start, caret, text);
      pendingCaret.current = next.caret;
      onChange(next.value);
    }
    onSelect?.(item);
  }

  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + visible.length) % visible.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(visible[activeIndex]!);
    } else if (e.key === 'Escape') {
      // Close only the list, not a dialog the input sits in.
      e.preventDefault();
      e.stopPropagation();
      setDismissedAt(match.start);
    }
  }

  const ctx: Context = {
    value,
    tokens,
    open,
    visible,
    active: activeIndex,
    position,
    listId,
    textareaRef,
    backdropRef,
    place,
    change: (next, nextCaret) => {
      onChange(next);
      setCaret(nextCaret);
    },
    setCaret,
    setActive,
    select,
    keyDown,
  };

  return (
    <SuggestContext.Provider value={ctx}>
      <div ref={rootRef} className={className} style={{ position: 'relative' }}>
        {children}
      </div>
    </SuggestContext.Provider>
  );
}

export interface InputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue'> {
  /** Class for colored tokens. Change color or background only: a different font or size breaks alignment. */
  tokenClassName?: string;
}

const Input = forwardRef<HTMLTextAreaElement, InputProps>(function Input(
  { tokenClassName, style, onChange, onSelect, onKeyDown, onScroll, onBlur, ...props },
  ref,
) {
  const ctx = useSuggest();
  const { textareaRef, backdropRef } = ctx;

  const sync = useCallback(() => {
    if (textareaRef.current && backdropRef.current) syncBackdrop(textareaRef.current, backdropRef.current);
  }, [textareaRef, backdropRef]);

  useLayoutEffect(sync);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, textareaRef]);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      assignRef(ref, node);
    },
    [ref, textareaRef],
  );

  return (
    <>
      <textarea
        {...props}
        ref={setRefs}
        value={ctx.value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listId : undefined}
        aria-activedescendant={ctx.open ? optionId(ctx.listId, ctx.active) : undefined}
        // The backdrop paints the text; the textarea keeps the caret and selection.
        // Skipped when empty, because the fill color would also hide the placeholder.
        style={ctx.value ? { ...style, WebkitTextFillColor: 'transparent' } : style}
        onChange={(e) => {
          ctx.change(e.target.value, e.target.selectionStart);
          onChange?.(e);
        }}
        onSelect={(e) => {
          ctx.setCaret(e.currentTarget.selectionStart);
          onSelect?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented) ctx.keyDown(e);
        }}
        onScroll={(e) => {
          sync();
          ctx.place();
          onScroll?.(e);
        }}
        onBlur={(e) => {
          ctx.setCaret(null);
          onBlur?.(e);
        }}
      />
      <div ref={backdropRef} aria-hidden="true">
        {segments(ctx.value, ctx.tokens).map((seg, i) =>
          seg.token ? (
            <span key={i} data-token="" className={tokenClassName}>
              {seg.text}
            </span>
          ) : (
            seg.text
          ),
        )}
        {/* A textarea shows an empty last line after a trailing newline; a div needs a character there. */}
        {ctx.value.endsWith('\n') ? ' ' : null}
      </div>
    </>
  );
});

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

export interface ListProps<T = any> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Renders one row. The row is already wrapped in a `role="option"` element. */
  children(item: T, state: { active: boolean; index: number }): ReactNode;
}

function List<T = any>({ children, style, onMouseDown, ...props }: ListProps<T>) {
  const ctx = useSuggest();
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    listRef.current?.querySelector('[data-active]')?.scrollIntoView?.({ block: 'nearest' });
  }, [ctx.active, ctx.open]);

  if (!ctx.open) return null;
  return (
    <div
      {...props}
      ref={listRef}
      id={ctx.listId}
      role="listbox"
      // shortcut: no flipping or viewport clamping, add it when a real layout needs it
      style={{
        position: 'absolute',
        top: ctx.position?.top,
        left: ctx.position?.left,
        visibility: ctx.position ? undefined : 'hidden',
        ...style,
      }}
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in the textarea
        onMouseDown?.(e);
      }}
    >
      {ctx.visible.map((item, index) => {
        const active = index === ctx.active;
        return (
          <div
            key={index}
            id={optionId(ctx.listId, index)}
            role="option"
            aria-selected={active}
            data-active={active ? '' : undefined}
            onMouseMove={() => ctx.setActive(index)}
            onClick={() => ctx.select(item)}
          >
            {children(item, { active, index })}
          </div>
        );
      })}
    </div>
  );
}

export const SuggestInput = Object.assign(Root, { Input, List });
