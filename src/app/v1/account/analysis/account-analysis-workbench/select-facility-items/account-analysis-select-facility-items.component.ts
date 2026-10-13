import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  QueryList,
  ViewChildren,
  afterNextRender,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-details-slideout/analysis-details-slideout.component';
import { FacilityAnalysisDetailsResultsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-details-slideout/facility-analysis-details-results.service';
import { facilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from './account-analysis-facility-selection.service';
import { CreateFacilityAnalysisSlideoutComponent } from './create-facility-analysis-slideout/create-facility-analysis-slideout.component';

@Component({
  selector: 'app-account-analysis-select-facility-items',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    IconComponent,
    AnalysisDetailsSlideoutComponent,
    CreateFacilityAnalysisSlideoutComponent
  ],
  providers: [FacilityAnalysisDetailsResultsService],
  templateUrl: './account-analysis-select-facility-items.component.html',
  styleUrls: ['./account-analysis-select-facility-items.component.css']
})
export class AccountAnalysisSelectFacilityItemsComponent {
  private readonly injector = inject(Injector);
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly detailsResults = inject(FacilityAnalysisDetailsResultsService);
  readonly selectionControl = new FormControl<string | null>(null);
  readonly reportWarningDismissed = signal(false);
  readonly createOpen = signal(false);
  readonly detailsGuid = signal<string | undefined>(undefined);
  readonly detailsCard = computed(() => this.selection.detailCards()
    .find(card => card.analysis.guid === this.detailsGuid()));
  readonly detailsOutcomeDisplay = computed(() => {
    const card = this.detailsCard();
    if (!card) return undefined;
    const state = this.detailsResults.state();
    return state.state === 'idle' || state.analysisGuid !== card.analysis.guid
      ? facilityAnalysisOutcomeDisplay({ state: 'loading', message: 'Preparing results…' }, card.category)
      : facilityAnalysisOutcomeDisplay(state, card.category);
  });
  readonly leaving = signal(false);
  @ViewChildren('facilityNavItem')
  private readonly facilityNavItems?: QueryList<ElementRef<HTMLButtonElement>>;

  constructor() {
    effect(() => {
      this.selection.activeFacilityGuid();
      afterNextRender(() => this.scrollActiveFacilityIntoView(), { injector: this.injector });
    });
    effect(() => {
      const value = this.selection.activeItem()?.analysisItemId ?? null;
      this.selectionControl.setValue(value, { emitEvent: false });
      if (this.selection.canMutate()) this.selectionControl.enable({ emitEvent: false });
      else this.selectionControl.disable({ emitEvent: false });
    });
    this.selectionControl.valueChanges.subscribe(value => {
      if (!value) return;
      if (value === 'skip') this.selection.skipFacility();
      else this.selection.selectAnalysis(value);
    });
  }

  openCreate(): void {
    if (!this.selection.canMutate()) return;
    this.selection.clearError();
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (!this.selection.busy()) this.createOpen.set(false);
  }

  async createAnalysis(): Promise<void> {
    await this.selection.createFacilityAnalysis();
  }

  requestView(analysis: IdbAnalysisItem): void {
    this.detailsGuid.set(analysis.guid);
    this.detailsResults.open(analysis.guid);
  }

  closeDetails(): void {
    if (this.leaving()) return;
    this.detailsGuid.set(undefined);
    this.detailsResults.close();
  }

  async openDetails(): Promise<void> {
    const analysis = this.detailsCard()?.analysis;
    if (!analysis || this.leaving()) return;
    this.leaving.set(true);
    try {
      const opened = await this.selection.openFacilityAnalysis(analysis);
      if (opened) {
        this.detailsGuid.set(undefined);
        this.detailsResults.close();
      }
    } finally {
      this.leaving.set(false);
    }
  }

  private scrollActiveFacilityIntoView(): void {
    const activeButton = this.facilityNavItems
      ?.find(item => item.nativeElement.getAttribute('aria-current') === 'step')
      ?.nativeElement;
    activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
}
