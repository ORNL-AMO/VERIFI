import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateFacilitiesComponent } from './template-facilities.component';

describe('TemplateFacilitiesComponent', () => {
  let component: TemplateFacilitiesComponent;
  let fixture: ComponentFixture<TemplateFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TemplateFacilitiesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
