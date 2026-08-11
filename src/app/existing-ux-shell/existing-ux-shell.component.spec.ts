import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ApplicationLifecycleService } from '../application-lifecycle/application-lifecycle.service';
import { ExistingUxShellComponent } from './existing-ux-shell.component';

@NgModule({
  imports: [CommonModule, RouterModule],
  declarations: [ExistingUxShellComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class ExistingUxShellTestModule { }

describe('ExistingUxShellComponent', () => {
  let fixture: ComponentFixture<ExistingUxShellComponent>;
  const persistenceReady = signal(true);

  function configure(url = '/welcome', events: Observable<unknown> = of()): void {
    TestBed.configureTestingModule({
      imports: [ExistingUxShellTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: { persistenceReady }
        },
        {
          provide: Router,
          useValue: { url, events }
        }
      ]
    });
    fixture = TestBed.createComponent(ExistingUxShellComponent);
    fixture.detectChanges();
  }

  it('renders the existing header, legacy route outlet, and global modals when persistence is ready', () => {
    persistenceReady.set(true);
    configure();

    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-import-backup-modal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-create-report-modal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-deleting-account-data')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-toast-notifications')).not.toBeNull();
  });

  it('keeps persistence-dependent global modals hidden until persistence is ready', () => {
    persistenceReady.set(false);
    configure();

    expect(fixture.nativeElement.querySelector('app-import-backup-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-create-report-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-deleting-account-data')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-toast-notifications')).not.toBeNull();
  });

  it('applies the data-management shell color only for data management routes', () => {
    persistenceReady.set(true);
    configure(
      '/welcome',
      of(new NavigationEnd(1, '/data-management/1', '/data-management/1/home'))
    );

    expect(fixture.nativeElement.querySelector('.content.data-management')).not.toBeNull();
  });
});
