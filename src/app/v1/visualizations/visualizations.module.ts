import { NgModule } from '@angular/core';
import { LibraryModule } from './library/library.module';
import { WorkbenchModule } from './workbench/workbench.module';

@NgModule({ imports: [LibraryModule, WorkbenchModule] })
export class VisualizationsModule { }
