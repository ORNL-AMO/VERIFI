import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitImportDataComponent } from './submit-import-data.component';

describe('SubmitImportDataComponent', () => {
  let component: SubmitImportDataComponent;
  let fixture: ComponentFixture<SubmitImportDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubmitImportDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitImportDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
