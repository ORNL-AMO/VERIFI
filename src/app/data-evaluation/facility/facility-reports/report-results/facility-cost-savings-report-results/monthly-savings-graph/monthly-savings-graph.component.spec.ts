import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlySavingsGraphComponent } from './monthly-savings-graph.component';

describe('MonthlySavingsGraphComponent', () => {
  let component: MonthlySavingsGraphComponent;
  let fixture: ComponentFixture<MonthlySavingsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonthlySavingsGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlySavingsGraphComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
