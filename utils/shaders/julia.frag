precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoomSize;
uniform vec2 u_c;
uniform vec3 u_background;
uniform vec2 u_referenceOrbitHigh[91];
uniform vec2 u_referenceOrbitLow[91];
uniform float u_usePerturbation;

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
    vec2 z = vec2(0.0);
    int iteration = 0;

    if (u_usePerturbation < 0.5) {
        z = u_center + uv * u_zoomSize;

        for (int i = 0; i < maxIterations; i++) {
            z = complexSquare(z) + u_c;
            if (dot(z, z) > escapeRadius2) {
                break;
            }
            iteration++;
        }
    } else {
        vec2 deltaZ = uv * u_zoomSize;
        z = u_referenceOrbitHigh[0] + u_referenceOrbitLow[0] + deltaZ;

        for (int i = 0; i < maxIterations; i++) {
            vec2 referenceHigh = u_referenceOrbitHigh[i];
            vec2 referenceLow = u_referenceOrbitLow[i];
            deltaZ = 2.0 * complexMul(referenceHigh, deltaZ)
                + 2.0 * complexMul(referenceLow, deltaZ)
                + complexSquare(deltaZ);
            z = u_referenceOrbitHigh[i + 1] + u_referenceOrbitLow[i + 1] + deltaZ;
            if (dot(z, z) > escapeRadius2) {
                break;
            }
            iteration++;
        }
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
