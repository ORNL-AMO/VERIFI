export const energy = {
  metric: {
    Wh: {
      name: {
        singular: 'Watt-hour',
        plural: 'Watt-hours',
        display: '(Wh)'
      }
      , to_anchor: 3600
    }
    , mWh: {
      name: {
        singular: 'Milliwatt-hour',
        plural: 'Milliwatt-hours',
        display: '(mWh)'
      }
      , to_anchor: 3.6
    }
    , kWh: {
      name: {
        singular: 'Kilowatt-hour',
        plural: 'Kilowatt-hours',
        display: '(kWh)'
      }
      , to_anchor: 3600000
    }
    , MWh: {
      name: {
        singular: 'Megawatt-hour',
        plural: 'Megawatt-hours',
        display: '(MWh)'
      }
      , to_anchor: 3600000000
    }
    , GWh: {
      name: {
        singular: 'Gigawatt-hour',
        plural: 'Gigawatt-hours',
        display: '(GWh)'
      }
      , to_anchor: 3600000000000
    }
    , J: {
      name: {
        singular: 'Joule',
        plural: 'Joules',
        display: '(J)'
      }
      , to_anchor: 1
    }
    , kJ: {
      name: {
        singular: 'Kilojoule',
        plural: 'Kilojoules',
        display: '(kJ)'
      }
      , to_anchor: 1000
    },
    GJ: {
      name: {
        singular: 'Gigajoule',
        plural: 'Gigajoules',
        display: '(GJ)'
      }
      , to_anchor: 1000000000
    },
    MJ: {
      name: {
        singular: 'Megajoule',
        plural: 'Megajoules',
        display: '(MJ)'
      },
      to_anchor: 1000000
    }

    , cal: {
      name: {
        singular: 'Calorie',
        plural: ' Calories',
        display: '(cal)'
      }
      , to_anchor: 4.1868
    }
    , kcal: {
      name: {
        singular: 'Kilocalorie',
        plural: 'Kilocalories',
        display: '(kcal)'
      }
      , to_anchor: 4184
    }

    , kgce: {
      name: {
        singular: 'Kilogram of coal equivalent',
        plural: 'Kilograms of coal equivalent',
        display: '(kgce)'
      }
      , to_anchor: 29295000
    }
    , kgoe: {
      name: {
        singular: 'Kilogram of oil equivalent',
        plural: 'Kilograms of oil equivalent',
        display: '(kgoe)'
      }
      , to_anchor: 41868000
    },

  },
  imperial: {
    Btu: {
      name: {
        singular: 'British thermal unit',
        plural: 'British thermal units',
        display: '(Btu)'
      }
      , to_anchor: 1
    }
    , MMBtu: {
      name: {
        singular: 'Million British Thermal Units',
        plural: 'Millions British Thermal Units',
        display: '(MMBtu)'
      }
      , to_anchor: 1000000
    }, Therms: {
      name: {
        singular: 'Therm'
        , plural: 'Therms',
        display: '(Therm)'
      }
      , to_anchor: 100000
    }, Dtherms: {
      name: {
        singular: 'Dekatherm'
        , plural: 'Dekatherms',
        display: '(DTherm)'
      }
      , to_anchor: 1000000
    }
    , galF: {
      name: {
        singular: 'Gallon-Fahrenheit'
        , plural: 'Gallons-Fahrenheit',
        display: '(gal-&#x2109;)'
      }
      , to_anchor: 8.24
    }
    , tonHr: {
      name: {
        singular: 'Ton Hour'
        , plural: 'Ton Hour',
        display: '(ton-Hr)'
      }
      , to_anchor: 12000
    }
  },
  _anchors: {
    metric: {
      unit: 'J',
      ratio: 1 / 1055.06
    },
    imperial: {
      unit: 'Btu',
      ratio: 1055.06
    }
  }
};
