import { Component, Input } from '@angular/core';
import { AnalysisGroup } from 'src/app/models/analysis';

@Component({
  selector: 'app-monthly-savings-table',
  standalone: false,
  templateUrl: './monthly-savings-table.component.html',
  styleUrl: './monthly-savings-table.component.css',
})
export class MonthlySavingsTableComponent {

  @Input()
  monthKeys: Array<string> = [];
  @Input()
  filteredGroups: Array<AnalysisGroup> = [];
  @Input()
  costSavingsTable: { [monthKey: string]: { [groupId: string]: number } } = {};

  ngOnInit() {
    if (this.monthKeys.length > 0) {
      this.monthKeys = this.monthKeys.slice(12);
    }
  }

  formatMonthLabel(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month);;
    const formatted = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return formatted.replace(' ', ', ');
  }

  checkYearEnd(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    return month === 0;
  }

  checkValidNumber(value: number) {
    return value === undefined || isNaN(value) || value === null || value === 0 ? false : true;
  }

  getTotal(monthKey: string) {
    let total = 0;
    for (const group of this.filteredGroups) {
      const value = this.costSavingsTable[monthKey]?.[group.idbGroupId];
      total += value !== undefined && value !== null && !isNaN(value) ? value : 0;
    }
    return total !== undefined && total !== null && !isNaN(total) ? total : 0;
  }
}
