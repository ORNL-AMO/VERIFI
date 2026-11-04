export type ConflictChoice = 'local' | 'saved';
export type ConflictChoices = Readonly<Record<string, ConflictChoice>>;

export interface DraftConflict {
  readonly id: string;
  readonly label: string;
  readonly localValue: unknown;
  readonly savedValue: unknown;
}

export interface DraftMerge<T> {
  readonly value: T;
  readonly conflicts: readonly DraftConflict[];
  /** Advances untouched fields while preserving the original base of unresolved conflicts. */
  readonly baseline?: T;
}

export interface DraftFieldGroup<T> {
  readonly id: string;
  readonly label: string;
  readonly keys: readonly (keyof T)[];
}

export class EditorConflictError<T = unknown> extends Error {
  constructor(readonly saved: T) {
    super('Saved values changed while this draft was being edited. Review the conflicting changes.');
    this.name = 'EditorConflictError';
  }
}

export function draftEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (first === null || second === null || typeof first !== 'object' || typeof second !== 'object') return false;
  if (first instanceof Date || second instanceof Date) {
    return first instanceof Date && second instanceof Date && first.getTime() === second.getTime();
  }
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second)
      && first.length === second.length && first.every((value, index) => draftEqual(value, second[index]));
  }
  const left = first as Record<string, unknown>, right = second as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every(key => draftEqual(left[key], right[key]));
}

export function reconcileFields<T extends object>(base: T, local: T, saved: T, options: {
  readonly groups?: readonly DraftFieldGroup<T>[];
  readonly exclude?: readonly (keyof T)[];
  readonly choices?: ConflictChoices;
  readonly prefix?: string;
} = {}): DraftMerge<T> {
  const value = structuredClone(saved);
  const baseline = structuredClone(saved);
  const conflicts: DraftConflict[] = [];
  const grouped = new Set<keyof T>(options.exclude ?? []);
  const groups = [...(options.groups ?? [])];
  groups.forEach(group => group.keys.forEach(key => grouped.add(key)));
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(saved)] as (keyof T)[]);
  keys.forEach(key => {
    if (!grouped.has(key)) groups.push({ id: String(key), label: humanize(String(key)), keys: [key] });
  });
  for (const group of groups) {
    const read = (source: T) => Object.fromEntries(group.keys.map(key => [key, source[key]]));
    const before = read(base), mine = read(local), theirs = read(saved);
    const id = [options.prefix, group.id].filter(Boolean).join('.');
    let selected = theirs;
    if (!draftEqual(before, mine)) {
      if (draftEqual(before, theirs) || draftEqual(mine, theirs) || options.choices?.[id] === 'local') selected = mine;
      else if (options.choices?.[id] !== 'saved') {
        selected = mine;
        conflicts.push({ id, label: group.label, localValue: group.keys.length === 1 ? local[group.keys[0]] : mine,
          savedValue: group.keys.length === 1 ? saved[group.keys[0]] : theirs });
        Object.assign(baseline, structuredClone(before));
      }
    }
    Object.assign(value, structuredClone(selected));
  }
  return { value, conflicts, baseline };
}

/** Order controls presentation only; every add, edit, and deletion is matched by stable identity. */
export function reconcileKeyedItems<T>(base: readonly T[], local: readonly T[], saved: readonly T[],
  key: (row: T) => string, merge: (base: T, local: T, saved: T, prefix: string) => DraftMerge<T>,
  choices: ConflictChoices = {}, prefix = 'items'): DraftMerge<readonly T[]> {
  const before = new Map(base.map(row => [key(row), row]));
  const mine = new Map(local.map(row => [key(row), row]));
  const theirs = new Map(saved.map(row => [key(row), row]));
  const localKeys = local.map(key), savedKeys = saved.map(key), baseKeys = base.map(key);
  const reordered = !draftEqual(localKeys.filter(identity => before.has(identity)), baseKeys.filter(identity => mine.has(identity)));
  const order = [...new Set([...(reordered ? localKeys : savedKeys), ...(reordered ? savedKeys : localKeys), ...baseKeys])];
  const value: T[] = [], conflicts: DraftConflict[] = [];
  const baselines = new Map<string, T>();
  for (const identity of order) {
    const b = before.get(identity), l = mine.get(identity), s = theirs.get(identity);
    const id = `${prefix}.${identity}`;
    if (b !== undefined && l !== undefined && s !== undefined) {
      const result = merge(b, l, s, id); value.push(result.value); conflicts.push(...result.conflicts);
      baselines.set(identity, structuredClone(result.baseline ?? (result.conflicts.length ? b : s)));
      continue;
    }
    if (s !== undefined) baselines.set(identity, structuredClone(s));
    if (draftEqual(l, s)) { if (l !== undefined) value.push(structuredClone(l)); continue; }
    if (draftEqual(b, l)) { if (s !== undefined) value.push(structuredClone(s)); continue; }
    if (draftEqual(b, s)) { if (l !== undefined) value.push(structuredClone(l)); continue; }
    const choice = choices[id];
    const selected = choice === 'saved' ? s : l;
    if (selected !== undefined) value.push(structuredClone(selected));
    if (!choice) {
      conflicts.push({ id, label: itemLabel(l ?? s, identity), localValue: l, savedValue: s });
      if (b === undefined) baselines.delete(identity); else baselines.set(identity, structuredClone(b));
    }
  }
  const baseline = [...new Set([...savedKeys, ...baseKeys])].flatMap(identity => {
    const row = baselines.get(identity); return row === undefined ? [] : [row];
  });
  return { value, conflicts, baseline };
}

function itemLabel(value: unknown, fallback: string): string {
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name || fallback;
  return fallback;
}

function humanize(value: string): string {
  const label = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
