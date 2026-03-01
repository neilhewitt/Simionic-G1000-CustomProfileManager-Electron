import {
  Profile,
  Gauge,
  AircraftConfig,
  AircraftType,
  RangeColour,
  createProfile,
  getConfigValue,
  getGauges,
} from '../../shared/types';

/**
 * Converts SQLite AircraftConfig rows into a Profile object.
 * Port of ProfileBuilder.cs
 */
export function buildProfile(config: AircraftConfig): Profile {
  const profile = createProfile();
  profile.Name = config.Name;

  // Gauge prefix map — must match ProfileBuilder.cs exactly
  // Note: reading uses "NG" (uppercase)
  const gaugeToPrefixMap = new Map<Gauge, string>([
    [profile.ManifoldPressure, 'ManIn'],
    [profile.Load, 'Load'],
    [profile.RPM, 'RPM'],
    [profile.ITT, 'ITT'],
    [profile.Torque, 'Torque'],
    [profile.Fuel, 'FuelQty'],
    [profile.FuelFlow, 'FFlow'],
    [profile.TIT, 'TIT'],
    [profile.OilTemperature, 'OilTemp'],
    [profile.OilPressure, 'OilPress'],
    [profile.CHT, 'CHT'],
    [profile.EGT, 'EGT'],
    [profile.NG, 'NG'],
  ]);

  function getValue<T extends 'number' | 'string' | 'int'>(
    type: T,
    configObj: AircraftConfig,
    name: string,
    prefix?: string
  ): T extends 'string' ? string : number {
    const fullName = `${prefix ?? ''}${name}`;
    const value = getConfigValue(configObj, fullName);
    if (value === null || value === undefined) return (type === 'string' ? '' : 0) as any;
    if (typeof value === 'string' && value.trim() === '') return (type === 'string' ? '' : 0) as any;

    if (type === 'string') {
      return String(value) as any;
    }
    if (type === 'int') {
      const parsed = parseFloat(String(value));
      return (isNaN(parsed) ? 0 : Math.floor(parsed)) as any;
    }
    // number (double)
    const parsed = parseFloat(String(value));
    return (isNaN(parsed) ? 0 : parsed) as any;
  }

  function getGaugeValue<T extends 'number' | 'string' | 'int'>(
    type: T,
    gauge: Gauge,
    configObj: AircraftConfig,
    name: string
  ): T extends 'string' ? string : number {
    const prefix = `Gauge${gaugeToPrefixMap.get(gauge)}`;
    return getValue(type, configObj, name, prefix);
  }

  function setGauge(gauge: Gauge): void {
    gauge.Min = getGaugeValue('number', gauge, config, 'Min');
    gauge.Max = getGaugeValue('number', gauge, config, 'Max');

    // special cases
    if (gauge === profile.Load) {
      gauge.MaxPower = getGaugeValue('number', gauge, config, 'MaxKw');
    }
    if (gauge === profile.Torque) {
      gauge.TorqueInFootPounds = getGaugeValue('number', gauge, config, 'TorqueStyle') === 0;
    }
    if (gauge === profile.Fuel) {
      gauge.FuelInGallons = getValue('number', config, 'GaugeFuelUnit') === 0;
      gauge.CapacityForSingleTank = getValue('number', config, 'GaugeFuelQty');
    }

    for (let i = 0; i < 4; i++) {
      gauge.Ranges[i].Colour = getGaugeValue('int', gauge, config, `SecColor${i}`) as RangeColour;
      gauge.Ranges[i].Min = getGaugeValue('number', gauge, config, `SecMin${i}`);
      gauge.Ranges[i].Max = getGaugeValue('number', gauge, config, `SecMax${i}`);
    }
  }

  // basic info
  profile.AircraftType = getValue('int', config, 'engineType') as AircraftType;
  profile.Engines = getValue('int', config, 'engineNum') + 1;
  profile.Cylinders = getValue('int', config, 'cylinderCount');
  profile.FADEC = getValue('int', config, 'FEDEC') === 1; // NOTE: spelling mistake is in DB
  profile.Turbocharged = getValue('int', config, 'Turbocharged') === 1;
  profile.ConstantSpeed = getValue('int', config, 'ContantSpeed') === 1; // another spelling mistake in DB
  profile.TemperaturesInFahrenheit = getValue('int', config, 'GaugeTempUnit') === 0;

  // vacuum
  profile.VacuumPSIRange.Min = getValue('number', config, 'GaugeVacMin');
  profile.VacuumPSIRange.Max = getValue('number', config, 'GaugeVac');
  profile.VacuumPSIRange.GreenStart = getValue('number', config, 'GaugeVacGreenMin');
  profile.VacuumPSIRange.GreenEnd = getValue('number', config, 'GaugeVacGreenMax');

  // elevator trim
  profile.DisplayElevatorTrim = getValue('int', config, 'GaugeTrim') === 1;
  profile.ElevatorTrimTakeOffRange.Min = getValue('int', config, 'GaugeTrimGreenMin');
  profile.ElevatorTrimTakeOffRange.Max = getValue('int', config, 'GaugeTrimGreenMax');

  // rudder trim
  profile.DisplayRudderTrim = getValue('int', config, 'GaugeRudderTrim') === 1;
  profile.RudderTrimTakeOffRange.Min = getValue('int', config, 'GaugeRudderTrimGreenMin');
  profile.RudderTrimTakeOffRange.Max = getValue('int', config, 'GaugeRudderTrimGreenMax');

  // flaps
  profile.DisplayFlapsIndicator = getValue('int', config, 'GaugeFlaps') === 1;
  for (let i = 0; i < 6; i++) {
    profile.FlapsRange.Markings[i] = getValue('string', config, `GaugeFlapsNotchText${i}`) || profile.FlapsRange.Markings[i];
    if (i > 0 && i < 5) {
      profile.FlapsRange.Positions[i] = getValue('int', config, `GaugeFlapsNotchPos${i}`);
    }
  }

  // v-speeds
  profile.VSpeeds.Vs0 = getValue('int', config, 'Vs0');
  profile.VSpeeds.Vs1 = getValue('int', config, 'Vs1');
  profile.VSpeeds.Vfe = getValue('int', config, 'Vfe');
  profile.VSpeeds.Vno = getValue('int', config, 'Vno');
  profile.VSpeeds.Vne = getValue('int', config, 'Vne');
  profile.VSpeeds.Vglide = getValue('int', config, 'Vglide');
  profile.VSpeeds.Vr = getValue('int', config, 'Vr');
  profile.VSpeeds.Vx = getValue('int', config, 'Vx');
  profile.VSpeeds.Vy = getValue('int', config, 'Vy');

  // all gauges
  for (const gauge of getGauges(profile)) {
    setGauge(gauge);
  }

  return profile;
}
