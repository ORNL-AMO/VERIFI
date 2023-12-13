import { Component, EventEmitter, Output } from '@angular/core';
import { GlobalWarmingPotential } from 'src/app/models/globalWarmingPotentials';

@Component({
  selector: 'app-existing-gwps-modal',
  templateUrl: './existing-gwps-modal.component.html',
  styleUrls: ['./existing-gwps-modal.component.css']
})
export class ExistingGwpsModalComponent {
  @Output('emitClose')
  emitClose: EventEmitter<GlobalWarmingPotential> = new EventEmitter();

  displayModal: boolean = false;
  constructor() {

  }

  ngOnInit() {
    setTimeout(() => {
      this.displayModal = true;
    }, 100);
  }


  cancelSelectFuel() {
    this.emitClose.emit(undefined);
  }


}
