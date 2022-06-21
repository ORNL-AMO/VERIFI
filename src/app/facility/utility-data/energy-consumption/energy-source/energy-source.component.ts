import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css']
})
export class EnergySourceComponent implements OnInit {

  label: string;
  constructor(private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.activatedRoute.url.subscribe(() => {
      this.setLabel();
    })
  }

  setLabel(){
    if(this.router.url.includes('edit-meter')){
      this.label = "Edit Meter";
    }else if(this.router.url.includes('new-meter')){
      this.label = "Add New Meter";
    }else{
      this.label = 'Energy Sources';
    }
  }
}