import { Component, Input } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

let nextTooltipId = 0;

@Component({
  selector: 'app-ui-tooltip',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.css']
})
export class TooltipComponent {
  @Input({ required: true }) text!: string;
  @Input() label = 'More information';
  @Input() placement: 'top' | 'bottom' = 'top';
  readonly tooltipId = `v1-tooltip-${nextTooltipId++}`;
}
