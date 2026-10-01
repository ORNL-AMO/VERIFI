import { Observable } from "rxjs";
import { ReportDocument } from "@data/models/report-document.model";

export interface ReportDataAdapter<T> {
    buildDocument(data: T): Observable<ReportDocument>;
}