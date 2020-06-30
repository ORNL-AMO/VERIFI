import {animate,animateChild,group,query,stagger,style,state,transition,trigger} from "@angular/animations";
  
  export const listAnimation = trigger("listAnimation", [
    transition("* => *", [
      // each time the binding value changes
      /*query(":leave", [stagger(500, [animate("0.5s", style({ opacity: 0 }))])], {
        optional: true
      }),*/
      query(
        ":enter",
        [
          style({ opacity: 0 }),
          stagger(150, [animate("0.2s", style({ opacity: 1 }))])
        ],
        { optional: true }
      )
    ])
  ]);

  /*
  export const nestedForParent = trigger('theParentAnimation', [
    state('down', style({
        opacity: 1,
    })),
    state('up', style({
      transform: 'translateY( 0% ) translateZ( 0 )',
    })),      
    transition('* <=> *', [
      group([
        query('@theChildAnimation', animateChild(),{ optional: true },),
        animate('0.9s linear'),
      ]),
    ]),
  ]);
  export const nestedForChild = trigger('theChildAnimation', [
    state('down', style({
      transform: 'translateY( 1% ) translateZ( 0 )',
    })),
    state('up', style({
      transform: 'translateY( 0% ) translateZ( 0 )',
    })),      
    transition('* <=> *', [
      animate('0.9s cubic-bezier(0.55, 0.31, 0.15, 0.93)'),
    ]),
  ]);
  */

  export const actionAnimation = trigger("actionAnimation", [
    state(
      "orig",
      style({
        transform: "scale(1)",
        opacity: 1
      })
    ),
    state(
      "small",
      style({
        transform: "scale(0.75)",
        opacity: 0.3
      })
    ),
    transition("* => *", animate("500ms ease-in-out"))
  ]);