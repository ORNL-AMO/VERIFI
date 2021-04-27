import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronService } from '../electron.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { LoadingService } from 'src/app/shared/loading/loading.service';

@Component({
  selector: 'app-electron-update',
  templateUrl: './electron-update.component.html',
  styleUrls: ['./electron-update.component.css'],
  animations: [
    trigger('updateToast', [
      state('show', style({ top: '40px' })),
      state('hide', style({ top: '-200px' })),
      transition('hide => show', animate('.5s ease')),
      transition('show => hide', animate('.5s ease'))
    ])
  ]
})
export class ElectronUpdateComponent implements OnInit {


  showUpdateAvailable: string = 'hide';

  updateAvailable: boolean;
  updateAvailableSub: Subscription;

  updateInfo: { releaseName: string, releaseNotes: string };
  updateInfoSub: Subscription;
  downloading: boolean;

  updateError: boolean;
  updateErrorSub: Subscription;
  constructor(private electronService: ElectronService, private cd: ChangeDetectorRef, private loadingService: LoadingService) {
  }

  ngOnInit() {
    this.electronService.sendAppReady('ready');
    this.updateAvailableSub = this.electronService.updateAvailable.subscribe(val => {
      this.updateAvailable = val;
      this.cd.detectChanges();
      if (this.updateAvailable) {
        setTimeout(() => {
          this.showUpdateAvailable = 'show';
          this.cd.detectChanges();
        }, 100)
      }
    });

    this.updateInfoSub = this.electronService.updateInfo.subscribe(val => {
      this.updateInfo = val;
    });

    this.updateErrorSub = this.electronService.updateError.subscribe(val => {
      this.updateError = val;
      if (this.updateError) {
        this.loadingService.setLoadingStatus(false);
      }
    })
  }

  ngOnDestroy() {
    this.updateAvailableSub.unsubscribe();
    this.updateInfoSub.unsubscribe();
    this.updateErrorSub.unsubscribe();
  }

  update() {
    this.downloading = true;
    this.loadingService.setLoadingMessage('Downloading update. Application will close when download is completed. This may take a moment.');
    this.loadingService.setLoadingStatus(true);
    this.electronService.sendUpdateSignal();
  }

  closeUpdateAvailable() {
    this.showUpdateAvailable = 'hide';
    setTimeout(() => {
      this.updateAvailable = false;
    }, 500)
  }
}
