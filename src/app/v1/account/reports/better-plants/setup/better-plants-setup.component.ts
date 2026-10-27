import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountReportWorkbenchContext } from '../../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../../account-report-workbench/account-report-autosave.service';

@Component({ selector: 'app-better-plants-setup', standalone: false,
  templateUrl: './better-plants-setup.component.html', styleUrls: ['./better-plants-setup.component.css'] })
export class BetterPlantsSetupComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
  readonly form = this.editor.form.controls.betterPlants;
  private readonly draft = toSignal(this.editor.form.valueChanges, { initialValue: this.editor.form.getRawValue() });
  private readonly current = computed(() => { this.draft(); this.context.report(); return this.editor.form.getRawValue(); });
  readonly analysis = computed(() => {
    const choice = this.context.analysisOptions().find(option => option.value === this.current().analysis)?.selection;
    return choice?.scope === 'facility'
      ? this.context.workspace.facilityAnalyses().find(item => item.guid === choice.analysisGuid && item.facilityId === choice.facilityGuid)
      : this.context.workspace.accountAnalyses().find(item => item.guid === choice?.analysisGuid);
  });
  readonly water = computed(() => this.analysis()?.analysisCategory === 'water');
}
