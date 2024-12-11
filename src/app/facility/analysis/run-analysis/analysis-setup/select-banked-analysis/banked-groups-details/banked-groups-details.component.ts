import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisGroupItem, getGroupItem } from 'src/app/shared/shared-analysis/analysisGroupItem';

@Component({
  selector: 'app-banked-groups-details',
  templateUrl: './banked-groups-details.component.html',
  styleUrl: './banked-groups-details.component.css'
})
export class BankedGroupsDetailsComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input()
  showDetail: boolean;


  groupItems: Array<AnalysisGroupItem>;

  constructor() {
  }

  ngOnInit() {
    this.initializeGroups();
  }


  initializeGroups() {
    this.groupItems = this.analysisItem.groups.map(group => {
      return getGroupItem(group);
    }).filter(item => {
      return item.group.analysisType != 'skip';
    });
  }
}
