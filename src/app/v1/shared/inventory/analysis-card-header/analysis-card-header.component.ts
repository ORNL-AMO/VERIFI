import { Component, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-analysis-card-header', standalone: true,
  imports: [IconComponent],
  host: { class: 'portfolio-tile__analysis-scope', '[attr.data-scope]': 'scope()' },
  templateUrl: './analysis-card-header.component.html', styleUrls: ['./analysis-card-header.component.css']
})
export class AnalysisCardHeaderComponent {
  readonly scope = input.required<'account' | 'facility'>();
}
