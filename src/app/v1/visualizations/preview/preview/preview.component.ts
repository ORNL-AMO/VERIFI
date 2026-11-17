import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import type { PreviewState } from '../preview-controller';
import { Component, computed, DestroyRef, effect, signal, inject, Input, OnChanges } from '@angular/core';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { PreviewController } from '../preview-controller';
import { PreviewIdentity } from '../preview-registry';

@Component({
  selector: 'app-visualization-preview', standalone: false,
  templateUrl: './preview.component.html', styleUrl: './preview.component.css', providers: [PreviewController]
})
export class PreviewComponent implements OnChanges {
  @Input() definition?: VisualizationDefinition;
  @Input() identity?: PreviewIdentity;
  @Input() active = true;
  readonly preview = inject(PreviewController);
  private readonly lastReady = signal<Extract<PreviewState, { state: 'ready' }> | undefined>(undefined);
  readonly renderedPreview = computed(() => {
    const state = this.preview.state();
    return state.state === 'ready' ? state : state.state === 'loading' ? this.lastReady() : undefined;
  });
  readonly pageControl = new FormControl(0, { nonNullable: true });
  private readonly pageValue = toSignal(this.pageControl.valueChanges, { initialValue: 0 });
  readonly dataPage = computed(() => {
    const state = this.preview.state(), rows = state.state === 'ready' ? state.presentation.details.rows : [];
    const last = Math.max(0, Math.ceil(rows.length / 50) - 1);
    const page = Math.max(0, Math.min(last, this.pageValue()));
    return { rows: rows.slice(page * 50, page * 50 + 50), page, last, count: rows.length,
      start: rows.length ? page * 50 + 1 : 0, end: Math.min(rows.length, page * 50 + 50) };
  });
  readonly canRetry = computed(() => ['error', 'empty', 'missing-source', 'loading'].includes(this.preview.state().state));
  constructor() {
    effect(() => {
      const state = this.preview.state();
      if (state.state === 'ready') this.lastReady.set(state);
      else if (state.state !== 'loading') this.lastReady.set(undefined);
    });
    inject(DestroyRef).onDestroy(() => this.preview.destroy());
  }
  ngOnChanges(): void {
    const previous = this.lastReady();
    const first = previous?.evidence[0]?.request.identity;
    if (!this.active || first?.accountGuid !== this.identity?.accountGuid || first?.definitionGuid !== this.identity?.definitionGuid) {
      this.lastReady.set(undefined); this.pageControl.setValue(0);
    }
    this.preview.update(this.definition, this.identity, this.active);
  }
  changePage(offset: number): void { this.pageControl.setValue(this.dataPage().page + offset); }
}
