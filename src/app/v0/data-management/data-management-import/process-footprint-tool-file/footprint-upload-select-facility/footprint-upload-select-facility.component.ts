import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { DataManagementService } from '@v0/data-management/data-management.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FileReference } from '@v0/data-management/data-management-import/import-services/upload-data-models';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { UploadDataFootprintToolService } from '@v0/data-management/data-management-import/import-services/upload-data-footprint-tool.service';

@Component({
  selector: 'app-footprint-upload-select-facility',
  standalone: false,
  templateUrl: './footprint-upload-select-facility.component.html',
  styleUrl: './footprint-upload-select-facility.component.css',
})
export class FootprintUploadSelectFacilityComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facilities: Array<IdbFacility>;
  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;
  fileReference: FileReference;
  paramsSub: Subscription;
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private uploadDataFootprintToolService: UploadDataFootprintToolService
  ) { }

  ngOnInit(): void {
    this.fileReferenceSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.fileReferences.find(ref => { return ref.id == id });
    });
    this.facilities = [...this.accountWorkspaceStore.facilities()];
    if(this.facilities.length == 1 && !this.fileReference.selectedFacilityId){
      this.fileReference.selectedFacilityId = this.facilities[0].guid;
      this.setSelectedFacility();
    }
  }

  ngOnDestroy(): void {
    this.fileReferenceSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }

  setSelectedFacility() {
    this.fileReference = this.uploadDataFootprintToolService.setSelectedFacility(this.fileReference);
  }
}
