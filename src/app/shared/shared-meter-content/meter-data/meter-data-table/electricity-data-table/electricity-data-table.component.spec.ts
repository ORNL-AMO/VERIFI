import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectricityDataTableComponent } from './electricity-data-table.component';

describe('ElectricityDataTableComponent', () => {
  let component: ElectricityDataTableComponent;
  let fixture: ComponentFixture<ElectricityDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ElectricityDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ElectricityDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
