import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PredictorsService } from 'src/app/utility/predictors/predictors.service';

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrls: ['./predictors.component.css']
})
export class PredictorsComponent implements OnInit {
  editPredictorWindow: boolean = false;
  editPredictorDataWindow: boolean = false;
  predictorMenu: string;

  dataTable: Array<object>;
  dates: Array<string>;

  predictors: Array<object>;
  predictorHeaders: Array<string> = [];
  predictorRow: Array<object> = [];

  page: number = 1;
  itemsPerPage: number = 12;
  pageSize: number;

  predictorHeaderForm:FormGroup;
  predictorRowForm:FormGroup;

  /* Temp vars for delete confirm */
  deleteFilter: string;
  deleteValue: string;
  popup: boolean = false;
  importWindow: boolean = false;
  importError: string = '';
  quickView: any = [];
  import: any = [];
  @ViewChild('inputFile') myInputVariable: ElementRef;
  
  constructor(private predictorsService: PredictorsService) { }

  ngOnInit(): void {
    this.getPredictors();
  }

  getPredictors(): void {
    // Observe the Predictors
    this.predictorsService.getPredictors().subscribe((value) => {
          
      // Predictor values
      this.predictors = value;
      
      // Headers for table
      this.predictorHeaders = [...new Set(value.map(item => item['name']) as unknown as string)];

      // Data for table
      this.formatPredictorTable();

      // Set to last page
      const lastPage = Math.ceil(this.dataTable.length/this.itemsPerPage);
      this.page = lastPage;
      this.onPageChange(lastPage);

      // Edit form for predictor headers
      this.setDynamicHeaderForm();
      this.setDynamicRowForm();
    });
  }

  documentClick (): void {
    // Close menus when user clicks outside the dropdown
    this.predictorMenu = null;
  }
  
  predictorToggleMenu (index): void {
    if (this.predictorMenu === index) {
      this.predictorMenu = null;
    } else {
      this.predictorMenu = index;
    }
  }

  setDynamicHeaderForm(): void {
    let group={};
    this.predictorHeaders.forEach(input_template=>{
      group[input_template]=new FormControl(input_template);  
    })
    this.predictorHeaderForm = new FormGroup(group);
  }

  setDynamicRowForm(): void {
    let group={};
    // add date
    group['date']=new FormControl('');

    // add each predictor row
    this.predictorRow.forEach(input_template=>{
      group[input_template['name']]=new FormControl(input_template['amount']);  
    });
    
    this.predictorRowForm = new FormGroup(group);
  }
  
  formatPredictorTable(): void {
      // Create new object based on month/date
      // Add corresponding amounts as array inside date obj
      this.dataTable = [];
      this.dates = [];
      const tempPredictors = JSON.parse(JSON.stringify(this.predictors));

       // Store new results
      let data = tempPredictors.reduce((result, item) => {
        const group = (result[item.date] || []);
        group.push({id: item.id, amount: item.amount}); // amounts
        result[item.date] = group;
        return result;
      }, {});

      for (let i=0; i<Object.entries(data).length; i++) {
        this.dataTable.push({date: '', amount: []});
        this.dates.push(Object.entries(data)[i][0]);
        this.dataTable[i]['date'] = Object.entries(data)[i][0];
        this.dataTable[i]['amount'] = Object.entries(data)[i][1];
     }

     this.dates.sort(this.sortByItem);
     this.dataTable.sort(this.sortByDate);
  }

  sortByItem(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  sortByDate(a, b) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }

  predictorAdd(): void {
    /* this.dates is an array of the different dates in the predictor table.
    When a new predictor is added, this function makes sure all of the 
    current dates are added to the new predictor and set to 0. */

    // If this is the first predictor, set a default date.
    if (this.dates.length === 0) {
      this.dates.push('2020-01');
    }

    if (this.predictorHeaders.length < 10) {
      this.predictorsService.addPredictor(this.dates, this.predictorHeaders.length);
    } else {
      alert("You're max of 10 predictor variables has been reached.");
    }
    
  }

  predictorAddRow(): void {
    /* this.predictorHeaders is an array of the different predictors in the predictor table.
    When you add a new row, it adds a new date per predictor. */
    let nextYear: string | number;
    let nextMonth: string | number;

    // get last date
    const lastDateIndex = this.dates.length - 1;
    const lastDate = this.dates[lastDateIndex];

    const lastYear = lastDate.split("-")[0];
    const lastMonth = lastDate.split("-")[1];

    // get new date
    nextYear = lastYear;
    nextMonth = +lastMonth + 1;

    // if last month is Dec, increase year and reset to Jan
    if (nextMonth === 13) {

      // increase year
       nextYear = (+lastYear + 1).toString(); 

      // choose next month
      nextMonth = 1;
    }
    
    if (nextMonth.toString().length === 1) {
      nextMonth = "0"+nextMonth;
    }
    const nextDate = nextYear + "-" + nextMonth;

    this.predictorsService.addPredictorRow(this.predictorHeaders,nextDate);
  }

  predictorEdit(): void {
    this.editPredictorWindow = !this.editPredictorWindow;
    this.predictorMenu = null;
  }

  predictorDataEdit(date): void {
    this.editPredictorDataWindow = !this.editPredictorDataWindow;
    this.predictorMenu = null;
    
    
    // filter all predictors with this date
    this.predictorRow = this.predictors.filter(function(obj) {
      return obj['date'] == date;
    });

    // refresh form
    this.setDynamicRowForm();

    // set date equal to selected row
    this.predictorRowForm.patchValue({date: this.predictorRow[0]['date']});

  }

  predictorSave(): void {
    this.editPredictorWindow = !this.editPredictorWindow;
    const formControls = Object.keys(this.predictorHeaderForm.controls);

    // for each object
    for (let i=0; i < formControls.length; i++) {
      const control = formControls[i]; // Get old value by the key name
      const controlValue = (this.predictorHeaderForm.get(control)).value; // Get new input value

      // Quick refresh list of predictor headers
      const index = this.predictorHeaders.map(e => e).indexOf(control);
      this.predictorHeaders.splice(index, 1, controlValue); // remove it

      // get everything with that form name
      this.predictorsService.getAllByName(control).then(
        data => {

          // update everything with form name
          for (let item of data) {
            item['name'] = controlValue;

            // save the values
            this.predictorsService.updatePredictor([item]);
          }
          
        },
        error => {
            console.log(error);
        }
      );
      
    }

    // Edit predictor headers for form
    //this.setDynamicHeaderForm();
  }

  predictorDataSave(): void {
    this.editPredictorDataWindow = !this.editPredictorDataWindow;
    const formDate = this.predictorRowForm.controls['date'].value;
    const formControls = Object.keys(this.predictorRowForm.controls);
    const formValues = Object.values(this.predictorRowForm.value);

    // update date
    for (let i=0; i<this.predictorRow.length; i++) {
      this.predictorRow[i]['date'] = formDate;
    }
    
    // update predictor rows
    for (let i=1; i<formControls.length; i++) {
      // find row 
      const index = this.predictorRow.map(function(e) { return e['name']; }).indexOf(formControls[i]);

      // replace value
      this.predictorRow[index]['amount'] = formValues[i];
    }

    // update predictor db
    this.predictorsService.updatePredictor(this.predictorRow);

    // refresh table
    this.getPredictors();
  }

  checkDate() {
    // check if date already exists
    const formDate = this.predictorRowForm.controls['date'].value;
    const check = this.predictors.map(function(e) { return e['date']; }).indexOf(formDate);
    if (check != -1) {
      alert("This date already exists.");
      this.predictorRowForm.controls['date'].setValue(this.predictorRow[0]['date']); //revert date
    }
  }

  deleteConfirm (filterType, name): void {
    this.popup = true;
    this.deleteFilter = filterType;
    this.deleteValue = name;
  }

  deletePredictors (filterType, name): void {
    this.predictorMenu = null;

    const deleteQueue = [];

    // filter all predictors with this name or date (columns or rows)
    const predictorFilter = this.predictors.filter(function(obj) {
      return obj[filterType] == name;
    });

    // get ids of each predictor to delete
    for(let i=0; i < predictorFilter.length; i++) {
      deleteQueue.push(predictorFilter[i]['id']);
    }

    // Delete predictors
    this.predictorsService.deletePredictors(deleteQueue);
  }

  predictorImport (files: FileList) {
    // Clear with each upload
    this.quickView = []; 
    this.import = []; 
    this.importError = '';

    if(files && files.length > 0) {
       let file : File = files.item(0); 
         
         let reader: FileReader = new FileReader();
         reader.readAsText(file);
         reader.onload = (e) => {
            let csv: string = reader.result as string;
            const lines = csv.split("\n");
            const headers = lines[0].replace('\r', '').split(",");
            const allowedHeaders = ["name", "desc", "unit", "date", "amount"];

            if (JSON.stringify(headers) === JSON.stringify(allowedHeaders)) {

              for(var i=1;i<lines.length;i++){
                const obj = {};
                const currentline=lines[i].split(",");
                for(var j=0;j<headers.length;j++){
                  obj[headers[j]] = currentline[j];
                }

                // Read csv and push to obj array.
                this.import.push(obj); 

                // Push the first 3 results to a quick view array
                if (i < 4) {
                  this.quickView.push(obj);
                }
                
              }  
            } else {
              // csv didn't match -> Show error
              this.importError = "Error with file. Please match your file to the provided template.";
              return false;
            }
         }
      }
  }

  async predictorAddCSV() {
    this.importWindow = false;

    for(let i=0;i<this.import.length;i++){
      let obj = this.import[i];
      // ERROR HANDLING
      // 1. Does this date/name already exist? If yes, update
      // 2. Does it fit the correct format
      // 3. If new predictor, add all back dates
      // 4. If new date, add 0 to all predictors
      this.predictorsService.addPredictorByImport(obj);
      
    }
  
    this.resetImport();
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
    this.quickView = []; 
    this.import = []; 
    this.importError = '';
  }

  predictorExport() {
      let csv: string | string[];
      let tempDataTable: Array<object>;
      let tempPredHeaders: Array<string>;

      // Format Data Table for Export
      tempDataTable = JSON.parse(JSON.stringify(this.dataTable));
      tempPredHeaders = JSON.parse(JSON.stringify(this.predictorHeaders));

      for(let i=0; i<tempDataTable.length; i++) {
        let amounts = [];
        for(let j=0; j<tempDataTable[i]['amount'].length; j++) {
          //delete test[i]['amount'][j]['id'];
          amounts.push(tempDataTable[i]['amount'][j]['amount']);
        }
        tempDataTable[i]['amount'] = amounts;
      }
      console.log(tempDataTable);
      const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
      const header = Object.keys(tempDataTable[0]);
      csv = tempDataTable.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
      
      csv.unshift(header.join(','));
      tempPredHeaders.unshift('');
      csv.unshift(tempPredHeaders.join(','));
      csv = csv.join('\r\n').replace(/\[|\]/g,"");
      console.log(csv);
      
      //Download the file as CSV
      var downloadLink = document.createElement("a");
      var blob = new Blob(["\ufeff", csv]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = "Verifi_Predictors_"+ Date.now()+".csv";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
  }

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage*(pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }

}
