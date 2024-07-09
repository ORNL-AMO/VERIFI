import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { SetupWizardService } from '../../setup-wizard.service';

@Component({
  selector: 'app-process-template-file',
  templateUrl: './process-template-file.component.html',
  styleUrl: './process-template-file.component.css'
})
export class ProcessTemplateFileComponent {

  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;

  selectedFile: FileReference;
  constructor(private activatedRoute: ActivatedRoute, private setupWizardService: SetupWizardService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.fileReferenceSub = this.setupWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    })

    this.activatedRoute.params.subscribe(params => {
      let referenceId: string = params['id'];
      this.selectedFile = this.fileReferences.find(file => {
        return file.id == referenceId;
      });
      if(!this.selectedFile){
        this.router.navigateByUrl('/setup-wizard')
      }
    });
  }
}
