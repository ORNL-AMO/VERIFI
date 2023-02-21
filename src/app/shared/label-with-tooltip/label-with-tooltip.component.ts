import { Component, Input, OnInit } from '@angular/core';
import { LabelTooltips } from './labelTooltips';
// import * as bootstrap from 'bootstrap'
declare var bootstrap: any;
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
  tooltipList: Array<any>;
  constructor() { }

  ngOnInit(): void {
    this.helpTooltip = LabelTooltips[this.field];
    if(!this.helpTooltip){
      this.helpTooltip = {
        tooltip: 'Help Text Missing. Sorry :/'
      }
    }
  }

  ngAfterViewInit(){
    // Bootstrap tooltip initialization
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    this.tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
    }) 
  }

  ngOnDestroy(){
    this.tooltipList;
    for (const tooltip of this.tooltipList) {
      tooltip.dispose();
    }
    this.tooltipList = new Array<any>();
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
