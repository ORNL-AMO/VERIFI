import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColumnGroup, ColumnItem, FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-identify-columns',
  templateUrl: './identify-columns.component.html',
  styleUrls: ['./identify-columns.component.css']
})
export class IdentifyColumnsComponent implements OnInit {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSubmitted: false,
    id: undefined,
    workbook: undefined,
    isTemplate: false,
    selectedWorksheetName: '',
    selectedWorksheetData: [],
    columnGroups: [],
    meterFacilityGroups: [],
    predictorFacilityGroups: [],
    headerMap: [],
    importFacilities: [],
    meters: [],
    meterData: [],
    predictorEntries: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  minDate: Date;
  maxDate: Date;
  columnGroupItemIds: Array<string>;
  paramsSub: Subscription;
  noPredictorsOrMeters: boolean;
  noDateColumn: boolean;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      if (!this.fileReference.isTemplate) {
        if (this.fileReference.columnGroups.length == 0) {
          this.setColumnGroups(this.fileReference.selectedWorksheetData[0]);
        }
        this.columnGroupItemIds = this.fileReference.columnGroups.map(group => { return group.id });
        this.setMinMaxDate();
        this.setValidation();
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  dropColumn(dropData: CdkDragDrop<ColumnGroup[]>) {
    this.fileReference.columnGroups.forEach(group => {
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
            this.fileReference.columnGroups.forEach(group => {
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
    this.fileReference.meterFacilityGroups = [];
    this.fileReference.predictorFacilityGroups = [];
    this.setValidation();
  }


  setMinMaxDate() {
    let headerMap: Array<any> = this.fileReference.headerMap;
    let dateGroup = this.fileReference.columnGroups.find(group => {
      return group.groupLabel == 'Date';
    });
    if (dateGroup && dateGroup.groupItems.length != 0) {
      let dateColumn: ColumnItem = dateGroup.groupItems[0];
      let datesColumnData: Array<string> = headerMap.map(data => { return data[dateColumn.value] });
      datesColumnData = datesColumnData.filter(item => { return item != undefined });
      let importMeterDates: Array<Date> = datesColumnData.map(data => { return new Date(data) });
      importMeterDates = importMeterDates.filter(dateItem => { return dateItem instanceof Date && !isNaN(dateItem.getTime()) });
      this.minDate = _.min(importMeterDates);
      this.maxDate = _.max(importMeterDates);
    }
  }

  setColumnGroups(headers: Array<string>) {
    let columnGroups: Array<ColumnGroup> = new Array();
    let dateGroupItems: Array<ColumnItem> = new Array();
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index, id: Math.random().toString(36).substr(2, 9) });
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => { return column.value == 'Date' });
    if (dateColumnIndex > -1) {
      let dateColumn: ColumnItem = unusedColumns[dateColumnIndex];
      dateGroupItems.push(dateColumn);
      unusedColumns.splice(dateColumnIndex, 1);
    }
    columnGroups.push({
      groupLabel: 'Date',
      groupItems: dateGroupItems,
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Meters',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Predictors',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Unused',
      groupItems: unusedColumns,
      id: Math.random().toString(36).substr(2, 9)
    });
    this.fileReference.columnGroups = columnGroups;
    this.fileReference.meterFacilityGroups = [];
    this.fileReference.predictorFacilityGroups = [];
  }


  continue() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/set-facility-meters');

  }

  getColumnClass(columnName: string): string {
    if (this.fileReference.columnGroups) {
      let columnClass: string;
      this.fileReference.columnGroups.forEach(group => {
        group.groupItems.forEach(item => {
          if (item.value == columnName) {
            columnClass = group.groupLabel;
          }
        })
      });
      return columnClass;
    }
    return;
  }

  goBack(){
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/select-worksheet')
  }

  setValidation(){
    let noDateColumn: boolean = true;
    let noPredictorsOrMeters: boolean = true;
    this.fileReference.columnGroups.forEach(group => {
      if(group.groupLabel != 'Date' && group.groupLabel != 'Unused'){
        if(group.groupItems.length != 0){
          noPredictorsOrMeters = false;
        }
      }else if(group.groupLabel == 'Date' && group.groupItems.length != 0){
        noDateColumn = false;
      }
    });
    this.noDateColumn = noDateColumn;
    this.noPredictorsOrMeters = noPredictorsOrMeters;
  }
}
