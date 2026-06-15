import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualSavingsGraphComponent } from './annual-savings-graph.component';

describe('AnnualSavingsGraphComponent', () => {
  let component: AnnualSavingsGraphComponent;
  let fixture: ComponentFixture<AnnualSavingsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualSavingsGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualSavingsGraphComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
