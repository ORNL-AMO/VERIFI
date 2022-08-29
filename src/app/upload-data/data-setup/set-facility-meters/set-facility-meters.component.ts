import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { ColumnItem, FacilityGroup, UploadDataService } from '../../upload-data.service';

@Component({
  selector: 'app-set-facility-meters',
  templateUrl: './set-facility-meters.component.html',
  styleUrls: ['./set-facility-meters.component.css']
})
export class SetFacilityMetersComponent implements OnInit {

  facilityGroups: Array<FacilityGroup>;
  facilityGroupIds: Array<string>;
  constructor(private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.setFacilityGroups();
    this.facilityGroupIds = this.facilityGroups.map(group => { return group.facilityId });
  }


  setFacilityGroups() {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;
    let unmappedMeters: Array<ColumnItem> = new Array();
    this.uploadDataService.fileReferences.forEach(ref => {
      ref.columnGroups.forEach(group => {
        if (group.groupLabel == 'Meters') {
          group.groupItems.forEach(item => {
            unmappedMeters.push({
              index: meterIndex,
              value: item.value,
              id: item.id,
              fileName: ref.name
            });
            meterIndex++;
          })
        }
      });
    });
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: unmappedMeters,
      facilityName: 'Unmapped Meters',
      color: ''
    })
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: [],
        facilityName: facility.name,
        color: facility.color
      });
    });
    this.facilityGroups = facilityGroups;
  }

  dropColumn(dropData: CdkDragDrop<string[]>) {
    this.facilityGroups.forEach(group => {
      if (group.facilityId == dropData.previousContainer.id) {
        //remove
        let itemIndex: number = group.groupItems.findIndex(groupItem => { return groupItem.id == dropData.item.data.id });
        if (itemIndex > -1) {
          group.groupItems.splice(itemIndex, 1);
        }
      }
      if (group.facilityId == dropData.container.id) {
        //add
        group.groupItems.push(dropData.item.data);
      }
    });
  }

  continue() {
    this.router.navigateByUrl('/upload/data-setup/set-facility-predictors');
  }
}
