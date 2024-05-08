import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectronBackupFileComponent } from './electron-backup-file.component';

describe('ElectronBackupFileComponent', () => {
  let component: ElectronBackupFileComponent;
  let fixture: ComponentFixture<ElectronBackupFileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ElectronBackupFileComponent]
    });
    fixture = TestBed.createComponent(ElectronBackupFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
