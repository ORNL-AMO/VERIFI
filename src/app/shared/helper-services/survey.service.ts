import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserSurvey } from 'src/app/models/userSurvey';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  completedStatus: BehaviorSubject<'sending' | 'success' | 'error'>;
  showSurveyModal: BehaviorSubject<boolean>;
  showSurveyToast: BehaviorSubject<boolean>;
  userSurvey: BehaviorSubject<UserSurvey>;

  constructor(private httpClient: HttpClient) {
    this.showSurveyModal = new BehaviorSubject<boolean>(false);
    this.showSurveyToast = new BehaviorSubject<boolean>(true);
    this.completedStatus = new BehaviorSubject<'sending' | 'success' | 'error'>(undefined);
    this.userSurvey = new BehaviorSubject<UserSurvey>(undefined);
  }

//  async getHasMetUsageRequirements(applicationData: ApplicationInstanceData) {
//       let firstAppInitDate = new Date(applicationData.createdDate);
//       let currentDate = new Date();
  
//       let hasMetUsageThreshold: boolean;
//       let dateDifference;
//       if (environment.production) {
//         dateDifference = currentDate.diff(firstAppInitDate, 'days');
//         hasMetUsageThreshold = dateDifference >= 30 || applicationData.appOpenCount >= 10;
//       } else {
//         dateDifference = currentDate.diff(firstAppInitDate, 'seconds');
//         hasMetUsageThreshold = dateDifference >= 120 || applicationData.appOpenCount >= 2;
//       }
      
//       return hasMetUsageThreshold;
//   }

  /**
   * Check if is legacy user and has used app for 30 days 
   */
  // async checkIsExistingUser() {
  //   let currentDate = moment(new Date());
  //   let allDirs: Directory[] = await firstValueFrom(this.directoryDbService.getAllDirectories());
  //   let topLevelDirInitDate = allDirs.find(dir => dir.parentDirectoryId === null && dir.name === 'All Assessments')?.createdDate; 

  //   let dateDifference;
  //   let isExistingUser;
  //   if (environment.production) {
  //     dateDifference = currentDate.diff(topLevelDirInitDate, 'days');
  //     isExistingUser = dateDifference >= 30;
  //   } else {
  //     dateDifference = currentDate.diff(topLevelDirInitDate, 'seconds');
  //     isExistingUser = dateDifference >= 120;
  //   }

  //   return isExistingUser;
  // }
 
  async sendAnswers() {
    let httpOptions = {
      responseType: 'text' as const,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };

    this.completedStatus.next('sending');
    let userSurvey: UserSurvey = this.userSurvey.getValue();
    let url: string = environment.measurUtilitiesApi + 'measur-survey';
    this.httpClient.post(url, userSurvey, httpOptions).subscribe({
      next: (resp) => {
        this.setStatus(resp);
        this.userSurvey.next(undefined);
      },
      error: (error: any) => {
        this.setStatus(undefined, error);
      }
    });
  }

  setStatus(resp, error?: any) {
    if (resp === "Created") {
      this.completedStatus.next('success');
    } else if (error) {
      this.completedStatus.next('error');
    } else {
      this.completedStatus.next('error');
      console.error(error);
    }
  }
}
