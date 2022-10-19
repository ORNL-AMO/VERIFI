import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebWorkerService {

  workerRequests: BehaviorSubject<Array<WorkerRequest>>;
  worker: Worker;
  working: boolean = false;
  workerResults: BehaviorSubject<WorkerRequest>;
  constructor() {
    this.workerRequests = new BehaviorSubject([]);
    this.workerResults = new BehaviorSubject(undefined);
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/wasm.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.onMessage(data);
      };
    } else {
      console.log('nopee');
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
    this.workerRequests.subscribe(requests => {
      if (requests.length != 0 && !this.working) {
        this.postMessage(requests[0]);
      }
    })
  }


  onMessage(data: WorkerRequest) {
    console.log(data);
    this.workerResults.next(data);
    this.working = false;
    let currentRequests: Array<WorkerRequest> = this.workerRequests.getValue();
    let remainingRequests: Array<WorkerRequest> = currentRequests.filter(request => { return request.id != data.id });
    this.workerRequests.next(remainingRequests);
  }

  postMessage(data: WorkerRequest) {
    console.log('POST!')
    this.working = true;
    this.worker.postMessage(data);
  }

  addRequest(data: WorkerRequest) {
    let currentRequests: Array<WorkerRequest> = this.workerRequests.getValue();
    currentRequests.push(data);
    this.workerRequests.next(currentRequests);
  }

  getID(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}


export interface WorkerRequest {
  type: 'initialize' | 'monthlyGroupAnalysis' | 'annualGroupAnalysis',
  id: string,
  results: any,
  input: any
}