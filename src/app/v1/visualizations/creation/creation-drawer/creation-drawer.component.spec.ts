import { TestBed } from '@angular/core/testing';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { LibraryModule } from '../../library/library.module';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { configureLibraryTest } from '../../library/testing/library-testing';
import { CreationComponent } from './creation-drawer.component';

describe('visualization creation drawer', () => {
  it('offers all six setup families with labeled input and does not submit an invalid name', async () => {
    const { commands } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.families).toHaveLength(6);
    const sourceFamilyRegion = root.querySelector('[aria-label="Source family"]')!;
    expect(sourceFamilyRegion.children).toHaveLength(6);
    expect([...root.getElementsByTagName('strong')].map(item => item.textContent)).toEqual([
      'Portfolio', 'Facility', 'Utility', 'Predictor', 'Weather', 'Energy Use', 'Analysis Result', 'Analysis Model'
    ]);
    expect(root.querySelector('label[for="visualization-name"]')).not.toBeNull(); await lifecycle.submit(); fixture.detectChanges();
    expect(root.textContent).toContain('Enter a visualization name.'); expect(commands.submit).not.toHaveBeenCalled();
  });
  it('uses the shell portal for protected discard and keeps the draft after Stay', async () => {
    configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    lifecycle.form.controls.name.setValue('Retain me'); lifecycle.requestClose(); fixture.detectChanges();
    const modal = TestBed.inject(ModalPortalService); expect(modal.activePortal()).not.toBeNull(); expect(modal.workspaceBlocked()).toBe(true);
    lifecycle.cancelConfirmation(); fixture.detectChanges(); expect(lifecycle.form.controls.name.value).toBe('Retain me'); expect(modal.activePortal()).toBeNull();
    fixture.destroy(); expect(modal.activePortal()).toBeNull();
  });
});
