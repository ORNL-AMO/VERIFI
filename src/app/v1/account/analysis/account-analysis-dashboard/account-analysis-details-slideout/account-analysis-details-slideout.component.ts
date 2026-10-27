import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FacilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { AccountAnalysisCard } from '../account-analysis.models';
import { AnalysisDetailsStatusComponent } from '@app/v1/shared/analysis-results/details-status/analysis-details-status.component';
import { AnalysisLinkedItemsComponent } from '@app/v1/shared/analysis-results/linked-items/analysis-linked-items.component';
import { analysisLinkedReport } from '@app/v1/shared/analysis-results/linked-items/analysis-linked-items.models';
import { buildFacilityAnalysisCandidate, facilityAnalysisEligible, FacilityAnalysisDataInputs } from '../../account-analysis-workbench/select-facility-items/account-analysis-facility-selection.models';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';

@Component({
  selector: 'app-account-analysis-details-slideout',
  standalone: true,
  imports: [WorkspaceSlideoutComponent, IconComponent, DatePipe, AnalysisDetailsStatusComponent, AnalysisLinkedItemsComponent],
  templateUrl: './account-analysis-details-slideout.component.html',
  styleUrls: ['./account-analysis-details-slideout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountAnalysisDetailsSlideoutComponent {
  readonly card = input.required<AccountAnalysisCard>();
  readonly outcomeDisplay = input.required<FacilityAnalysisOutcomeDisplay>();
  readonly ownerName = input('Account');
  readonly showCategory = input(true);
  readonly evaluation = input<StatusEvaluationState>('ready');
  readonly facilityInputs = input<FacilityAnalysisDataInputs>({ meterGroups: [], meters: [], meterData: [], predictorData: [] });
  readonly facilityFindings = input<readonly StatusItem[]>([]);
  readonly actionLabel = input<string>();
  readonly actionIcon = input<IconName>('arrowRight');
  readonly actionDisabled = input(false);
  readonly secondaryActionLabel = input<string>();
  readonly secondaryActionDisabled = input(false);
  readonly closed = output<void>();
  readonly actionSelected = output<void>();
  readonly secondaryActionSelected = output<void>();
  readonly linkedReports = computed(() => this.card().linkedReports.map(analysisLinkedReport));
  readonly facilityRows = computed(() => this.card().facilitySelections.map(selection => {
    const candidate = selection.analysis?.facilityId === selection.facilityGuid
      ? buildFacilityAnalysisCandidate(selection.analysis, this.facilityFindings(), this.evaluation(), this.facilityInputs()) : undefined;
    const mismatched = selection.state === 'included' && (!selection.analysis || !selection.facility
      || !facilityAnalysisEligible(selection.analysis, this.card().analysis, selection.facility));
    const selectionState = mismatched ? 'invalid' : selection.state;
    const detail = mismatched ? 'Selection no longer matches this account analysis' : selection.detail;
    const state = selectionState === 'skipped' ? 'skipped' : selectionState !== 'included' ? 'error'
      : this.evaluation() !== 'ready' ? 'evaluating' : candidate?.state ?? 'evaluating';
    const statusLabel = state === 'skipped' ? 'Skipped' : state === 'error' ? 'Errors' : state === 'warning' ? 'Warnings'
      : state === 'ready' ? 'No Issues' : this.evaluation() === 'error' ? 'Checks unavailable' : 'Checking';
    const statusIcon: IconName = state === 'skipped' ? 'skip' : state === 'ready' ? 'success'
      : state === 'evaluating' ? this.evaluation() === 'error' ? 'info' : 'loading' : 'warning';
    const modified = candidate?.analysis.modifiedDate ? new Date(candidate.analysis.modifiedDate) : undefined;
    const savedSelection = this.card().analysis.facilityAnalysisItems?.find(item => item.facilityId === selection.facilityGuid)?.analysisItemId;
    return { ...selection, state: selectionState, detail,
      analysisName: selectionState === 'missing' ? 'No Analysis Selected' : selection.analysisName,
      showDetail: selectionState !== 'included' && (selectionState !== 'missing' || !!savedSelection), candidate, statusLabel, statusIcon,
      pending: state === 'evaluating' && this.evaluation() !== 'error',
      statusTone: state === 'ready' ? 'success' : state === 'error' ? 'danger' : state === 'warning' ? 'warning' : 'neutral',
      modified: modified && Number.isFinite(modified.getTime()) ? modified : undefined };
  }));
}
