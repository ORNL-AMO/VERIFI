import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbAccount, IdbCustomEmissionsItem } from 'src/app/models/idb';

@Component({
  selector: 'app-emissions-data-dashboard',
  templateUrl: './emissions-data-dashboard.component.html',
  styleUrls: ['./emissions-data-dashboard.component.css']
})
export class EmissionsDataDashboardComponent implements OnInit {

  customEmissionsItems: Array<IdbCustomEmissionsItem>;
  customEmissionsItemsSub: Subscription;
  constructor(private customEmissionsDbService: CustomEmissionsDbService, private router: Router) { }

  ngOnInit(): void {
    this.customEmissionsItemsSub = this.customEmissionsDbService.accountEmissionsItems.subscribe(val => {
      this.customEmissionsItems = val;
    });
  }

  ngOnDestroy() {
    this.customEmissionsItemsSub.unsubscribe();
  }


  addNewItem() {
    this.router.navigateByUrl('account/custom-data/emissions/add');
  }

  deleteItem(customEmissionsItem: IdbCustomEmissionsItem) {

  }

  editItem(customEmissionsItem: IdbCustomEmissionsItem) {
    this.router.navigateByUrl('account/custom-data/emissions/edit/' + customEmissionsItem.guid);
  }
}
