import type { PreviewState } from '../preview-controller';
import { Component, computed, DestroyRef, effect, signal, inject, Input, OnChanges, output } from '@angular/core';
import type { MonthlyPatternsModel } from '../../monthly-patterns/monthly-patterns.presenter';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { PreviewController } from '../preview-controller';
import { PreviewIdentity, PreviewDateContextResolver } from '../preview-registry';

@Component({
  selector: 'app-visualization-preview', standalone: false,
  templateUrl: './preview.component.html', styleUrl: './preview.component.css', providers: [PreviewController]
})
export class PreviewComponent implements OnChanges {
  @Input() definition?: VisualizationDefinition;
  @Input() identity?: PreviewIdentity;
  @Input() active = true;
  @Input() dates?: PreviewDateContextResolver;
  readonly preview = inject(PreviewController);
  readonly yearVisibilityChanged = output<readonly number[]>();
  readonly monthlyPatternsModel = computed(() => {
    const rendered = this.renderedPreview();
    return rendered?.definition.chart?.kind === 'monthly-patterns' ? rendered.presentation.inputs['model'] as MonthlyPatternsModel : undefined;
  });
  private readonly lastReady = signal<Extract<PreviewState, { state: 'ready' }> | undefined>(undefined);
  readonly renderedPreview = computed(() => {
    const state = this.preview.state();
    return state.state === 'ready' ? state : state.state === 'loading' ? this.lastReady() : undefined;
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
      this.lastReady.set(undefined);
    }
    this.preview.update(this.definition, this.identity, this.active, this.dates);
  }
}
