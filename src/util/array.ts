export function arrayGroupByA<T>(items: T[], key: (item: T) => string | number): T[][] {
  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return [...(groups.entries() as any)].sort((a, b) => a[0] - b[0]).map(x => x[1]);
}

export function arrayGroupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return Object.fromEntries(groups.entries());
}
