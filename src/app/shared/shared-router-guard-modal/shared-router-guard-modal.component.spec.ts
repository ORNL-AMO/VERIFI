import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedRouterGuardModalComponent } from './shared-router-guard-modal.component';

describe('SharedRouterGuardModalComponent', () => {
  let component: SharedRouterGuardModalComponent;
  let fixture: ComponentFixture<SharedRouterGuardModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharedRouterGuardModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedRouterGuardModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
