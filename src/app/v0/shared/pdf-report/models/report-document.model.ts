import { BaseSection } from "@v0/shared/pdf-report/models/report-section.model";

export interface ReportMetaData {
    title: string;
    subtitle?: string;
    facilityName?: string;
    dateGenerated: string;
    moduleColor?: [number, number, number];
    skipPage?: boolean;
}

export interface ReportDocument {
    metadata: ReportMetaData;
    sections: BaseSection[];
}