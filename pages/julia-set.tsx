import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { WebGLCanvas } from "../components/Canvas";
import { PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { createShaderProgram } from "../utils/shaders/compileShader";
import fragmentShader from "../utils/shaders/julia.frag";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import { createJuliaReferenceOrbit } from "../utils/shaders/referenceOrbits";

type Props = {
  description: string;
};

type Config = {
  preset: string;
  cReal: number;
  cImag: number;
  background: string;
};

const presets: Record<string, { cReal: number; cImag: number }> = {
  Rabbit: { cReal: -0.70176, cImag: -0.3842 },
  Spiral: { cReal: -0.8, cImag: 0.156 },
  Dendrite: { cReal: 0.285, cImag: 0.01 },
  Cauliflower: { cReal: -0.4, cImag: 0.6 },
};

const presetOptions = Object.keys(presets);
const presetLabels: Record<string, string> = {
  Rabbit: "Rabbit spiral",
  Spiral: "Sea spiral",
  Dendrite: "Electric dendrite",
  Cauliflower: "Cauliflower bloom",
};

const INITIAL_CENTER: [number, number] = [0, 0];
const INITIAL_ZOOM_SIZE = 1.8;
const MIN_ZOOM_SIZE = 1e-30;
const MAX_ZOOM_SIZE = 4;
const MAX_ITERATIONS = 90;

const JuliaSet = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const viewportRef = useRef({
    center: [...INITIAL_CENTER] as [number, number],
    zoomSize: INITIAL_ZOOM_SIZE,
  });
  const renderRef = useRef<(() => void) | null>(null);
  const [config, setConfig] = useState<Config>({
    preset: "Rabbit",
    cReal: presets.Rabbit.cReal,
    cImag: presets.Rabbit.cImag,
    background: "#252424",
  });

  useShaderViewportControls({
    canvas: cnv,
    viewportRef,
    minZoomSize: MIN_ZOOM_SIZE,
    maxZoomSize: MAX_ZOOM_SIZE,
    onViewportChange: () => renderRef.current?.(),
  });

  useEffect(() => {
    if (!gl || !width || !height || !cnv) return;

    const output = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!output) return;

    const { program, vert, frag } = output;

    // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design
    gl.useProgram(program);

    const vertBuf = gl.createBuffer();
    if (!vertBuf) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    const zoomSizeLocation = gl.getUniformLocation(program, "u_zoomSize");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const backgroundLocation = gl.getUniformLocation(program, "u_background");
    const centerDeltaLocation = gl.getUniformLocation(program, "u_centerDelta");
    const referenceOrbitLocation = gl.getUniformLocation(program, "u_referenceOrbit[0]");

    if (
      zoomSizeLocation === null ||
      resolutionLocation === null ||
      backgroundLocation === null ||
      centerDeltaLocation === null ||
      referenceOrbitLocation === null
    ) {
      return;
    }

    const parseHexColor = (hex: string) => {
      const clean = hex.replace("#", "");
      return [
        Number.parseInt(clean.slice(0, 2), 16) / 255,
        Number.parseInt(clean.slice(2, 4), 16) / 255,
        Number.parseInt(clean.slice(4, 6), 16) / 255,
      ] as const;
    };

    const getResolution = () => {
      const ratio = window.devicePixelRatio || 1;
      return [width * ratio, height * ratio] as const;
    };

    const drawJulia = () => {
      const [resolutionX, resolutionY] = getResolution();
      const [bgR, bgG, bgB] = parseHexColor(config.background);
      const { center, zoomSize } = viewportRef.current;
      const referenceCenter: [number, number] = [Math.fround(center[0]), Math.fround(center[1])];
      const centerDelta: [number, number] = [
        center[0] - referenceCenter[0],
        center[1] - referenceCenter[1],
      ];
      const referenceOrbit = createJuliaReferenceOrbit(
        referenceCenter,
        [config.cReal, config.cImag],
        MAX_ITERATIONS,
      );

      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, resolutionX, resolutionY);
      gl.uniform3f(backgroundLocation, bgR, bgG, bgB);
      gl.uniform2f(centerDeltaLocation, centerDelta[0], centerDelta[1]);
      gl.uniform2fv(referenceOrbitLocation, referenceOrbit);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    renderRef.current = drawJulia;

    drawJulia();

    return () => {
      renderRef.current = null;
      gl.deleteBuffer(vertBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [gl, width, height, cnv, config]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => {
      if (newData.preset && newData.preset !== old.preset) {
        return {
          ...old,
          preset: newData.preset,
          cReal: presets[newData.preset].cReal,
          cImag: presets[newData.preset].cImag,
        };
      }

      return { ...old, ...newData };
    });
  };

  return (
    <>
      <Head>
        <title>Julia Set</title>
        <meta
          name="description"
          content="An interactive Julia Set renderer with drag-to-pan, focal-point zoom, and preset constants. Explore how changing the complex parameter reshapes the fractal."
        />
      </Head>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          controlsHint="Start from a preset, then nudge c to discover your own family members."
          controlsTitle="Complex Constant"
          data={config}
          introTitle="Julia Set"
          lines={[
            "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the set.",
            "Open the studio to explore presets and reshape the family.",
          ]}
          mode="formula"
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelSelect
            path="preset"
            label="Starting point"
            optionLabels={presetOptions.map((option) => presetLabels[option])}
            options={presetOptions}
          />
          <PanelNumber path="cReal" min={-1} max={1} step={0.001} />
          <PanelNumber path="cImag" min={-1} max={1} step={0.001} />
        </ExplorerPanel>
        <div className={styles.fullScreen}>
          <WebGLCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default JuliaSet;

export async function getStaticProps() {
  const description = await getDescription("julia-set.md");
  return {
    props: {
      description,
    },
  };
}
