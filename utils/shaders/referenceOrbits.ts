export type Complex = [number, number];
type DoubleDouble = [number, number];
const doubleSplitter = 134217729;

const complexSquare = ([real, imag]: Complex): Complex => [
  real * real - imag * imag,
  2 * real * imag,
];

const pushComplex = (target: Float32Array, index: number, value: Complex) => {
  target[index * 2] = value[0];
  target[index * 2 + 1] = value[1];
};

const ddAdd = ([aHigh, aLow]: DoubleDouble, [bHigh, bLow]: DoubleDouble): DoubleDouble => {
  const sum = aHigh + bHigh;
  const offset = sum - aHigh;
  const error = aHigh - (sum - offset) + (bHigh - offset) + aLow + bLow;
  const result = sum + error;
  return [result, error - (result - sum)];
};

const ddSub = (a: DoubleDouble, b: DoubleDouble): DoubleDouble => ddAdd(a, [-b[0], -b[1]]);

const ddMul = ([aHigh, aLow]: DoubleDouble, [bHigh, bLow]: DoubleDouble): DoubleDouble => {
  const cona = aHigh * doubleSplitter;
  const conb = bHigh * doubleSplitter;
  const aUpper = cona - (cona - aHigh);
  const bUpper = conb - (conb - bHigh);
  const aLower = aHigh - aUpper;
  const bLower = bHigh - bUpper;
  const product = aHigh * bHigh;
  const productError =
    aUpper * bUpper - product + aUpper * bLower + aLower * bUpper + aLower * bLower;
  const error = productError + aHigh * bLow + aLow * bHigh + aLow * bLow;
  const result = product + error;
  return [result, error - (result - product)];
};

const splitForFloatUniform = ([high, low]: DoubleDouble): DoubleDouble => {
  const floatHigh = Math.fround(high);
  return [floatHigh, high - floatHigh + low];
};

const pushDoubleComplex = (
  highTarget: Float32Array,
  lowTarget: Float32Array,
  index: number,
  real: DoubleDouble,
  imag: DoubleDouble,
) => {
  const [realHigh, realLow] = splitForFloatUniform(real);
  const [imagHigh, imagLow] = splitForFloatUniform(imag);

  pushComplex(highTarget, index, [realHigh, imagHigh]);
  pushComplex(lowTarget, index, [realLow, imagLow]);
};

export function createMandelbrotReferenceOrbit(center: Complex, iterations: number) {
  const orbit = new Float32Array((iterations + 1) * 2);
  let z: Complex = [0, 0];

  pushComplex(orbit, 0, z);
  for (let i = 0; i < iterations; i++) {
    const squared = complexSquare(z);
    z = [squared[0] + center[0], squared[1] + center[1]];
    pushComplex(orbit, i + 1, z);
  }

  return orbit;
}

export function createJuliaReferenceOrbit(center: Complex, constant: Complex, iterations: number) {
  const orbit = new Float32Array((iterations + 1) * 2);
  let z: Complex = [center[0], center[1]];

  pushComplex(orbit, 0, z);
  for (let i = 0; i < iterations; i++) {
    const squared = complexSquare(z);
    z = [squared[0] + constant[0], squared[1] + constant[1]];
    pushComplex(orbit, i + 1, z);
  }

  return orbit;
}

export function createJuliaReferenceOrbitPair(
  center: Complex,
  centerLow: Complex,
  constant: Complex,
  iterations: number,
) {
  const high = new Float32Array((iterations + 1) * 2);
  const low = new Float32Array((iterations + 1) * 2);
  const constantReal: DoubleDouble = [constant[0], 0];
  const constantImag: DoubleDouble = [constant[1], 0];
  let real: DoubleDouble = [center[0], centerLow[0]];
  let imag: DoubleDouble = [center[1], centerLow[1]];

  pushDoubleComplex(high, low, 0, real, imag);
  for (let i = 0; i < iterations; i++) {
    const realSquared = ddMul(real, real);
    const imagSquared = ddMul(imag, imag);
    const realImag = ddMul(real, imag);
    const nextReal = ddAdd(ddSub(realSquared, imagSquared), constantReal);
    const nextImag = ddAdd(ddAdd(realImag, realImag), constantImag);

    real = nextReal;
    imag = nextImag;
    pushDoubleComplex(high, low, i + 1, real, imag);
  }

  return { high, low };
}

export function createBurningShipReferenceOrbit(center: Complex, iterations: number) {
  const orbit = new Float32Array((iterations + 1) * 2);
  let z: Complex = [0, 0];

  pushComplex(orbit, 0, z);
  for (let i = 0; i < iterations; i++) {
    const folded: Complex = [Math.abs(z[0]), Math.abs(z[1])];
    const squared = complexSquare(folded);
    z = [squared[0] + center[0], squared[1] + center[1]];
    pushComplex(orbit, i + 1, z);
  }

  return orbit;
}
