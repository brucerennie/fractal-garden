export type Vec2D = [number, number];
export type Matrix2D = [Vec2D, Vec2D];

export const Vector = {
  scale(factor: number, [x, y]: Vec2D): Vec2D {
    return [x * factor, y * factor];
  },

  add([x1, y1]: Vec2D, [x2, y2]: Vec2D): Vec2D {
    return [x1 + x2, y1 + y2];
  },

  sub([x1, y1]: Vec2D, [x2, y2]: Vec2D): Vec2D {
    return [x1 - x2, y1 - y2];
  },

  mul([x, y]: Vec2D, [m1, m2]: Matrix2D): Vec2D {
    const mul = ([v1, v2]: Vec2D) => x * v1 + y * v2;
    return [mul(m1), mul(m2)];
  },

  dist([x1, y1]: Vec2D, [x2, y2]: Vec2D): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },
};
