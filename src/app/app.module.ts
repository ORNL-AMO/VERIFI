import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './routing/app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { PlotlyModule } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';
import { LoadingComponent } from './core-components/loading/loading.component';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { ElectronUpdateComponent } from './core-components/electron-update/electron-update.component';
import { ElectronBackupFileComponent } from './core-components/electron-backup-file/electron-backup-file.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { SharedRouterGuardModalComponent } from './shared/shared-router-guard-modal/shared-router-guard-modal.component';

@NgModule({
    declarations: [
        AppComponent,
        LoadingComponent,
        ElectronUpdateComponent,
        ElectronBackupFileComponent,
        SharedRouterGuardModalComponent
    ],
    bootstrap: [AppComponent],
    imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    PlotlyModule.forRoot(PlotlyJS),
    IndexedDBModule,
    BrowserAnimationsModule,
],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})

export class AppModule { }
