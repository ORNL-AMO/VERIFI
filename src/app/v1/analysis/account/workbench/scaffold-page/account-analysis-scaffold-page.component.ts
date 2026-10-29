import { Component, Input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

@Component({
  selector: 'app-account-analysis-scaffold-page',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './account-analysis-scaffold-page.component.html',
  styleUrls: ['./account-analysis-scaffold-page.component.css']
})
export class AccountAnalysisScaffoldPageComponent {
  @Input({ required: true }) headingId = '';
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) icon: IconName = 'analysis';
}
