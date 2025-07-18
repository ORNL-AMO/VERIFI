import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileUploadHelpComponent } from './file-upload-help.component';

describe('FileUploadHelpComponent', () => {
  let component: FileUploadHelpComponent;
  let fixture: ComponentFixture<FileUploadHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileUploadHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileUploadHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
