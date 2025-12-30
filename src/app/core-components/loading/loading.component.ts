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
  currentLoadingIndex: number;
  loadingComplete: boolean = false;
  context: string;

  constructor(private loadingService: LoadingService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadingService.getLoadingStatus().subscribe((value) => {
      this.loading = value;
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

    this.loadingService.getCurrentLoadingIndex().subscribe((value) => {
      this.currentLoadingIndex = value;
      this.cd.detectChanges();
    });

    this.loadingService.getLoadingComplete().subscribe((value) => {
      this.loadingComplete = value;
      this.cd.detectChanges();
    });

    this.loadingService.getContext().subscribe((value) => {
      this.context = value;
      this.cd.detectChanges();
    });
  }

  onClose() {
    this.loadingService.triggerNavigationAfterLoading(this.context); 
    this.loadingService.clearLoadingMessages();
    this.loadingService.setLoadingComplete(false);
    this.loadingService.setTitle('');
    this.loadingService.setContext(undefined);
    this.loadingService.navigationAfterLoading.next(undefined);
  }
}
