import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { facilityAnalysisBaselineForAccount } from '../account-analysis-facility-selection.models';

@Component({
  selector: 'app-create-facility-analysis-slideout',
  standalone: true,
  imports: [WorkspaceSlideoutComponent, IconComponent],
  templateUrl: './create-facility-analysis-slideout.component.html',
  styleUrls: ['./create-facility-analysis-slideout.component.css']
})
export class CreateFacilityAnalysisSlideoutComponent {
  @Input({ required: true }) facility!: IdbFacility;
  @Input({ required: true }) accountAnalysis!: IdbAccountAnalysisItem;
  @Input() busy = false;
  @Input() error?: string;
  @Output() readonly submitted = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  get baselineYear(): number {
    return facilityAnalysisBaselineForAccount(this.accountAnalysis, this.facility);
  }
}
