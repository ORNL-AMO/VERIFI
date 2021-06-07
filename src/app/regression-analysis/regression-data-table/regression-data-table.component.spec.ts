import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionDataTableComponent } from './regression-data-table.component';

describe('RegressionDataTableComponent', () => {
  let component: RegressionDataTableComponent;
  let fixture: ComponentFixture<RegressionDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegressionDataTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegressionDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
