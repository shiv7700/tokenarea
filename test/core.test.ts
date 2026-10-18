import { expect, it } from 'vitest';
import { findTrigger, insertAt, segments } from '../src/core.js';

it('finds an open {{ trigger and its query', () => {
  expect(findTrigger('hi {{ba', 7)).toEqual({ start: 3, query: 'ba' });
  expect(findTrigger('{{', 2)).toEqual({ start: 0, query: '' });
});

it('ignores closed triggers, whitespace and text after the caret', () => {
  expect(findTrigger('{{a}} b', 7)).toBeNull();
  expect(findTrigger('{{a b', 5)).toBeNull();
  expect(findTrigger('hello {{x', 3)).toBeNull();
  expect(findTrigger('no trigger', 10)).toBeNull();
});

it('supports a custom trigger string and a function', () => {
  expect(findTrigger('ping @sh', 8, '@')).toEqual({ start: 5, query: 'sh' });
  const afterSpace = (before: string) => {
    const m = /(?:^|\s)(\/\w*)$/.exec(before);
    return m ? { start: before.length - m[1]!.length, query: m[1]!.slice(1) } : null;
  };
  expect(findTrigger('do /cl', 6, afterSpace)).toEqual({ start: 3, query: 'cl' });
  expect(findTrigger('a/cl', 4, afterSpace)).toBeNull();
});

it('inserts text and returns the caret after it', () => {
  expect(insertAt('go {{ba now', 3, 7, '{{BASE_URL}}')).toEqual({ value: 'go {{BASE_URL}} now', caret: 15 });
});

it('splits text into tokens, preferring the longest match', () => {
  expect(segments('a {{URL}} b {{URL_2}}', ['{{URL}}', '{{URL_2}}'])).toEqual([
    { text: 'a ', token: false },
    { text: '{{URL}}', token: true },
    { text: ' b ', token: false },
    { text: '{{URL_2}}', token: true },
  ]);
  expect(segments('{{a.b}}', ['{{a.b}}'])).toEqual([{ text: '{{a.b}}', token: true }]);
  expect(segments('{{axb}}', ['{{a.b}}'])).toEqual([{ text: '{{axb}}', token: false }]);
  expect(segments('', ['x'])).toEqual([]);
  expect(segments('plain', [])).toEqual([{ text: 'plain', token: false }]);
});
