import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterGroupResultsPeriod,
  formatMeterGroupPeriodLabel,
  meterGroupResultRowsForPeriod,
  meterGroupResultUtilityValue
} from '../../facility-meters.models';

@Component({
  selector: 'app-meter-group-workbench-graph',
  templateUrl: './meter-group-workbench-graph.component.html',
  styleUrls: ['./meter-group-workbench-graph.component.css'],
  standalone: false
})
export class MeterGroupWorkbenchGraphComponent {
  private readonly route = inject(ActivatedRoute);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly period = signal<MeterGroupResultsPeriod>(this.route.snapshot.data['meterGroupPeriod'] ?? 'monthly');
  readonly results = this.workspace.selectedMeterGroupResults;
  readonly rows = computed(() => meterGroupResultRowsForPeriod(this.results(), this.period()));
  readonly metrics = computed(() => {
    const results = this.results();
    return [
      ...((results.showEnergyUse || results.showConsumption)
        ? [{ id: 'utility', label: results.utilityLabel, unit: results.utilityUnit }]
        : []),
      ...(results.showCost ? [{ id: 'cost', label: 'Total Cost', currency: true }] : [])
    ];
  });
  readonly chartRows = computed(() => {
    const results = this.results();
    return this.rows().map(row => ({
      periodKey: row.periodKey,
      periodLabel: formatMeterGroupPeriodLabel(row, this.period()),
      sortValue: row.sortValue,
      values: {
        utility: meterGroupResultUtilityValue(results, row),
        cost: row.energyCost
      }
    }));
  });
}
