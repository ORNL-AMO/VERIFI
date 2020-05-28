import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class EnergyConsumptionService {

    energySource = new FormGroup({
        electricity: new FormControl(true, [Validators.required]),
        naturalGas: new FormControl(true, [Validators.required]),
        lpg: new FormControl(false, [Validators.required]),
        fuelOil: new FormControl(false, [Validators.required]),
        coal: new FormControl(false, [Validators.required]),
        wood: new FormControl(false, [Validators.required]),
        paper: new FormControl(false, [Validators.required]),
        otherGas: new FormControl(false, [Validators.required]),
        otherEnergy: new FormControl(false, [Validators.required])
      });

  constructor() {}

}