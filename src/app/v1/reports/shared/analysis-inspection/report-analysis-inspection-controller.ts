import { DestroyRef, Signal, computed, effect, inject, signal } from '@angular/core';

export interface ReportAnalysisInspectionAdapter<TEntry> {
  readonly key: Signal<string>;
  readonly canSelect: Signal<boolean>;
  find(value: string): TEntry | undefined;
  setDemand(entries: readonly TEntry[]): void;
  select(value: string, entry: TEntry): void;
  flush(): Promise<boolean>;
  navigate(entry: TEntry): Promise<unknown>;
}

/** Inspection lifecycle shared by report setup screens; adapters retain scope, selection and route ownership. */
export class ReportAnalysisInspectionController<TEntry> {
  private readonly destroy = inject(DestroyRef);
  private readonly target = signal<{ readonly key: string; readonly value: string } | undefined>(undefined);
  private readonly openingValue = signal(false);
  readonly opening = this.openingValue.asReadonly();
  readonly entry = computed(() => {
    const target = this.target();
    return target?.key === this.adapter.key() ? this.adapter.find(target.value) : undefined;
  });

  constructor(private readonly adapter: ReportAnalysisInspectionAdapter<TEntry>) {
    effect(() => {
      const entry = this.entry();
      this.adapter.setDemand(entry ? [entry] : []);
    });
    this.destroy.onDestroy(() => this.adapter.setDemand([]));
  }

  inspect(value: string): void {
    if (this.adapter.find(value)) this.target.set({ key: this.adapter.key(), value });
  }

  close(): void { this.target.set(undefined); }

  select(): void {
    const target = this.target(), entry = this.entry();
    if (!target || !entry || !this.adapter.canSelect() || this.opening()) return;
    this.adapter.select(target.value, entry);
    this.close();
  }

  async goToAnalysis(): Promise<void> {
    const target = this.target();
    if (this.opening() || !target || !this.entry()) return;
    this.openingValue.set(true);
    try {
      if (!await this.adapter.flush() || this.destroy.destroyed
        || target !== this.target() || target.key !== this.adapter.key()) return;
      const entry = this.entry();
      if (entry) await this.adapter.navigate(entry);
    } finally {
      this.openingValue.set(false);
    }
  }
}
