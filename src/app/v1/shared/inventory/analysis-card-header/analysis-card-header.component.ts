import { Component, input } from '@angular/core';

@Component({
  selector: 'app-analysis-card-header', standalone: true,
  host: { class: 'portfolio-tile__analysis-scope', '[attr.data-scope]': 'scope()' },
  templateUrl: './analysis-card-header.component.html', styleUrls: ['./analysis-card-header.component.css']
})
export class AnalysisCardHeaderComponent {
  readonly scope = input.required<'account' | 'facility'>();
}
