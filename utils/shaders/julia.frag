precision highp float;

uniform vec2 u_resolution;
uniform float u_zoomSize;
uniform vec3 u_background;
uniform vec2 u_centerDelta;
uniform vec2 u_referenceOrbit[91];

const float escapeRadius = 4.0;
const float escapeRadius2 = escapeRadius * escapeRadius;
const int maxIterations = 90;
const float invMaxIterations = 1.0 / float(maxIterations);

vec2 complexSquare(vec2 v) {
    return vec2(v.x * v.x - v.y * v.y, v.x * v.y * 2.0);
}

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Procedural palette generator by Inigo Quilez.
// See: http://iquilezles.org/articles/palettes/
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 paletteColor(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.0, 0.08, 0.18);
    return palette(fract(t + 0.45), a, b, c, d);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 deltaZ = u_centerDelta + uv * u_zoomSize;
    vec2 z = u_referenceOrbit[0] + deltaZ;
    int iteration = 0;

    for (int i = 0; i < maxIterations; i++) {
        vec2 referenceZ = u_referenceOrbit[i];
        deltaZ = 2.0 * complexMul(referenceZ, deltaZ) + complexSquare(deltaZ);
        z = u_referenceOrbit[i + 1] + deltaZ;
        if (dot(z, z) > escapeRadius2) {
            break;
        }
        iteration++;
    }

    vec3 color = u_background;
    float distance2 = dot(z, z);
    if (distance2 > escapeRadius2) {
        float nu = log2(log(distance2) / 2.0);
        float fractionalIteration = clamp(
            (float(iteration + 1) - nu) * invMaxIterations,
            0.0,
            1.0
        );
        color = paletteColor(fractionalIteration);
    }

    gl_FragColor = vec4(color, 1.0);
}
