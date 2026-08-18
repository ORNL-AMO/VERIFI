import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnalysisCategory } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { UnitOption } from 'src/app/shared/unitOptions';

@Component({
  selector: 'app-p1-facility-analysis-setup-panel',
  templateUrl: './analysis-setup-panel.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisSetupPanelComponent {
  @Input({ required: true }) analysis: IdbAnalysisItem;
  @Input() facility: IdbFacility | undefined;
  @Input() baselineYears: number[] = [];
  @Input() energyUnitOptions: UnitOption[] = [];
  @Input() waterUnitOptions: UnitOption[] = [];
  @Input() bankingOptions: IdbAnalysisItem[] = [];
  @Input() linkedAccountCount = 0;
  @Input() canWrite = false;

  @Output() saveAnalysis = new EventEmitter<IdbAnalysisItem>();

  update<K extends keyof IdbAnalysisItem>(key: K, value: IdbAnalysisItem[K]): void {
    this.saveAnalysis.emit({ ...structuredClone(this.analysis), [key]: value });
  }

  toggleBanking(enabled: boolean): void {
    this.saveAnalysis.emit({
      ...structuredClone(this.analysis),
      hasBanking: enabled,
      bankedAnalysisItemId: enabled ? this.analysis.bankedAnalysisItemId : undefined
    });
  }

  get unitLabel(): string {
    return this.analysis.analysisCategory === 'water' ? 'Water Unit' : 'Energy Unit';
  }

  get unitOptions(): UnitOption[] {
    return this.analysis.analysisCategory === 'water' ? this.waterUnitOptions : this.energyUnitOptions;
  }

  get category(): AnalysisCategory {
    return this.analysis.analysisCategory;
  }
}
