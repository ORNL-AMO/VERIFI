import { Component, Input } from '@angular/core';
import { YearGroupData } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-annual-actual-vs-adjusted-costs',
  standalone: false,
  templateUrl: './annual-actual-vs-adjusted-costs.component.html',
  styleUrl: './annual-actual-vs-adjusted-costs.component.css',
})
export class AnnualActualVsAdjustedCostsComponent {
  @Input()
  groupId: string;
  @Input()
  estimatedEnergyCostTable: YearGroupData;
  @Input()
  expectedEnergyCostTable: YearGroupData;
  @Input()
  rowKeys: Array<number | string>;
  
  getValue(table: YearGroupData, rowKey: number | string) {
    const key = String(rowKey);
    const value = table?.[key]?.[this.groupId];
    return value === undefined || isNaN(value) || value === 0 || value === null ? 0 : value;
  }
}
