import { Component, OnInit} from '@angular/core';
import { FormGroup, FormControl, Validators, ControlContainer, FormGroupDirective } from '@angular/forms';
import { EnergyConsumptionService } from '../energy-consumption.service';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css']
})
export class EnergySourceComponent implements OnInit {

  energySource: FormGroup;

  constructor(private service: EnergyConsumptionService) { 
    this.energySource = this.service.energySource;
  }

  ngOnInit() {
    
  }
  formChange() {
    console.log(this.energySource.value.electricity);
  }
}
