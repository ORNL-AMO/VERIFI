import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-submit-import-data',
  standalone: false,

  templateUrl: './submit-import-data.component.html',
  styleUrl: './submit-import-data.component.css'
})
export class SubmitImportDataComponent {
  fileReference: FileReference;
  paramsSub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private dataWizardService: DataWizardService,
    private uploadDataService: UploadDataService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  async submitImport() {
    this.fileReference = await this.uploadDataService.submit(this.fileReference);
  }
}
