import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableItemsDropdownComponent } from './table-items-dropdown.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    TableItemsDropdownComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    TableItemsDropdownComponent
  ]
})
export class TableItemsDropdownModule { }
