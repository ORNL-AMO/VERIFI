import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PreviewComponent } from './preview/preview.component';
import { PreviewRegistry } from './preview-registry';

@NgModule({ declarations: [PreviewComponent], imports: [CommonModule], exports: [PreviewComponent], providers: [PreviewRegistry] })
export class PreviewModule { }
