import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Signal, TemplateRef, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AnalysisCategory } from '@data/models/analysis';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';

export interface AnalysisComparisonOption {
  readonly key: string;
  readonly label: string;
  readonly scope: 'account' | 'facility';
  readonly category: AnalysisCategory;
  readonly facilityGuid?: string;
}
export interface AnalysisComparisonSelection { readonly first: string | null; readonly second: string | null; }
const EMPTY_SELECTION: AnalysisComparisonSelection = { first: null, second: null };
export function compatibleAnalyses(first: AnalysisComparisonOption, second: AnalysisComparisonOption): boolean {
  return first.key !== second.key && first.scope === second.scope && first.category === second.category
    && (first.scope === 'account' || first.facilityGuid === second.facilityGuid);
}

/** Transient selection and portal ownership shared by the two Analysis dashboards. */
export class AnalysisComparisonState {
  private readonly portal = inject(ModalPortalService);
  private ownedPortal?: TemplatePortal;
  readonly opened = signal(false);
  readonly selection = signal<AnalysisComparisonSelection>(EMPTY_SELECTION);
  readonly notice = signal<string | undefined>(undefined);
  readonly initialFocus = signal('[formControlName="first"]');
  readonly selectedKeys = computed(() => this.opened() ? [this.selection().first, this.selection().second].filter((key): key is string => !!key) : []);
  readonly complete = computed(() => this.opened() && !!this.selection().first && !!this.selection().second);
  readonly secondOptions = computed(() => {
    const first = this.options().find(option => option.key === this.selection().first);
    return first ? this.options().filter(option => compatibleAnalyses(first, option)) : this.options().filter(option => option.key === this.selection().second);
  });
  constructor(readonly options: Signal<readonly AnalysisComparisonOption[]>, private readonly context: Signal<string | undefined>) {
    let previous = context();
    effect(() => {
      const next = context();
      if (next !== previous) { previous = next; untracked(() => this.close()); }
    });
    effect(() => {
      const options = this.options();
      untracked(() => {
        if (!this.opened()) return;
        const selected = this.selection();
        const first = options.some(option => option.key === selected.first) ? selected.first : null;
        const second = options.some(option => option.key === selected.second) ? selected.second : null;
        if (first !== selected.first || second !== selected.second) {
          this.selection.set({ first, second }); this.notice.set('A selected analysis is no longer available. Choose a replacement.');
        } else if (first && second && !compatibleAnalyses(options.find(option => option.key === first)!, options.find(option => option.key === second)!)) {
          this.selection.set({ first, second: null }); this.notice.set('Choose another compatible analysis for Analysis 2.');
        }
      });
    });
    effect(() => {
      const active = this.portal.activePortal();
      if (this.opened() && this.ownedPortal && active !== this.ownedPortal) untracked(() => this.close());
    });
    inject(DestroyRef).onDestroy(() => this.close());
  }
  open(template: TemplateRef<unknown>, container: ViewContainerRef, key?: string): void {
    if (!this.context() || this.opened()) return;
    this.selection.set({ first: key && this.options().some(option => option.key === key) ? key : null, second: null });
    this.notice.set(undefined);
    this.initialFocus.set(key ? '[formControlName="second"]' : '[formControlName="first"]');
    this.ownedPortal = new TemplatePortal(template, container); this.opened.set(true);
    this.portal.show(this.ownedPortal);
  }
  select(selection: AnalysisComparisonSelection): void {
    if (!this.opened()) return;
    const options = this.options();
    const first = options.find(option => option.key === selection.first);
    const second = options.find(option => option.key === selection.second);
    const compatible = !second || !first || compatibleAnalyses(first, second);
    this.selection.set({ first: first?.key ?? null, second: compatible ? second?.key ?? null : null });
    this.notice.set(!compatible ? 'Analysis 2 was cleared. Choose another compatible analysis.' : undefined);
  }
  close(): void {
    if (this.ownedPortal && this.portal.activePortal() === this.ownedPortal) this.portal.hide();
    this.ownedPortal = undefined; this.opened.set(false); this.selection.set(EMPTY_SELECTION); this.notice.set(undefined);
  }
}
