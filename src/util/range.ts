export type RangeResolvable =
  | {
      start: number;
      end: number;
    }
  | {
      ranges: IRange[];
    }
  | {
      frame: number;
    }
  | null
  | undefined
  | number
  | IRange
  | RangeResolvable[];

export interface IRange {
  start: number;
  end: number;
}

export function resolveRange(range: RangeResolvable): IRange[] {
  if (typeof range === 'number') {
    return [{ start: range, end: range }];
  } else if (!range) {
    return [];
  } else if (Array.isArray(range)) {
    return range.flatMap(resolveRange);
  } else if ('frame' in range) {
    return [{ start: range.frame, end: range.frame }];
  } else if ('start' in range) {
    return [range];
  } else if ('ranges' in range) {
    return range.ranges;
  }
  throw new Error('Invalid range');
}

export function mergeRanges(ranges: RangeResolvable): IRange[] {
  const consolidated: IRange[] = [];
  for (const range of resolveRange(ranges).sort((a, b) => (a.start < b.start ? -1 : 1))) {
    const last = consolidated[consolidated.length - 1];
    if (last && last.end >= range.start - 1) {
      last.end = range.end;
    } else {
      // important that we clone the object as we mutate it
      consolidated.push({ start: range.start, end: range.end });
    }
  }
  return consolidated;
}

export function singleRangeIntersects(a: IRange, b: IRange): boolean {
  return a.start <= b.end && a.end >= b.start;
}

// return the intersection of two ranges, or null if they don't intersect
export function intersectRanges(a: IRange, b: IRange): IRange | null {
  if (singleRangeIntersects(a, b)) {
    return {
      start: Math.max(a.start, b.start),
      end: Math.min(a.end, b.end),
    };
  }
  return null;
}

/** Gets the range of the list of ranges (a single range containing all) */
export function rangeToSingle(range: RangeResolvable): IRange {
  const ranges = resolveRange(range);
  return {
    start: Math.min(...ranges.map(r => r.start)),
    end: Math.max(...ranges.map(r => r.end)),
  };
}

/** If a range contains all the frames specified by another one. */
export function rangeContains(range: RangeResolvable, subset: RangeResolvable): boolean {
  const toCheck = resolveRange(range);
  const newRange = [];
  for (const inner of resolveRange(subset)) {
    newRange.push(...(toCheck.map(r => intersectRanges(r, inner)).filter(Boolean) as IRange[]));
  }
  const merged = mergeRanges(newRange);
  return (
    merged.length === toCheck.length &&
    merged.every((r, i) => r.start === toCheck[i].start && r.end === toCheck[i].end)
  );
}

export function rangeToString(range: RangeResolvable): string {
  return resolveRange(range)
    .map(r => (r.start === r.end ? r.start : `${r.start}..${r.end}`))
    .join(',');
}

export function countRangeFrames(range: RangeResolvable): number {
  return resolveRange(range).reduce((acc, r) => acc + r.end - r.start + 1, 0);
}

export function* iterateRange(range: RangeResolvable): Generator<number> {
  for (const r of resolveRange(range)) {
    for (let i = r.start; i <= r.end; i++) {
      yield i;
    }
  }
}

export function getRangeProgress(range: RangeResolvable, frame: number): number {
  const ranges = resolveRange(range);
  let total = 0;
  for (const r of ranges) {
    if (r.end < frame) {
      total += r.end - r.start + 1;
    } else if (r.start <= frame) {
      total += frame - r.start;
      break;
    }
  }
  return total / countRangeFrames(ranges);
}
