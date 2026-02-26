export class MinHeap<T> {
  heap: T[];
  private getval: (item: T) => number;

  constructor(getval: (item: T) => number) {
    this.getval = getval;
    this.heap = [];
  }

  copy(): MinHeap<T> {
    const h = new MinHeap<T>(this.getval);
    h.heap = Array.from(this.heap);
    return h;
  }

  getOrderedArray(): T[] {
    const arr: T[] = [];
    const clone = this.copy();
    while (clone.heap.length) {
      arr.push(clone.remove()!);
    }
    return arr;
  }

  size(): number {
    return this.heap.length;
  }

  peek(): T | null {
    return this.heap.length === 0 ? null : this.heap[0];
  }

  remove(): T | null {
    if (this.heap.length === 0) return null;
    const item = this.heap[0];
    this.heap[0] = this.heap[this.heap.length - 1];
    this.heap.pop();
    this.heapifyDown();
    return item;
  }

  add(item: T): void {
    this.heap.push(item);
    this.heapifyUp();
  }

  private getLeftChildIndex(i: number) { return 2 * i + 1; }
  private getRightChildIndex(i: number) { return 2 * i + 2; }
  private getParentIndex(i: number) { return Math.floor((i - 1) / 2); }
  private hasLeftChild(i: number) { return this.getLeftChildIndex(i) < this.heap.length; }
  private hasRightChild(i: number) { return this.getRightChildIndex(i) < this.heap.length; }
  private hasParent(i: number) { return this.getParentIndex(i) >= 0; }

  private swap(a: number, b: number): void {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  }

  private heapifyUp(): void {
    let i = this.heap.length - 1;
    while (this.hasParent(i) && this.getval(this.heap[this.getParentIndex(i)]) > this.getval(this.heap[i])) {
      this.swap(this.getParentIndex(i), i);
      i = this.getParentIndex(i);
    }
  }

  private heapifyDown(): void {
    let i = 0;
    while (this.hasLeftChild(i)) {
      let smaller = this.getLeftChildIndex(i);
      if (this.hasRightChild(i) && this.getval(this.heap[this.getRightChildIndex(i)]) < this.getval(this.heap[smaller])) {
        smaller = this.getRightChildIndex(i);
      }
      if (this.getval(this.heap[i]) < this.getval(this.heap[smaller])) break;
      this.swap(i, smaller);
      i = smaller;
    }
  }
}
