import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-group-savings-table',
  standalone: false,
  templateUrl: './group-savings-table.component.html',
  styleUrl: './group-savings-table.component.css',
})
export class GroupSavingsTableComponent {

  @Input()
  energyUseTable: SavingsTableData = {};
  @Input()
  adjustedEnergyUseTable: SavingsTableData = {};
  @Input()
  estimatedEnergyCostTable: SavingsTableData = {};
  @Input()
  expectedEnergyCostTable: SavingsTableData = {};
  @Input()
  energySavingsTable: SavingsTableData = {};
  @Input()
  costSavingsTable: SavingsTableData = {};
  @Input()
  cumulativeCostSavingsTable: SavingsTableData = {};

  @Input()
  groupId: string;
  @Input()
  finalUnit: string;
  @Input()
  rowHeader: string;
  @Input()
  rowKeys: Array<number | string>;
  @Input()
  isMonthly: boolean;

  getValue(table: SavingsTableData, rowKey: number | string) {
    const key = String(rowKey);
    const value = table?.[key]?.[this.groupId];
    return value === undefined || isNaN(value) || value === 0 || value === null ? 0 : value;
  }

  formatRowLabel(rowKey: number | string) {
    if(!this.isMonthly) {
      return rowKey;
    }
    const [year, month] = String(rowKey).split('-').map(Number);
    if (isNaN(year) || isNaN(month)) {
      return rowKey;
    }
    const date = new Date(year, month);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(' ', ', ');
  }

  isYearEndRow(rowKey: number | string): boolean {
    if(!this.isMonthly) {
      return false;
    }
    const [year, month] = String(rowKey).split('-').map(Number);
    return month === 0;
  }
}

type SavingsTableData = { [key: string]: { [groupId: string]: number } };
