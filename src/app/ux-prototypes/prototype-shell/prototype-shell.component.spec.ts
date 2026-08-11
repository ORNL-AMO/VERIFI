import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrototypeShellComponent } from './prototype-shell.component';
import { UxPrototypesModule } from '../ux-prototypes.module';

describe('PrototypeShellComponent', () => {
  let fixture: ComponentFixture<PrototypeShellComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UxPrototypesModule],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(PrototypeShellComponent);
    fixture.detectChanges();
  });

  it('renders a scoped prototype root and route outlet without existing app chrome', () => {
    expect(fixture.nativeElement.querySelector('.verifi-prototype')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-import-backup-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-create-report-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-deleting-account-data')).toBeNull();
  });
});
