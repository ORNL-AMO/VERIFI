import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootprintUploadProcessEnergyUseGroupsComponent } from './footprint-upload-process-energy-use-groups.component';

describe('FootprintUploadProcessEnergyUseGroupsComponent', () => {
  let component: FootprintUploadProcessEnergyUseGroupsComponent;
  let fixture: ComponentFixture<FootprintUploadProcessEnergyUseGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FootprintUploadProcessEnergyUseGroupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootprintUploadProcessEnergyUseGroupsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
