import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup, IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css']
})
export class GroupAnalysisOptionsComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
    })
  }

  ngOnDestroy(){
    this.selectedGroupSub.unsubscribe();
  }

  saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => {return group.idbGroup.id == this.group.idbGroup.id});
    analysisItem.groups[groupIndex] = this.group;
    this.analysisDbService.update(analysisItem);
    this.analysisDbService.setAccountAnalysisItems();
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
  }
}
