import { TestBed } from '@angular/core/testing';
import { ImportSessionService } from '@app/v1/account/imports/import-session.service';
import { ImportsNavComponent } from './imports-nav.component';
import { setupSectionNavTest } from '../section-nav-test.helpers';

describe('ImportsNavComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows Upload Files followed by route-aware file progress in the Upload sidebar', () => {
    const { activeSection, facilities, activeDetail, activeImportFileId, activeImportStep } = state;
    activeSection.set('imports');
    activeDetail.set('file');
    activeImportFileId.set('draft-1');
    activeImportStep.set('meters');
    TestBed.inject(ImportSessionService).addDrafts([{
      id: 'draft-1',
      name: 'utility-data.xlsx',
      kind: 'verifi-v3',
      status: 'ready',
      completedSteps: ['facilities']
    } as any]);
    const fixture = TestBed.createComponent(ImportsNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector<HTMLAnchorElement>('a[href$="/imports/upload"]')?.textContent).toContain('Upload Files');
    expect(element.querySelector('.v1-nav__import-file h2')?.textContent).toContain('utility-data.xlsx');
    expect(element.querySelector('[aria-current="step"]')?.textContent).toContain('Meters');
    expect(element.querySelectorAll('app-import-stepper a').length).toBe(2);
    expect(element.querySelectorAll('app-import-stepper [aria-disabled="true"]').length).toBe(4);
  });

});
