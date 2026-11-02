import { Component, input } from '@angular/core';
import { RecentNavItem } from '../recent-items.service';

@Component({ selector: 'app-recent-items-nav', standalone: false,
  templateUrl: './recent-items-nav.component.html', styleUrls: ['./recent-items-nav.component.css'] })
export class RecentItemsNavComponent {
  readonly items = input.required<readonly RecentNavItem[]>();
  readonly section = input.required<'analysis' | 'reports'>();
}
