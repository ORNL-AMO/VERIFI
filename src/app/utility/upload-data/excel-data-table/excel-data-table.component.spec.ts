import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelDataTableComponent } from './excel-data-table.component';

describe('ExcelDataTableComponent', () => {
  let component: ExcelDataTableComponent;
  let fixture: ComponentFixture<ExcelDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExcelDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExcelDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
