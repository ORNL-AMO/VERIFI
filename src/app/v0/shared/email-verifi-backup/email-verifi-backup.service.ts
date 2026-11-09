import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BackupFile } from '@app/data/models/backup-file';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmailVerifiBackupService {
  emailStatus: BehaviorSubject<EmailStatusCode | undefined>;
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    }),
    responseType: 'text' as const
  }
  emailData: EmailData;
  API_URL = environment.measurUtilitiesApi + 'sendemail';

  constructor(private httpClient: HttpClient) {
    this.emailStatus = new BehaviorSubject<EmailStatusCode | undefined>(undefined);
  }

  sendEmail(emailData: EmailData) {
    let url: string = this.API_URL;
    console.log('Sending email with data:', emailData);
    if (emailData) {
      this.httpClient.post(url, emailData, this.httpOptions).subscribe({
        next: (response) => {
          console.log('Email sent successfully:', response);
          this.setStatus(response);
        },
        error: (error) => {
          console.error('Error sending email:', error);
          this.setStatus(undefined, error);
        }
      });
    }
  }

  setStatus(response?: string, error?: any) {
    if (response) {
      this.emailStatus.next('success');
    } else if (error && error.status === 413) {
      this.emailStatus.next('content-too-large');
    } else {
      this.emailStatus.next('failed');
    }
  }

  resetEmailStatus() {
    this.emailStatus.next(undefined);
  }
}

export interface EmailData {
  emailSender: string;
  emailTo: string;
  fileName: string;
  attachment: BackupFile;
  isProduction?: boolean;
}

export type EmailStatusCode = 'success' | 'failed' | 'content-too-large';