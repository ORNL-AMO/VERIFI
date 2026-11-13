import { Component, computed, DestroyRef, inject, Input, OnChanges, signal } from '@angular/core';
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
  readonly pageSize = 50;
  readonly page = signal(1);
  readonly printing = signal(false);
  readonly detailRows = computed(() => { const view = this.preview.state(); return view.state === 'ready' ? view.presentation.details.rows : []; });
  readonly currentPage = computed(() => Math.min(Math.max(1, this.page()), Math.max(1, Math.ceil(this.detailRows().length / this.pageSize))));
  readonly visibleRows = computed(() => this.printing() ? this.detailRows()
    : this.detailRows().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize));

  constructor() {
    const beforePrint = () => this.printing.set(true), afterPrint = () => this.printing.set(false);
    if (typeof window !== 'undefined') { window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', afterPrint); }
    inject(DestroyRef).onDestroy(() => {
      this.preview.destroy();
      if (typeof window !== 'undefined') { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); }
    });
  }
  ngOnChanges(): void { this.page.set(1); this.preview.update(this.definition, this.identity, this.active); }
}
