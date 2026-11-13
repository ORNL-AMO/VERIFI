import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PreviewComponent } from './preview/preview.component';
import { PreviewRegistry } from './preview-registry';
import { PaginationComponent } from '@app/v1/shared/pagination/pagination.component';

@NgModule({ declarations: [PreviewComponent], imports: [CommonModule, PaginationComponent], exports: [PreviewComponent], providers: [PreviewRegistry] })
export class PreviewModule { }
