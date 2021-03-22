import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorksheetDataTableComponent } from './worksheet-data-table.component';

describe('WorksheetDataTableComponent', () => {
  let component: WorksheetDataTableComponent;
  let fixture: ComponentFixture<WorksheetDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorksheetDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorksheetDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
