import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessTemplateFacilitiesComponent } from './process-template-facilities.component';

describe('ProcessTemplateFacilitiesComponent', () => {
  let component: ProcessTemplateFacilitiesComponent;
  let fixture: ComponentFixture<ProcessTemplateFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessTemplateFacilitiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcessTemplateFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
