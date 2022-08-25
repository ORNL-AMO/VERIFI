import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectWorksheetComponent } from './select-worksheet.component';

describe('SelectWorksheetComponent', () => {
  let component: SelectWorksheetComponent;
  let fixture: ComponentFixture<SelectWorksheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectWorksheetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectWorksheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
