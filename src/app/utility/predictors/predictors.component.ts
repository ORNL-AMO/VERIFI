import { Component, OnInit } from '@angular/core';
import { PredictorsService } from 'src/app/utility/predictors/predictors.service';

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrls: ['./predictors.component.css']
})
export class PredictorsComponent implements OnInit {
  months: any = ['Jan','Feb','March','April','May','June','July','Aug','Sept','Oct','Nov','Dec'];
  popup: boolean = false;
  dataTable = [];
  dates = [];

  predictors: any = [];
  predictorHeaders: any = [];

  page = 1;
  itemsPerPage = 12;
  pageSize: number;

  constructor(private predictorsService: PredictorsService) { }

  ngOnInit(): void {
    // Observe the Predictors
    this.predictorsService.getPredictors().subscribe((value) => {
      
      // Predictor values
      this.predictors = value;
      console.log("predictors");
      console.log(this.predictors);

      
      // Headers for table
      this.predictorHeaders = [...new Set(value.map(item => item.name))];

      // Data for table
      this.formatPredictorTable();

    });
  }
  
  formatPredictorTable() {
      // Create new object based on month/date
      // Add corresponding amounts as array inside date obj
      this.dataTable = [];
      this.dates = [];
      const tempPredictors = JSON.parse(JSON.stringify(this.predictors));

       // Store new results
      let data = tempPredictors.reduce((result, item) => {
        const group = (result[item.date] || []);
        group.push(item.name); // amounts
        result[item.date] = group;
        return result;
      }, {});

      for (let i=0; i<Object.entries(data).length; i++) {
        this.dataTable.push({date: '', amount: []});
        this.dates.push(Object.entries(data)[i][0]);
        this.dataTable[i]['date'] = Object.entries(data)[i][0];
        this.dataTable[i]['amount'] = Object.entries(data)[i][1];
     }
      console.log("data");
      console.log(data);
      console.log(this.dates);
      console.log(this.dataTable);
  }

  predictorAdd() {
    /*let backlog = [0];

    // count how many predictor rows
    if(this.predictorHeaders.length != 0) {
      const firstPredictor = this.predictorHeaders[0]
      backlog = this.predictors.filter(function(obj) {
        return obj.name == firstPredictor;
      });
    }*/

    if (this.dates.length === 0) {
      this.dates.push('Jan 2020');
    }
    this.predictorsService.addPredictor(this.dates);
  }

  predictorAddRow() {
    this.predictorsService.addPredictorRow(this.predictorHeaders,'March 2020');
  }

  predictorEdit(id) {
    this.popup = !this.popup;
    //this.predictorMenuOpen = null;
    //this.predictorForm.setValue(this.meterpredictors.find(obj => obj.id == id)); // Set form values to current selected meter
    //this.predictorForm.controls.dateModified.setValue(this.today);
  }

/*
  predictorDelete(id) {
    this.predictorMenuOpen = null;

    // Check if all meters have been removed from the predictor
    if(this.checkpredictorData(id)) {
      this.utilityMeterpredictordbService.deleteIndex(id);
      // Refresh list of predictors
      // I splice the array vs refreshing the list because its faster for the user.
      const index = this.meterpredictors.map(e => e.id).indexOf(id);
      this.meterpredictors.splice(index, 1); // remove it
    }
  }

  predictorSave() {
    this.popup = !this.popup;
    this.predictorMenuOpen = null;
    
    // Check if name is unique before updating
    if (this.checkpredictorName()) {
      this.utilityMeterpredictordbService.update(this.predictorForm.value);
    }
    
    this.predictorLoadList(); // Refresh list of predictors
  }
*/
  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage*(pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }

}
