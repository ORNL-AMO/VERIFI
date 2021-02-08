import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-import-meter-data-wizard',
  templateUrl: './import-meter-data-wizard.component.html',
  styleUrls: ['./import-meter-data-wizard.component.css']
})
export class ImportMeterDataWizardComponent implements OnInit {
  @Output()
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }


  close(){
    this.emitClose.emit(true);
  }
}
