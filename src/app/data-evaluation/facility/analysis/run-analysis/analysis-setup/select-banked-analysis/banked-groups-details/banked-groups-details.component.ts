import { Component, Input } from '@angular/core';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-banked-groups-details',
    templateUrl: './banked-groups-details.component.html',
    styleUrl: './banked-groups-details.component.css',
    standalone: false
})
export class BankedGroupsDetailsComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input()
  showDetail: boolean;


  groupItems: Array<AnalysisGroupItem>;

  constructor(private analysisService: AnalysisService) {
  }

  ngOnInit() {
    this.initializeGroups();
  }


  initializeGroups() {
    this.groupItems = this.analysisItem.groups.map(group => {
      return this.analysisService.getGroupItem(group);
    }).filter(item => {
      return item.group.analysisType != 'skip';
    });
  }
}
