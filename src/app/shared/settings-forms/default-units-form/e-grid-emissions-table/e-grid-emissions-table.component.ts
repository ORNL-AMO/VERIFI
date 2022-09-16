import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SubregionEmissions } from 'src/app/shared/helper-services/e-grid.service';

@Component({
  selector: 'app-e-grid-emissions-table',
  templateUrl: './e-grid-emissions-table.component.html',
  styleUrls: ['./e-grid-emissions-table.component.css']
})
export class EGridEmissionsTableComponent implements OnInit {
  @Input()
  eGridSubregion: string;
  @Input()
  selectedSubregionEmissions: SubregionEmissions;
  @Output('emitClose')
  emitClose = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }

  closeEmissionsRates(){
    this.emitClose.emit(true);
  }
}
