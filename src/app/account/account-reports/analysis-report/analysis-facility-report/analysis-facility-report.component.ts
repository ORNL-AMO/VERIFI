import { Component, Input } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-analysis-facility-report',
  standalone: false,

  templateUrl: './analysis-facility-report.component.html',
  styleUrl: './analysis-facility-report.component.css'
})
export class AnalysisFacilityReportComponent {

  @Input()
  facilityDetails: Array<IdbAnalysisItem>;

  facilityAnalysisItems: Array<FacilityGroupAnalysisItem> = [];
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
  absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];

  ngOnChanges() {
    this.initializeGroups();
    this.getRegressionGroupItems(this.facilityAnalysisItems);
    this.getClassicIntensityItems(this.facilityAnalysisItems);
    this.getAbsoluteItems(this.facilityAnalysisItems);
  }

  initializeGroups() {
    this.facilityDetails.forEach(facility => {
      facility.groups.forEach(group => {
        let groupItem: FacilityGroupAnalysisItem = this.getGroupItem(group, facility.facilityId, facility.baselineYear);
        console.log('groupItem', groupItem);
        if (groupItem) {
          this.facilityAnalysisItems.push(groupItem);
        }
      });
    });
    this.facilityAnalysisItems = this.facilityAnalysisItems.filter(item => {
      return item.group.analysisType != 'skip';
    });
  }

  getGroupItem(group: AnalysisGroup, facilityId: string, baselineYear: number): FacilityGroupAnalysisItem {
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
      if (group.selectedModelId) {
        selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
      }
    }
    return {
      group: group,
      selectedModel: selectedModel,
      facilityId: facilityId,
      baselineYear: baselineYear
    }
  }

  getRegressionGroupItems(facilityAnalysisItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = facilityAnalysisItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }

  getClassicIntensityItems(facilityAnalysisItems: FacilityGroupAnalysisItem[]) {
    this.classicIntensityGroupItems = facilityAnalysisItems.filter(item => {
      return item.group.analysisType == 'energyIntensity';
    });
  }

   getAbsoluteItems(facilityAnalysisItems: FacilityGroupAnalysisItem[]) {
    this.absoluteGroupItems = facilityAnalysisItems.filter(item => {
      return item.group.analysisType == 'absoluteEnergyConsumption';
    });
  }
}

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}


