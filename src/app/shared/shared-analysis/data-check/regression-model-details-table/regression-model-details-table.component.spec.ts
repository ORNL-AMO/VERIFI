import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegressionModelDetailsTable } from './regression-model-details-table.component';

describe('RegressionModelDetailsTable', () => {
  let component: RegressionModelDetailsTable;
  let fixture: ComponentFixture<RegressionModelDetailsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RegressionModelDetailsTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegressionModelDetailsTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
