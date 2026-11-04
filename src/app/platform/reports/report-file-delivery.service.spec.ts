import { TestBed } from '@angular/core/testing';
import { reportArtifact, reportFileName } from '@shared/report-output/report-output.models';
import { ReportFileDeliveryService } from './report-file-delivery.service';

describe('report file delivery', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); TestBed.resetTestingModule(); });

  it('normalizes unsafe filenames, extensions, and MIME types', () => {
    expect(reportFileName('Plant / annual.PDF', 'pdf')).toBe('Plant - annual.pdf');
    expect(reportFileName('...', 'xlsx')).toBe('Report.xlsx');
    expect(reportArtifact(new Blob(['data']), 'Slides', 'pptx')).toMatchObject({ fileName: 'Slides.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  });

  it('initiates one download and releases its link and URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:report'), revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    TestBed.inject(ReportFileDeliveryService).download(reportArtifact(new Blob(['data']), 'Report', 'pdf'));
    expect(click).toHaveBeenCalledOnce(); expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers(); expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });

  it('never initiates a cancelled or empty artifact', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const controller = new AbortController(); controller.abort();
    const delivery = TestBed.inject(ReportFileDeliveryService);
    expect(() => delivery.download(reportArtifact(new Blob(['data']), 'Report', 'pdf'), controller.signal)).toThrow();
    expect(() => delivery.download(reportArtifact(new Blob(), 'Report', 'pdf'))).toThrow('empty');
    expect(click).not.toHaveBeenCalled();
  });
});
