import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RollingEnergySavingsGraphComponent } from './rolling-energy-savings-graph.component';

describe('RollingEnergySavingsGraphComponent', () => {
  let component: RollingEnergySavingsGraphComponent;
  let fixture: ComponentFixture<RollingEnergySavingsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RollingEnergySavingsGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RollingEnergySavingsGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
