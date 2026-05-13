export type Complex = [number, number];

const complexSquare = ([real, imag]: Complex): Complex => [
  real * real - imag * imag,
  2 * real * imag,
];

const pushComplex = (target: Float32Array, index: number, value: Complex) => {
  target[index * 2] = value[0];
  target[index * 2 + 1] = value[1];
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
