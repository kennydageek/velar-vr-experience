export type Gear = 'P' | 'R' | 'N' | 'D';

export type Keys = {
  w: boolean;
  s: boolean;
  a: boolean;
  d: boolean;
  space: boolean;
  shift: boolean;
};

export type DrivingTelemetry = {
  speedKmh: number;
  rpm: number;
  braking: boolean;
  steer: number;
  slip: number;
  absActive: boolean;
  worldPosition: { x: number; y: number; z: number };
  heading: number;
  velocity: number;
};
