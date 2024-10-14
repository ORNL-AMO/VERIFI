import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-select-banked-analysis',
  templateUrl: './select-banked-analysis.component.html',
  styleUrl: './select-banked-analysis.component.css'
})
export class SelectBankedAnalysisComponent {
  @Input({ required: true })
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({required: true})
  facility: IdbFacility;
  
  constructor() {

  }

  ngOnInit() {

  }
}
