import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterPlantsSetupComponent } from './better-plants-setup.component';

describe('BetterPlantsSetupComponent', () => {
  let component: BetterPlantsSetupComponent;
  let fixture: ComponentFixture<BetterPlantsSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BetterPlantsSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BetterPlantsSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
