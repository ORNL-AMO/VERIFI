import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';

@Component({
  selector: 'app-manage-report-templates',
  templateUrl: './manage-report-templates.component.html',
  styleUrls: ['./manage-report-templates.component.css']
})
export class ManageReportTemplatesComponent implements OnInit {
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  reportTemplates: Array<IdbOverviewReportOptions>;
  templateToDelete: IdbOverviewReportOptions;
  constructor(private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }

  ngOnInit(): void {
    this.reportTemplates = this.overviewReportOptionsDbService.overviewReportOptionsTemplates.getValue();
  }

  deleteTemplate(template: IdbOverviewReportOptions) {
    this.templateToDelete = template;
  }

  cancelDelete() {
    this.templateToDelete = undefined;
  }

  async confirmDelete() {
    let index: number = this.reportTemplates.findIndex(template => { return template.id == this.templateToDelete.id });
    this.reportTemplates.splice(index, 1);
    await this.overviewReportOptionsDbService.deleteWithObservable(this.templateToDelete.id).toPromise();
    let allOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAll().toPromise();
    let filteredOptions: Array<IdbOverviewReportOptions> = allOptions.filter(option => {return option.type == 'template'});
    this.overviewReportOptionsDbService.overviewReportOptionsTemplates.next(filteredOptions);
    this.templateToDelete = undefined;
    if (this.reportTemplates.length == 0) {
      this.emitClose.emit(true);
    }
  }

  cancel() {
    this.emitClose.emit(true);
  }

  async save() {
    for (let i = 0; i < this.reportTemplates.length; i++) {
      await this.overviewReportOptionsDbService.updateWithObservable(this.reportTemplates[i]).toPromise();
    }
    let allOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAll().toPromise()
    let filteredOptions: Array<IdbOverviewReportOptions> = allOptions.filter(option => {return option.type == 'template'});
    this.overviewReportOptionsDbService.overviewReportOptionsTemplates.next(filteredOptions);
    this.emitClose.emit(true);
  }
}
