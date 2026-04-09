import { Component } from '@angular/core';
import { FileReference } from '../../import-services/upload-data-models';
import { ActivatedRoute } from '@angular/router';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-meter-groups-to-equipment',
  standalone: false,
  templateUrl: './map-meter-groups-to-equipment.component.html',
  styleUrl: './map-meter-groups-to-equipment.component.css',
})
export class MapMeterGroupsToEquipmentComponent {
  fileReference: FileReference;
  paramsSub: Subscription;
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

}
