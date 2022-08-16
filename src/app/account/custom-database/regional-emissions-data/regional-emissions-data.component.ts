import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbCustomEmissionsItem } from 'src/app/models/idb';

@Component({
  selector: 'app-regional-emissions-data',
  templateUrl: './regional-emissions-data.component.html',
  styleUrls: ['./regional-emissions-data.component.css']
})
export class RegionalEmissionsDataComponent implements OnInit {

  customEmissionsItems: Array<IdbCustomEmissionsItem>;
  customEmissionsItemsSub: Subscription;
  constructor(private customEmissionsDbService: CustomEmissionsDbService) { }

  ngOnInit(): void {
    this.customEmissionsItemsSub = this.customEmissionsDbService.accountEmissionsItems.subscribe(val => {
      this.customEmissionsItems = val;
    });
  }

  ngOnDestroy(){
    this.customEmissionsItemsSub.unsubscribe();
  }


  addNewItem(){
    
  }
}
