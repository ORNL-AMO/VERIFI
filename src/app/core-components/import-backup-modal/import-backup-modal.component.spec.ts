import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportBackupModalComponent } from './import-backup-modal.component';

describe('ImportBackupModalComponent', () => {
  let component: ImportBackupModalComponent;
  let fixture: ComponentFixture<ImportBackupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportBackupModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportBackupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
