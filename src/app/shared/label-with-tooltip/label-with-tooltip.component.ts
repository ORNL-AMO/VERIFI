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
  @Input()
  isSemiBold: boolean;

  helpTooltip: { tooltip: string };
  showTooltipHover: boolean = false;
  showTooltipClick: boolean = false;
  constructor() { }

  ngOnInit(): void {
    this.helpTooltip = LabelTooltips[this.field];
    if(!this.helpTooltip){
      this.helpTooltip = {
        tooltip: 'Help Text Missing. Sorry :/'
      }
    }
  }
  
  hideTooltipHover() {
    this.showTooltipHover = false;
  }

  displayTooltipHover() {
    this.showTooltipHover = true;
  }

  toggleClickTooltip(){
    this.showTooltipClick = !this.showTooltipClick;
  }
}
