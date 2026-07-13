import { BaseSection } from "./report-section.model";

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