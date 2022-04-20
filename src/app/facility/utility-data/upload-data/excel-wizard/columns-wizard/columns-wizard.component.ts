import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ColumnGroup, ColumnItem, ExcelWizardService } from '../excel-wizard.service';
import * as _ from 'lodash';
@Component({
  selector: 'app-columns-wizard',
  templateUrl: './columns-wizard.component.html',
  styleUrls: ['./columns-wizard.component.css']
})
export class ColumnsWizardComponent implements OnInit {

  @Output('emitBack')
  emitBack: EventEmitter<boolean> = new EventEmitter();
  @Output('emitContinue')
  emitContinue: EventEmitter<boolean> = new EventEmitter();


  columnGroups: Array<ColumnGroup>;
  rowGroups: Array<{ fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string }>;
  columnGroupItemIds: Array<string>;
  rowGroupItemIds: Array<string>;

  dataOrientation: string;
  minDate: Date;
  maxDate: Date;
  rowOptionsToAdd: Array<{ fieldLabel: string, fieldName: string }> = [
    {
      fieldLabel: 'Total Cost',
      fieldName: 'energyCost'
    },
    {
      fieldLabel: 'Total Demand',
      fieldName: 'totalDemand'
    },
    {
      fieldLabel: 'Commodity Charge',
      fieldName: 'commodityCharge'
    },
    {
      fieldLabel: 'Delivery Charges',
      fieldName: 'deliveryCharges'
    },
    {
      fieldLabel: 'Other Charges',
      fieldName: 'otherCharges'
    }
  ];
  fieldToAdd: { fieldLabel: string, fieldName: string } = {
    fieldLabel: 'Total Cost',
    fieldName: 'energyCost'
  };
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.dataOrientation = this.excelWizardService.dataOrientation;
    this.rowGroups = this.excelWizardService.rowGroups.getValue();
    this.rowGroupItemIds = this.rowGroups.map(group => { return group.id });
    this.columnGroups = this.excelWizardService.columnGroups.getValue();
    this.columnGroupItemIds = this.columnGroups.map(group => { return group.id });
    this.setMinMaxDate();
  }

  dropColumn(dropData: CdkDragDrop<string[]>) {
    this.columnGroups.forEach(group => {
      if (group.id == dropData.previousContainer.id) {
        //remove
        let itemIndex: number = group.groupItems.findIndex(groupItem => { return groupItem.id == dropData.item.data.id });
        if (itemIndex > -1) {
          group.groupItems.splice(itemIndex, 1);
        }
        if (group.groupLabel == 'Date' && group.groupItems.length == 0) {
          this.minDate = undefined;
          this.maxDate = undefined;
        }
      }
      if (group.id == dropData.container.id) {
        //check is date (only one)
        if (group.groupLabel == 'Date') {
          if (group.groupItems.length != 0) {
            let removeExisting: ColumnItem = group.groupItems.pop();
            this.columnGroups.forEach(group => {
              if (group.groupLabel == 'Unused') {
                group.groupItems.push(removeExisting);
              }
            });
          }
          //add
          group.groupItems.push(dropData.item.data);
          this.setMinMaxDate();
        } else {
          //add
          group.groupItems.push(dropData.item.data);
        }
      }
    });
    this.excelWizardService.columnGroups.next(this.columnGroups);
  }


  setMinMaxDate() {
    let selectedWorksheetDataHeaderMap: Array<any> = this.excelWizardService.selectedWorksheetDataHeaderMap.getValue();
    let dateGroup = this.columnGroups.find(group => {
      return group.groupLabel == 'Date';
    });
    if (dateGroup && dateGroup.groupItems.length != 0) {
      let dateColumn: ColumnItem = dateGroup.groupItems[0];
      let datesColumnData: Array<string> = selectedWorksheetDataHeaderMap.map(data => { return data[dateColumn.value] });
      datesColumnData = datesColumnData.filter(item => { return item != undefined });
      let importMeterDates: Array<Date> = datesColumnData.map(data => { return new Date(data) });
      importMeterDates = importMeterDates.filter(dateItem => { return dateItem instanceof Date && !isNaN(dateItem.getTime()) });
      this.minDate = _.min(importMeterDates);
      this.maxDate = _.max(importMeterDates);
    }
  }

  dropRow(dropData: CdkDragDrop<string[]>) {
    let unusedGroup: { fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string } = this.rowGroups[0];
    this.rowGroups.forEach(group => {
      if (group.id == dropData.previousContainer.id) {
        //remove
        let itemIndex: number = group.groupItems.findIndex(groupItem => { return groupItem.id == dropData.item.data.id });
        if (itemIndex > -1) {
          group.groupItems.splice(itemIndex, 1);
        }
      }
      if (group.id == dropData.container.id) {
        //check is date (only one)
        if (group.groupItems.length != 0) {
          let removeExisting: ColumnItem = group.groupItems.pop();
          unusedGroup.groupItems.push(removeExisting);
        }
        //add
        group.groupItems.push(dropData.item.data);
      }
    });
  }

  addField() {
    let id: string = Math.random().toString(36).substr(2, 9);
    this.rowGroups.push({
      fieldLabel: this.fieldToAdd.fieldLabel,
      fieldName: this.fieldToAdd.fieldName,
      groupItems: new Array(),
      id: id
    });
    this.rowGroupItemIds.push(id);
  }

  setDataOrientation(){
    this.excelWizardService.dataOrientation = this.dataOrientation;
  }

  continue(){
    this.emitContinue.next(true)
  }

  back(){
    this.emitBack.emit(true);
  }
}
