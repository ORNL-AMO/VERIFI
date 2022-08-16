import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbAccount, IdbCustomEmissionsItem } from 'src/app/models/idb';

@Component({
  selector: 'app-emissions-data-form',
  templateUrl: './emissions-data-form.component.html',
  styleUrls: ['./emissions-data-form.component.css']
})
export class EmissionsDataFormComponent implements OnInit {

  isAdd: boolean;
  editCustomEmissions: IdbCustomEmissionsItem;
  years: Array<number>;
  constructor(private router: Router, private customEmissionsDbService: CustomEmissionsDbService, private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.setYears();
    this.isAdd = this.router.url.includes('add');
    if(this.isAdd){
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.editCustomEmissions = this.customEmissionsDbService.getNewAccountEmissionsItem(selectedAccount);
      this.addLocationEmissionRate();
      this.addResidualEmissionRate();
    }else{

    }
  }


  addLocationEmissionRate(){
    this.editCustomEmissions.locationEmissionRates.push({
      year: undefined,
      co2Emissions: undefined
    })
  }

  addResidualEmissionRate(){
    this.editCustomEmissions.residualEmissionRates.push({
      year: undefined,
      co2Emissions: undefined
    })
  }

  setYears(){
    this.years = new Array();
    for(let i = 1990; i <= 2022; i++){
      this.years.push(i);
    }
  }

}
