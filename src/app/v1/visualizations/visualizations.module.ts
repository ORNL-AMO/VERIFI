import { NgModule } from '@angular/core';
import { LibraryModule } from './library/library.module';
import { WorkbenchModule } from './workbench/workbench.module';
import { VisualizationRuntimeModule } from './visualization-runtime.module';

@NgModule({ imports: [LibraryModule, WorkbenchModule, VisualizationRuntimeModule] })
export class VisualizationsModule { }
