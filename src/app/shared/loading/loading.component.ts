import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoadingService } from "./loading.service";

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit {
  loading: boolean;
  loadingMessage: string;

  constructor(private loadingService: LoadingService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadingService.getLoadingStatus().subscribe((value) => {
      this.loading = value;
    });

    this.loadingService.getLoadingMessage().subscribe((value) => {
      this.loadingMessage = value;
      this.cd.detectChanges();
    });
  }

  
}
