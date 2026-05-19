import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { AnalysisService } from '../../analysis.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { debounceTime, firstValueFrom } from 'rxjs';
import { VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getYearsWithFullDataAnalysis } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css'],
  standalone: false
})
export class AnalysisSetupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facilityDbService = inject(FacilitydbService);
  private readonly analysisDbService = inject(AnalysisDbService);
  private readonly analysisService = inject(AnalysisService);
  private readonly router = inject(Router);
  private readonly dbChangesService = inject(DbChangesService);
  private readonly accountDbService = inject(AccountdbService);
  private readonly calanderizationService = inject(CalanderizationService);
  private readonly accountAnalysisDbService = inject(AccountAnalysisDbService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);

  readonly energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  readonly waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;

  readonly calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  readonly facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  readonly analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  readonly account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  readonly hideInUseMessage: Signal<boolean> = toSignal(this.analysisService.hideInUseMessage);
  readonly allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  readonly facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);


  readonly analysisStatusCheck = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) { return undefined; }
    return facilityStatusCheck.getAnalysisStatusById(analysisItem.guid);
  });

  /** True when any analysis group has setup configuration errors. */
  readonly hasGroupSetupErrors = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasErrors) ?? false;
  });

  /** True when any analysis group has regression model errors. */
  readonly hasGroupModelWarnings = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasRegressionErrors) ?? false;
  });

  yearOptions: Signal<Array<number>> = computed(() => {
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters();
    const facility: IdbFacility = this.facility();
    if (!analysisItem || !calanderizedMeters || !facility) {
      return [];
    }
    return getYearsWithFullDataAnalysis(calanderizedMeters, analysisItem, facility);
  });

  baselineYearWarning: Signal<string> = computed(() => {
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const facility: IdbFacility = this.facility();
    if (!analysisItem || !facility) {
      return undefined;
    }
    if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear && facility.sustainabilityQuestions.waterReductionGoal && facility.sustainabilityQuestions.waterReductionBaselineYear != analysisItem.baselineYear) {
        return "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility water goal."
      } else {
        return undefined;
      }
    } else if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear && facility.sustainabilityQuestions.energyReductionGoal && facility.sustainabilityQuestions.energyReductionBaselineYear != analysisItem.baselineYear) {
        return "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal.";
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  });

  showInUseMessage: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (analysisItem && this.hideInUseMessage() == false) {
      const accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(analysisItem.guid);
      if (accountAnalysisItems.length != 0) {
        return true;
      }
    }
    return false;
  });

  hasModelsGenerated: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (!analysisItem) {
      return false;
    }
    let hasModelsGenerated: boolean = false;
    analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        if (group.models && group.models.length != 0) {
          hasModelsGenerated = true;
        }
      }
    });
    return hasModelsGenerated;
  });

  readonly facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => {
    const analysisItem = this.analysisItem();
    const allFacilityAnalysisItems = this.allFacilityAnalysisItems();
    if (!analysisItem || !allFacilityAnalysisItems) {
      return [];
    }
    return allFacilityAnalysisItems.filter(item => {
      return item.energyIsSource == analysisItem.energyIsSource && item.guid != analysisItem.guid && item.analysisCategory == analysisItem.analysisCategory;
    });
  });

  // Tracks the GUID of the selected analysis item to detect item switches vs. saves of the same item.
  private readonly _currentItemGuid = computed(() => this.analysisItem()?.guid);

  readonly form: FormGroup<{
    name: FormControl<string>;
    energyIsSource: FormControl<boolean>;
    energyUnit: FormControl<string>;
    waterUnit: FormControl<string>;
    hasBanking: FormControl<boolean>;
    baselineYear: FormControl<number | null>;
    bankedAnalysisItemId: FormControl<string | null>;
  }> = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    energyIsSource: this.fb.nonNullable.control<boolean>(true),
    energyUnit: this.fb.nonNullable.control(''),
    waterUnit: this.fb.nonNullable.control(''),
    hasBanking: this.fb.nonNullable.control(false),
    baselineYear: this.fb.control<number | null>(null, Validators.required),
    bankedAnalysisItemId: this.fb.control<string | null>(null),
  });

  displayEnableForm = false;

  constructor() {
    // Patch form only when switching to a different analysis item (GUID change).
    // Using untracked() to read the item value without creating an additional reactive dependency.
    effect(() => {
      this._currentItemGuid();
      const item = untracked(() => this.analysisItem());
      if (!item) { return; }
      this.form.patchValue({
        name: item.name,
        energyIsSource: item.energyIsSource,
        energyUnit: item.energyUnit,
        waterUnit: item.waterUnit,
        hasBanking: item.hasBanking,
        baselineYear: item.baselineYear ?? null,
        bankedAnalysisItemId: item.bankedAnalysisItemId ?? null,
      }, { emitEvent: false });
    });

    // Manage individual control disabled states based on model lock and in-use status.
    effect(() => {
      const locked = this.hasModelsGenerated();
      const inUse = this.showInUseMessage();
      const { energyIsSource, energyUnit, waterUnit, hasBanking, baselineYear } = this.form.controls;

      // Locked when models exist OR analysis is in use by an account analysis
      if (locked || inUse) {
        energyIsSource.disable({ emitEvent: false });
        baselineYear.disable({ emitEvent: false });
      } else {
        energyIsSource.enable({ emitEvent: false });
        baselineYear.enable({ emitEvent: false });
      }

      // Locked only when models exist
      if (locked) {
        energyUnit.disable({ emitEvent: false });
        waterUnit.disable({ emitEvent: false });
        hasBanking.disable({ emitEvent: false });
      } else {
        energyUnit.enable({ emitEvent: false });
        waterUnit.enable({ emitEvent: false });
        hasBanking.enable({ emitEvent: false });
      }
    });

    // Clear bankedAnalysisItemId when hasBanking is toggled off.
    this.form.controls.hasBanking.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(hasBanking => {
      if (!hasBanking) {
        this.form.controls.bankedAnalysisItemId.setValue(null);
      }
    });

    // Auto-save on any valid form value change.
    this.form.valueChanges.pipe(
      debounceTime(100),
      takeUntilDestroyed()
    ).subscribe(() => {
      if (this.form.valid) {
        this.saveItem();
      }
    });

    //turn off banking if there are no other analysis items to bank with
    effect(() => {
      const facilityAnalysisItems = this.facilityAnalysisItems();
      if (this.form.controls.hasBanking.value == true && facilityAnalysisItems.length == 0) {
        this.form.controls.hasBanking.setValue(false);
      }
    });
  }

  async saveItem(): Promise<void> {
    const item = this.analysisItem();
    if (!item) { return; }
    const raw = this.form.getRawValue();
    const updatedItem: IdbAnalysisItem = {
      ...item,
      name: raw.name,
      energyIsSource: raw.energyIsSource,
      energyUnit: raw.energyUnit,
      waterUnit: raw.waterUnit,
      hasBanking: raw.hasBanking,
      baselineYear: raw.baselineYear ?? item.baselineYear,
      bankedAnalysisItemId: raw.hasBanking ? (raw.bankedAnalysisItemId ?? undefined) : undefined,
    };
    await firstValueFrom(this.analysisDbService.updateWithObservable(updatedItem));
    const selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    const selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(updatedItem);
  }

  toggleHideInUseMessage(): void {
    this.analysisService.hideInUseMessage.next(true);
  }

  showEnableForm(): void {
    this.displayEnableForm = true;
  }

  cancelEnableForm(): void {
    this.displayEnableForm = false;
  }

  async confirmEnableForm(): Promise<void> {
    const item = this.analysisItem();
    if (!item) { return; }
    const clearedItem: IdbAnalysisItem = {
      ...item,
      groups: item.groups.map(group => ({
        ...group,
        models: [],
        selectedModelId: undefined,
        regressionConstant: undefined,
        regressionModelYear: undefined,
        predictorVariables: group.predictorVariables.map(variable => ({
          ...variable,
          regressionCoefficient: undefined,
        })),
      })),
    };
    await firstValueFrom(this.analysisDbService.updateWithObservable(clearedItem));
    const selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    const selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(clearedItem);
    this.displayEnableForm = false;
  }

  goToSavingsReport(): void {
    this.router.navigate(['../../../reports'], { relativeTo: this.activatedRoute });
  }

  goToSettings(): void {
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }

  setBankedAnalysisItemId(bankedAnalysisItemId: string): void {
    this.form.controls.bankedAnalysisItemId.setValue(bankedAnalysisItemId);
  }
}
