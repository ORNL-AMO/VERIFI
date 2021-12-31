import { Component, Input, OnInit } from '@angular/core';
import { LabelTooltips } from './labelTooltips';

@Component({
  selector: 'app-label-with-tooltip',
  templateUrl: './label-with-tooltip.component.html',
  styleUrls: ['./label-with-tooltip.component.css']
})
export class LabelWithTooltipComponent implements OnInit {
  @Input()
  field: string;
  @Input()
  label: string;
  @Input()
  isRequired: boolean;
  @Input()
  labelId: string;
  @Input()
  isBold: boolean;

  helpTooltip: { tooltip: string };
  showTooltip: boolean = false;
  constructor() { }

  ngOnInit(): void {
    this.helpTooltip = LabelTooltips[this.field];
  }

  
  hideTooltip() {
    this.showTooltip = false;
  }

  displayTooltip() {
    this.showTooltip = true;
  }
}
