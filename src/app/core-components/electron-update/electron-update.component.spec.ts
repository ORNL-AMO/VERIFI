import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ElectronService } from '@platform/electron/electron.service';
import { ElectronUpdateState } from '@platform/electron/electron-update.models';
import { UpdateInstallService } from '@platform/electron/update-install.service';
import { ElectronUpdateComponent } from './electron-update.component';

describe('ElectronUpdateComponent', () => {
  function setup() {
    const electron = {
      updateState: new BehaviorSubject<ElectronUpdateState>({ status: 'idle' }),
      updateRequested: new BehaviorSubject(0), sendAppReady: vi.fn(), sendUpdateSignal: vi.fn(), retryUpdate: vi.fn()
    };
    const installer = { install: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      declarations: [ElectronUpdateComponent], imports: [CommonModule],
      providers: [{ provide: ElectronService, useValue: electron }, { provide: UpdateInstallService, useValue: installer }]
    });
    const fixture = TestBed.createComponent(ElectronUpdateComponent);
    fixture.detectChanges();
    const click = (label: string) => {
      fixture.detectChanges();
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((item: HTMLButtonElement) => item.textContent.trim() === label) as HTMLButtonElement;
      expect(button).toBeDefined();
      button.click();
      fixture.detectChanges();
    };
    return { fixture, electron, installer, click };
  }

  it('shows progress without installing and keeps a downloaded update available after Later', () => {
    const { fixture, electron, installer, click } = setup();
    electron.updateState.next({ status: 'available', version: '1.1.0', releaseName: '1.1.0' });
    click('Download update');
    expect(electron.sendUpdateSignal).toHaveBeenCalledOnce();
    electron.updateState.next({ status: 'downloading', percent: 40 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('progress').value).toBe(40);
    electron.updateState.next({ status: 'downloaded', version: '1.1.0' });
    fixture.detectChanges();
    expect(installer.install).not.toHaveBeenCalled();
    click('Later');
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    electron.updateRequested.next(1);
    click('Restart and install');
    expect(installer.install).toHaveBeenCalledOnce();
  });

  it('offers retry after download failure and displays restart errors without dismissing the update', async () => {
    const { fixture, electron, installer, click } = setup();
    electron.updateState.next({ status: 'error', operation: 'download', message: 'Download failed' });
    click('Retry');
    expect(electron.retryUpdate).toHaveBeenCalledOnce();
    electron.updateState.next({ status: 'downloaded' });
    installer.install.mockRejectedValue(new Error('Backup conflict'));
    await fixture.componentInstance.restart();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backup conflict');
    expect(fixture.nativeElement.querySelector('a').href).toContain('/verifi/downloads');
  });

  it('unsubscribes when its host is destroyed', () => {
    const { fixture, electron } = setup();
    fixture.destroy();
    expect(electron.updateState.observed).toBe(false);
    expect(electron.updateRequested.observed).toBe(false);
  });
});
