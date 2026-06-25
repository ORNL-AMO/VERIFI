import { Component, Input } from '@angular/core';
import { AnalysisGroup } from 'src/app/models/analysis';

@Component({
  selector: 'app-annual-savings-table',
  standalone: false,
  templateUrl: './annual-savings-table.component.html',
  styleUrl: './annual-savings-table.component.css',
})
export class AnnualSavingsTableComponent {

  @Input() 
  years: Array<number> = [];
  @Input() 
  filteredGroups: Array<AnalysisGroup> = [];
  @Input()
  tableData: { [year: number]: { [groupId: string]: number } } = {};
  @Input() 
  showUnitHeader: boolean = false;
  @Input() 
  unitMode: 'group' | 'single' = 'single';
  @Input()
  groupUnits: { [groupId: string]: string } = {};
  @Input()
  singleUnit: string = '';
  @Input()
  currencyPrefix: boolean = false;

  ngOnInit() {
    if(!this.showUnitHeader) {
      this.years = this.years.sort((a, b) => a - b).slice(1);
    }
  }

  getValue(year: number, groupId: string) {
    const value = this.tableData[year]?.[groupId];
    return value !== undefined && value !== null && !isNaN(value) ? value : 0;
  }

  getTotal(year: number) {
    let total = 0;
    for (const group of this.filteredGroups) {
      total += this.getValue(year, group.idbGroupId);
    }
    return total !== undefined && total !== null && !isNaN(total) ? total : 0;
  }
}
