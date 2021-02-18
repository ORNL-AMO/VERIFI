import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ColumnItem, ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-columns-wizard',
  templateUrl: './columns-wizard.component.html',
  styleUrls: ['./columns-wizard.component.css']
})
export class ColumnsWizardComponent implements OnInit {

  columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }>;
  groupItemIds: Array<string>;
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.columnGroups = this.excelWizardService.columnGroups.getValue();
    this.groupItemIds = this.columnGroups.map(group => { return group.id });
  }


  drop(dropData: CdkDragDrop<string[]>) {
    this.columnGroups.forEach(group => {
      if (group.id == dropData.previousContainer.id) {
        //remove
        let itemIndex: number = group.groupItems.findIndex(groupItem => { return groupItem.id == dropData.item.data.id });
        if (itemIndex > -1) {
          group.groupItems.splice(itemIndex, 1);
        }
      }
      if (group.id == dropData.container.id) {
        //add
        group.groupItems.push(dropData.item.data);
      }
    });
  }
}
