export enum BoolNum {
  False = 0,
  True = 1,
}

export enum ClipDepth {
  Format = 0,
  Default = 1,
  Int8 = 2,
  Int16 = 3,
  Float16 = 4,
  Float32 = 5,
}

export enum ClipAspectMode {
  FromFile = 0,
  Default = 1,
  Custom = 2,
}

export enum ClippingMode {
  None = 0,
  Domain = 1,
  Frame = 2,
}

export enum FormatID {
  PNG = "PNGFormat",
  OpenEXR = "OpenEXRFormat",
}
