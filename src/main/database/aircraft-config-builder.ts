import {
  Profile,
  Gauge,
  AircraftConfig,
  ConfigItem,
  getGauges,
} from '../../shared/types';

/**
 * Converts a Profile into ConfigItem[] for SQL generation.
 * Port of AircraftConfigBuilder.cs
 */
export function buildAircraftConfig(profile: Profile, aircraftId: number): AircraftConfig {
  const config: ConfigItem[] = [];

  // Gauge prefix map — must match AircraftConfigBuilder.cs exactly
  // Note: writing uses "Ng" (lowercase g) for NG gauge
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
    [profile.NG, 'Ng'], // note lower-case 'g'
  ]);

  function addConfig(name: string, value: string | number | null): void {
    config.push({ AircraftId: aircraftId, Name: name, Value: value });
  }

  function getKey(gauge: Gauge, suffix: string): string {
    return `Gauge${gaugeToPrefixMap.get(gauge)}${suffix}`;
  }

  // basic info
  addConfig('engineType', profile.AircraftType as number);
  addConfig('engineNum', profile.Engines - 1);
  addConfig('cylinderCount', profile.Cylinders);
  addConfig('FEDEC', profile.FADEC ? 1 : 0); // note spelling error
  addConfig('Turbocharged', profile.Turbocharged ? 1 : 0);
  addConfig('ContantSpeed', profile.ConstantSpeed ? 1 : 0); // note spelling error
  addConfig('GaugeTempUnit', profile.TemperaturesInFahrenheit ? 0 : 1);
  addConfig('GaugeStyle', '0');

  // vacuum
  addConfig('GaugeVacMin', profile.VacuumPSIRange.Min);
  addConfig('GaugeVacMax', profile.VacuumPSIRange.Min); // C# source writes Min for both VacMin and VacMax
  addConfig('GaugeVacGreenMin', profile.VacuumPSIRange.GreenStart);
  addConfig('GaugeVacGreenMax', profile.VacuumPSIRange.GreenEnd);

  // elevator trim
  addConfig('GaugeTrim', profile.DisplayElevatorTrim ? 1 : 0);
  addConfig('GaugeTrimGreenMin', profile.ElevatorTrimTakeOffRange.Min);
  addConfig('GaugeTrimGreenMax', profile.ElevatorTrimTakeOffRange.Max);

  // rudder trim
  addConfig('GaugeRudderTrim', profile.DisplayRudderTrim ? 1 : 0);
  addConfig('GaugeRudderTrimGreenMin', profile.RudderTrimTakeOffRange.Min);
  addConfig('GaugeRudderTrimGreenMax', profile.RudderTrimTakeOffRange.Max);

  // flaps
  addConfig('GaugeFlaps', profile.DisplayFlapsIndicator ? 1 : 0);
  for (let i = 0; i < 6; i++) {
    addConfig(`GaugeFlapsNotchText${i}`, profile.FlapsRange.Markings[i]);
    if (i > 0 && i < 5) {
      addConfig(`GaugeFlapsNotchPos${i}`, profile.FlapsRange.Positions[i]);
    }
  }

  // v-speeds
  addConfig('Vs0', profile.VSpeeds.Vs0);
  addConfig('Vs1', profile.VSpeeds.Vs1);
  addConfig('Vfe', profile.VSpeeds.Vfe);
  addConfig('Vno', profile.VSpeeds.Vno);
  addConfig('Vne', profile.VSpeeds.Vne);
  addConfig('Vglide', profile.VSpeeds.Vglide);
  addConfig('Vr', profile.VSpeeds.Vr);
  addConfig('Vx', profile.VSpeeds.Vx);
  addConfig('Vy', profile.VSpeeds.Vy);

  // all gauges
  for (const gauge of getGauges(profile)) {
    addConfig(getKey(gauge, 'Min'), gauge.Min);
    addConfig(getKey(gauge, 'Max'), gauge.Max);

    // special cases
    if (gauge === profile.Load) {
      addConfig(getKey(gauge, 'MaxKw'), gauge.MaxPower);
    }
    if (gauge === profile.Torque) {
      addConfig(getKey(gauge, 'Style'), (gauge.TorqueInFootPounds ?? true) ? 0 : 1);
    }
    if (gauge === profile.Fuel) {
      addConfig('GaugeFuelUnit', (gauge.FuelInGallons ?? true) ? 0 : 1);
      addConfig(getKey(gauge, ''), gauge.CapacityForSingleTank ?? 0);
    }

    for (let i = 0; i < 4; i++) {
      addConfig(getKey(gauge, `SecColor${i}`), gauge.Ranges[i].Colour as number);
      addConfig(getKey(gauge, `SecMin${i}`), Math.floor(gauge.Ranges[i].Min));
      addConfig(getKey(gauge, `SecMax${i}`), Math.floor(gauge.Ranges[i].Max));
    }
  }

  return { Id: aircraftId, Name: profile.Name, ConfigItems: config };
}
