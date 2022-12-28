import { Component, Output, Input, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-table-footer-controls',
  templateUrl: './table-footer-controls.component.html',
  styleUrls: ['./table-footer-controls.component.css']
})
export class TableFooterControlsComponent {
  @Output('emitCopyTable')
  emitCopyTable: EventEmitter<boolean> = new EventEmitter();
  @Input()
  collectionSize: number;
  @Input()
  currentPageNumber: number;
  @Input()
  itemsPerPage: number;

  constructor() {

  }

  ngOnInit() {

  }

  copyTable(){
    this.emitCopyTable.emit(true);
  }

  
}
