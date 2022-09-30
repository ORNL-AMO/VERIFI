import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadDataHelpComponent } from './upload-data-help.component';

describe('UploadDataHelpComponent', () => {
  let component: UploadDataHelpComponent;
  let fixture: ComponentFixture<UploadDataHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadDataHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadDataHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
