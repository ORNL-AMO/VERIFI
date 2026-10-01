import { PptSlide } from "@v0/shared/ppt-report/models/ppt-slide";

export interface PptDocument {
    metadata: PptMetadata;
    slides: Array<PptSlide>;
}

export interface PptMetadata {
    title: string;
    subtitle?: string;
    date?: string;
}

export { PptSlide };
