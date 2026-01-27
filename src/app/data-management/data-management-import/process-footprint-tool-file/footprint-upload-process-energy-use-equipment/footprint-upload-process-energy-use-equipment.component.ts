import { Component } from '@angular/core';
import { FileReference } from '../../import-services/upload-data-models';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DataManagementService } from 'src/app/data-management/data-management.service';

@Component({
  selector: 'app-footprint-upload-process-energy-use-equipment',
  standalone: false,
  templateUrl: './footprint-upload-process-energy-use-equipment.component.html',
  styleUrl: './footprint-upload-process-energy-use-equipment.component.css',
})
export class FootprintUploadProcessEnergyUseEquipmentComponent {

  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;
  fileReference: FileReference;
  paramsSub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute, private dataManagementService: DataManagementService) { }

  ngOnInit(): void {
    this.fileReferenceSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.fileReferences.find(ref => { return ref.id == id });
    });
  }

  ngOnDestroy(): void {
    this.fileReferenceSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }
}
