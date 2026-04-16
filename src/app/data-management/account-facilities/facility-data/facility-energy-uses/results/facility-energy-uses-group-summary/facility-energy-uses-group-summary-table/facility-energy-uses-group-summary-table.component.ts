import { Component, computed, effect, inject, Input, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import * as _ from 'lodash';
@Component({
  selector: 'app-facility-energy-uses-group-summary-table',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary-table.component.html',
  styleUrl: './facility-energy-uses-group-summary-table.component.css',
})
export class FacilityEnergyUsesGroupSummaryTableComponent {
  @Input({ required: true })
  set energyUsesGroupSummary(value: EnergyUsesGroupSummary) {
    this.energyUsesGroupSummary$.set(value);
  }
  get energyUsesGroupSummary(): EnergyUsesGroupSummary {
    return this.energyUsesGroupSummary$();
  }
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  set displayHistory(value: boolean) {
    this.displayHistory$.set(value);
  }
  get displayHistory(): boolean {
    return this.displayHistory$();
  }

  private energyUsesGroupSummary$ = signal<EnergyUsesGroupSummary | null>(null);
  private displayHistory$ = signal<boolean>(false);
  private router: Router = inject(Router);

  orderByField$: WritableSignal<string> = signal('energyUse');
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

  filteredEnergyUseGroupSummary$: Signal<EnergyUsesGroupSummary> = computed(() => {
    // Reading the signal (not the getter) registers it as a reactive dependency,
    // so this computed re-evaluates whenever the input, display mode, or sort changes.
    const raw = this.energyUsesGroupSummary$();
    if (!raw) {
      return null;
    }
    let summary: EnergyUsesGroupSummary = _.cloneDeep(raw);
    //filter out years if not displaying history
    if (!this.displayHistory$()) {
      summary = summary.filterHistory();
    }

    //order results
    if (this.orderByField != 'equipmentName') {
      summary.equipmentAnnualEnergyUse = _.orderBy(summary.equipmentAnnualEnergyUse, [(equip) => {
        let yearData = equip.annualEnergyUse.find(annualUse => annualUse.year == this.orderByYear);
        if (yearData) {
          if (this.orderByField == 'energyUse') {
            return yearData.energyUse;
          } else if (this.orderByField == 'percentOfTotal') {
            return yearData.percentOfTotal;
          }
        }
        return 0;
      }], [this.orderByDir]);
    } else {
      summary.equipmentAnnualEnergyUse = _.orderBy(summary.equipmentAnnualEnergyUse, ['equipmentName'], [this.orderByDir]);
    }
    return summary;
  });

  get filteredEnergyUseGroupSummary(): EnergyUsesGroupSummary {
    return this.filteredEnergyUseGroupSummary$();
  }

  constructor() {
    effect(() => {
      if (this.filteredEnergyUseGroupSummary) {
        //set order by year to the most recent year of data
        let years: Array<number> = this.filteredEnergyUseGroupSummary.totalAnnualEnergyUse.map(d => d.year);
        if (years.includes(this.orderByYear) == false) {
          this.orderByYear = years[0];
        }
      }
    });
  }

  goToEquipment(equipmentGuid: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + this.energyUsesGroupSummary.groupId + '/equipment/' + equipmentGuid);
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
