import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

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

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  constructor(private analysisService: AnalysisService,
    private calanderizationService: CalanderizationService
  ) {
  }

  ngOnInit() {
    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeterData.subscribe(meters => {
      this.calanderizedMeters = meters;
    });
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
