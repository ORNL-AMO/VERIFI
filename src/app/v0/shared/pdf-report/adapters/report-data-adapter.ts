import { Observable } from 'rxjs';
import { ReportDocument } from '@shared/report-output/report-document.model';

export interface ReportDataAdapter<T> {
  buildDocument(data: T): Observable<ReportDocument>;
}
