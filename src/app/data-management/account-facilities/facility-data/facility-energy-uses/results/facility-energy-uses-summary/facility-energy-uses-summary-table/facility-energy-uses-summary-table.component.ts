import { Component, computed, effect, inject, Input, Signal, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyUsesFacilitySummary, FacilityEnergyUseGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import * as _ from 'lodash';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';

@Component({
  selector: 'app-facility-energy-uses-summary-table',
  standalone: false,
  templateUrl: './facility-energy-uses-summary-table.component.html',
  styleUrl: './facility-energy-uses-summary-table.component.css',
})
export class FacilityEnergyUsesSummaryTableComponent {
  @Input({ required: true })
  set energyUsesFacilitySummary(value: EnergyUsesFacilitySummary) {
    this.energyUsesFacilitySummary$.set(value);
  }
  get energyUsesFacilitySummary(): EnergyUsesFacilitySummary {
    return this.energyUsesFacilitySummary$();
  }
  private energyUsesFacilitySummary$ = signal<EnergyUsesFacilitySummary | null>(null);
  @Input({ required: true })
  set displayHistory(value: boolean) {
    this.displayHistory$.set(value);
  }
  get displayHistory(): boolean {
    return this.displayHistory$();
  }
  private displayHistory$ = signal<boolean>(false);

  @Input({ required: true })
  facility: IdbFacility;

  private router: Router = inject(Router);

  orderByField$: WritableSignal<string> = signal('totalEnergyUse');
  get orderByField(): string {
    return this.orderByField$();
  }
  set orderByField(value: string) {
    this.orderByField$.set(value);
  }
  orderByDir$: WritableSignal<'asc' | 'desc'> = signal('desc');
  get orderByDir(): 'asc' | 'desc' {
    return this.orderByDir$();
  }
  set orderByDir(value: 'asc' | 'desc') {
    this.orderByDir$.set(value);
  }
  orderByYear$: WritableSignal<number> = signal(0);
  get orderByYear(): number {
    return this.orderByYear$();
  }
  set orderByYear(value: number) {
    this.orderByYear$.set(value);
  }

  filteredEnergyUseFacilitySummary$: Signal<EnergyUsesFacilitySummary> = computed(() => {
    // Reading the signal (not the getter) registers it as a reactive dependency,
    // so this computed re-evaluates whenever the input, display mode, or sort changes.
    const raw = this.energyUsesFacilitySummary$();
    const year = this.orderByYear$();
    if (!raw) {
      return null;
    }
    let summary: EnergyUsesFacilitySummary = _.cloneDeep(raw);
    //filter out years if not displaying history
    if (!this.displayHistory$()) {
      summary = summary.filterHistory();
    }

    //order results
    if (this.orderByField != 'groupName') {
      summary.footprintGroups = _.orderBy(summary.footprintGroups, [(group: EnergyUsesGroupSummary) => {
        let yearData = group.totalAnnualEnergyUse.find(annualUse => annualUse.year == year);
        if (yearData) {
          if (this.orderByField == 'totalEnergyUse') {
            return yearData.energyUse;
          } else if (this.orderByField == 'percentOfFacilityUse') {
            return yearData.percentOfFacilityUse;
          }
        }
        return 0;
      }], [this.orderByDir]);
      return summary;
    } else {
      summary.footprintGroups = _.orderBy(summary.footprintGroups, ['groupName'], [this.orderByDir]);
    }
    return summary;
  });

  get filteredEnergyUseFacilitySummary(): EnergyUsesFacilitySummary {
    return this.filteredEnergyUseFacilitySummary$();
  }

  hasPropagatedData: Signal<boolean | null> = computed(() => {
    const summary = this.filteredEnergyUseFacilitySummary$();
    if (!summary) {
      return null;
    }
    return summary.totals.some(total => total.isPropagated);
  });

  hasNoLongerInUseData: Signal<boolean | null> = computed(() => {
    const summary = this.filteredEnergyUseFacilitySummary$();
    if (!summary) {
      return null;
    }
    return summary.footprintGroups.some(group => group.totalAnnualEnergyUse.some(annualUse => annualUse.equipmentNotInUse == true));
  });


  constructor() {
    effect(() => {
      if (this.energyUsesFacilitySummary) {
        //set order by year to the most recent year of data
        let years: Array<number> = this.filteredEnergyUseFacilitySummary.totals.map(d => d.year);
        if (years.includes(this.orderByYear) == false) {
          this.orderByYear = years[0];
        }
      }
    });
  }

  goToGroup(groupId: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + groupId + '/summary');
  }


  setOrderDataField(str: string, year: number) {
    if (str == this.orderByField && year == this.orderByYear) {
      if (this.orderByDir == 'desc') {
        this.orderByDir = 'asc';
      } else {
        this.orderByDir = 'desc';
      }
    } else {
      this.orderByField = str;
      this.orderByYear = year;
    }
  }
}
