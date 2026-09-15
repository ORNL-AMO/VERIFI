import { Component, Input } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

@Component({
  selector: 'app-account-portfolio-placeholder-tab',
  templateUrl: './account-portfolio-placeholder-tab.component.html',
  styleUrls: ['./account-portfolio-placeholder-tab.component.css'],
  standalone: false
})
export class AccountPortfolioPlaceholderTabComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) icon!: IconName;
}
