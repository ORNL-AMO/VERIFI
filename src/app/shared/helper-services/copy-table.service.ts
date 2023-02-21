import { ElementRef, Injectable } from '@angular/core';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';

@Injectable({
  providedIn: 'root'
})
export class CopyTableService {

  constructor(private toastNotificationService: ToastNotificationsService) { }

  copyTable(tableRef: ElementRef){
    if(tableRef){
      console.log(tableRef);
      // let tableStr: string = tableRef.nativeElement.innerText.replace("\n", ",")
      navigator.clipboard.writeText(tableRef.nativeElement.innerText).then(() => {
        this.toastNotificationService.showToast('Data Copied To Clipboard!', undefined, undefined, false, "bg-success");
      });
    }else{
      this.toastNotificationService.showToast('Something went wrong!', "Could not copy table", undefined, false, "bg-danger");
    }
  }
}
