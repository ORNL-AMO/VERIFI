import { Component, inject } from '@angular/core';
import { ReportWorkbenchController } from '../report-workbench.controller';

@Component({ selector: 'app-report-workbench-shell', standalone: false,
  templateUrl: './report-workbench-shell.component.html', styleUrls: ['../report-workbench.css'],
  host: { '(window:beforeunload)': 'workbench.beforeUnload($event)' } })
export class ReportWorkbenchShellComponent { readonly workbench = inject(ReportWorkbenchController); }
