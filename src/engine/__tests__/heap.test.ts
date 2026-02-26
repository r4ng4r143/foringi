import { describe, it, expect } from 'vitest';
import { MinHeap } from '../heap';

describe('MinHeap', () => {
  it('extracts elements in ascending order', () => {
    const h = new MinHeap<number>(x => x);
    [5, 3, 8, 1, 4].forEach(v => h.add(v));

    const out: number[] = [];
    while (h.size() > 0) out.push(h.remove()!);
    expect(out).toEqual([1, 3, 4, 5, 8]);
  });

  it('peek returns smallest without removing', () => {
    const h = new MinHeap<number>(x => x);
    h.add(10);
    h.add(2);
    expect(h.peek()).toBe(2);
    expect(h.size()).toBe(2);
  });

  it('returns null on empty remove/peek', () => {
    const h = new MinHeap<number>(x => x);
    expect(h.remove()).toBeNull();
    expect(h.peek()).toBeNull();
  });

  it('handles single element', () => {
    const h = new MinHeap<number>(x => x);
    h.add(42);
    expect(h.size()).toBe(1);
    expect(h.remove()).toBe(42);
    expect(h.size()).toBe(0);
  });

  it('handles duplicate values', () => {
    const h = new MinHeap<number>(x => x);
    [3, 1, 3, 1, 2].forEach(v => h.add(v));
    const out = h.getOrderedArray();
    expect(out).toEqual([1, 1, 2, 3, 3]);
  });

  it('copy creates independent heap', () => {
    const h = new MinHeap<number>(x => x);
    [3, 1, 2].forEach(v => h.add(v));
    const c = h.copy();
    c.remove();
    expect(h.size()).toBe(3);
    expect(c.size()).toBe(2);
  });

  it('works with custom value function', () => {
    const h = new MinHeap<{ name: string; priority: number }>(x => x.priority);
    h.add({ name: 'low', priority: 10 });
    h.add({ name: 'high', priority: 1 });
    h.add({ name: 'mid', priority: 5 });
    expect(h.remove()!.name).toBe('high');
    expect(h.remove()!.name).toBe('mid');
    expect(h.remove()!.name).toBe('low');
  });

  it('handles large insertion', () => {
    const h = new MinHeap<number>(x => x);
    const values = Array.from({ length: 1000 }, (_, i) => 1000 - i);
    values.forEach(v => h.add(v));
    let prev = -Infinity;
    while (h.size() > 0) {
      const v = h.remove()!;
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
