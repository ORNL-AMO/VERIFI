import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ControlContainer, FormGroupDirective } from '@angular/forms';
import { EnergyConsumptionService } from './energy-consumption.service';

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {
  energySource: FormGroup;

  constructor(private service: EnergyConsumptionService) { 
    this.energySource = this.service.energySource;
  }

  ngOnInit() {

  }


}
