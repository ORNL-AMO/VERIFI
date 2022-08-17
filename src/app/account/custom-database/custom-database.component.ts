import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-custom-database',
  templateUrl: './custom-database.component.html',
  styleUrls: ['./custom-database.component.css']
})
export class CustomDatabaseComponent implements OnInit {

  modalOpen: boolean;
  modalOpenSub: Subscription;

  constructor(private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy(){
    this.modalOpenSub.unsubscribe();
  }


}
