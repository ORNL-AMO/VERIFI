import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoadingService } from "./loading.service";

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css'],
  standalone: false
})
export class LoadingComponent implements OnInit {
  loading: boolean;
  loadingMessage: string;
  loadingMessages: Array<string>;
  title: string;
  loadingList: boolean;
  currentLoadingIndex: number;
  loadingComplete: boolean = false;

  constructor(private loadingService: LoadingService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadingService.getLoadingStatus().subscribe((value) => {
      this.loading = value;
    });

    this.loadingService.getLoadingListStatus().subscribe((value) => {
      this.loadingList = value;
    });

    this.loadingService.getLoadingMessage().subscribe((value) => {
      this.loadingMessage = value;
      this.cd.detectChanges();
    });

    this.loadingService.getLoadingMessages().subscribe((value) => {
      this.loadingMessages = value;
      this.cd.detectChanges();
    });

    this.loadingService.getTitle().subscribe((value) => {
      this.title = value;
      this.cd.detectChanges();
    });

    this.loadingService.currentLoadingIndex.subscribe((value) => {
      this.currentLoadingIndex = value;
      this.cd.detectChanges();
    });

    this.loadingService.isLoadingComplete.subscribe((value) => {
      this.loadingComplete = value;
      this.cd.detectChanges();
    });
  }

  onClose() {
    this.loadingService.triggerNavigationAfterLoading(); 
    this.loadingList = false;
    this.loadingService.clearLoadingMessages();
    this.loadingService.setLoadingListStatus(false);
    this.loadingService.setTitle('');
  }
}
