import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxIndexedDBModule } from 'ngx-indexed-db';
import { NgxWebstorageModule } from 'ngx-webstorage';
import { dbConfig } from './dbConfig';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NgxIndexedDBModule.forRoot(dbConfig),
    NgxWebstorageModule.forRoot(),
  ]
})
export class IndexedDBModule { }
