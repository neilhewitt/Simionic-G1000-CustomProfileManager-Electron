// Enums

export enum AircraftType {
  Piston = 0,
  Turboprop = 1,
  Jet = 2,
}

export enum RangeColour {
  None = 0,
  Green = 1,
  Yellow = 2,
  Red = 3,
}

// Interfaces & Classes

export interface OwnerInfo {
  Id: string | null;
  Name: string | null;
}

export interface VSpeeds {
  Vs0: number;
  Vs1: number;
  Vfe: number;
  Vno: number;
  Vne: number;
  Vglide: number;
  Vr: number;
  Vx: number;
  Vy: number;
}

export interface VacuumPSIRange {
  Min: number;
  Max: number;
  GreenStart: number;
  GreenEnd: number;
}

export interface SettingRange {
  Min: number;
  Max: number;
}

export interface FlapsRange {
  Markings: (string | null)[];
  Positions: (number | null)[];
}

export interface GaugeRange {
  Colour: RangeColour;
  Min: number;
  Max: number;
  AllowDecimals: boolean;
}

export interface Gauge {
  Name: string;
  Min: number | null;
  Max: number | null;
  FuelInGallons: boolean | null;
  CapacityForSingleTank: number | null;
  TorqueInFootPounds: boolean | null;
  MaxPower: number | null;
  Ranges: GaugeRange[];
  AllowDecimals: boolean;
}

export interface Profile {
  id: string | null;
  Owner: OwnerInfo;
  LastUpdated: string;
  Name: string;
  AircraftType: AircraftType;
  Engines: number;
  IsPublished: boolean;
  Notes: string | null;
  ForkedFrom: string | null;

  // Piston only
  Cylinders: number;
  FADEC: boolean;
  Turbocharged: boolean;
  ConstantSpeed: boolean;
  VacuumPSIRange: VacuumPSIRange;
  ManifoldPressure: Gauge;
  CHT: Gauge;
  EGT: Gauge;
  TIT: Gauge;
  Load: Gauge;

  // Turbo only
  Torque: Gauge;
  NG: Gauge;

  // Turbo + Jet
  ITT: Gauge;

  // Common to all
  TemperaturesInFahrenheit: boolean;
  RPM: Gauge;
  Fuel: Gauge;
  FuelFlow: Gauge;
  OilPressure: Gauge;
  OilTemperature: Gauge;
  DisplayElevatorTrim: boolean;
  ElevatorTrimTakeOffRange: SettingRange;
  DisplayRudderTrim: boolean;
  RudderTrimTakeOffRange: SettingRange;
  DisplayFlapsIndicator: boolean;
  FlapsRange: FlapsRange;
  VSpeeds: VSpeeds;
}

// Factory functions

export function createGaugeRange(): GaugeRange {
  return { Colour: RangeColour.None, Min: 0, Max: 0, AllowDecimals: false };
}

export function createGauge(
  name: string,
  min: number | null = null,
  max: number | null = null,
  options?: {
    fuelInGallons?: boolean | null;
    capacityForSingleTank?: number | null;
    torqueInFootPounds?: boolean | null;
    maxPower?: number | null;
    allowDecimals?: boolean;
  }
): Gauge {
  const allowDecimals = options?.allowDecimals ?? false;
  return {
    Name: name,
    Min: min,
    Max: max,
    FuelInGallons: options?.fuelInGallons ?? null,
    CapacityForSingleTank: options?.capacityForSingleTank ?? null,
    TorqueInFootPounds: options?.torqueInFootPounds ?? null,
    MaxPower: options?.maxPower ?? null,
    AllowDecimals: allowDecimals,
    Ranges: [
      { Colour: RangeColour.None, Min: 0, Max: 0, AllowDecimals: allowDecimals },
      { Colour: RangeColour.None, Min: 0, Max: 0, AllowDecimals: allowDecimals },
      { Colour: RangeColour.None, Min: 0, Max: 0, AllowDecimals: allowDecimals },
      { Colour: RangeColour.None, Min: 0, Max: 0, AllowDecimals: allowDecimals },
    ],
  };
}

export function createProfile(): Profile {
  return {
    id: null,
    Owner: { Id: null, Name: null },
    LastUpdated: new Date().toISOString(),
    Name: '',
    AircraftType: AircraftType.Piston,
    Engines: 1,
    IsPublished: false,
    Notes: null,
    ForkedFrom: null,
    Cylinders: 4,
    FADEC: false,
    Turbocharged: false,
    ConstantSpeed: false,
    VacuumPSIRange: { Min: 0, Max: 0, GreenStart: 0, GreenEnd: 0 },
    ManifoldPressure: createGauge('Manifold Pressure (inHg)', 0, 0, { allowDecimals: true }),
    CHT: createGauge('CHT (\u00b0F)', 0, 0),
    EGT: createGauge('EGT (\u00b0F)', 0, 0),
    TIT: createGauge('TIT (\u00b0F)', 0, 0),
    Load: createGauge('Load %'),
    Torque: createGauge('Torque (FT-LB)', 0, 0, { torqueInFootPounds: true }),
    NG: createGauge('NG (RPM%)', null, null),
    ITT: createGauge('ITT (\u00b0F)', 0, 0),
    TemperaturesInFahrenheit: true,
    RPM: createGauge('RPM', null, 0),
    Fuel: createGauge('Fuel', undefined, undefined, { fuelInGallons: true, capacityForSingleTank: 0 }),
    FuelFlow: createGauge('Fuel Flow (GPH)', null, 0, { allowDecimals: true }),
    OilPressure: createGauge('Oil Pressure (PSI)', null, 0, { allowDecimals: true }),
    OilTemperature: createGauge('Oil Temp (\u00b0F)', 0, 0),
    DisplayElevatorTrim: false,
    ElevatorTrimTakeOffRange: { Min: 0, Max: 0 },
    DisplayRudderTrim: false,
    RudderTrimTakeOffRange: { Min: 0, Max: 0 },
    DisplayFlapsIndicator: false,
    FlapsRange: {
      Markings: ['UP', null, null, null, null, 'F'],
      Positions: [0, null, null, null, null, 100],
    },
    VSpeeds: { Vs0: 0, Vs1: 0, Vfe: 0, Vno: 0, Vne: 0, Vglide: 0, Vr: 0, Vx: 0, Vy: 0 },
  };
}

/** Returns all 13 gauges in the same order as the C# Profile.Gauges property */
export function getGauges(profile: Profile): Gauge[] {
  return [
    profile.CHT,
    profile.EGT,
    profile.Torque,
    profile.NG,
    profile.ITT,
    profile.ManifoldPressure,
    profile.Load,
    profile.RPM,
    profile.Fuel,
    profile.TIT,
    profile.FuelFlow,
    profile.OilPressure,
    profile.OilTemperature,
  ];
}

// DB helper types (ported from ImportExport)

export interface ConfigItem {
  AircraftId: number;
  Name: string;
  Value: string | number | null;
}

export interface AircraftConfig {
  Id: number;
  Name: string;
  ConfigItems: ConfigItem[];
}

/** Case-insensitive config item lookup, matching C# AircraftConfig indexer */
export function getConfigValue(config: AircraftConfig, name: string): string | number | null {
  const lowerName = name.toLowerCase();
  const item = config.ConfigItems.find(x => x.Name.toLowerCase() === lowerName);
  return item?.Value ?? null;
}
