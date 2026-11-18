import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PreviewComponent } from './preview/preview.component';
import { PreviewRegistry } from './preview-registry';
import { MonthlyPatternsModule } from '../monthly-patterns/monthly-patterns.module';

@NgModule({ declarations: [PreviewComponent], imports: [CommonModule, MonthlyPatternsModule], exports: [PreviewComponent], providers: [PreviewRegistry] })
export class PreviewModule { }
