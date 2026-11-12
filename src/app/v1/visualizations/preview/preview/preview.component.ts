import { Component, computed, DestroyRef, inject, Input, OnChanges } from '@angular/core';
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
  readonly canRetry = computed(() => ['error', 'empty', 'missing-source', 'loading'].includes(this.preview.state().state));

  constructor() { inject(DestroyRef).onDestroy(() => this.preview.destroy()); }
  ngOnChanges(): void { this.preview.update(this.definition, this.identity, this.active); }
}
