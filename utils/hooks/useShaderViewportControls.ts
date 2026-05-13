import { type MutableRefObject, useEffect } from "react";
import { constrain } from "../ctxHelpers";

type DoubleDouble = [number, number];

export type ShaderViewport = {
  center: [number, number];
  centerLow?: [number, number];
  zoomSize: number;
};

type Point = {
  x: number;
  y: number;
};

type Params = {
  canvas: HTMLCanvasElement | null;
  viewportRef: MutableRefObject<ShaderViewport>;
  minZoomSize: number;
  maxZoomSize: number;
  onViewportChange: () => void;
  flipY?: boolean;
};

type PrecisePoint = {
  x: DoubleDouble;
  y: DoubleDouble;
};

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function addFloat([high, low]: DoubleDouble, value: number): DoubleDouble {
  const sum = high + value;
  const offset = sum - high;
  const error = high - (sum - offset) + (value - offset) + low;
  const result = sum + error;
  return [result, error - (result - sum)];
}

function subtractFloat(value: DoubleDouble, subtrahend: number): DoubleDouble {
  return addFloat(value, -subtrahend);
}

export function useShaderViewportControls({
  canvas,
  viewportRef,
  minZoomSize,
  maxZoomSize,
  onViewportChange,
  flipY = false,
}: Params) {
  useEffect(() => {
    if (!canvas) return;

    const activePointers = new Map<number, Point>();
    let dragAnchorWorld: PrecisePoint | null = null;
    let pinchAnchorWorld: PrecisePoint | null = null;
    let pinchInitialDistance = 0;
    let pinchInitialZoom = 0;

    const getRelativePoint = (event: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        point: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        rect,
      };
    };

    const pointToNormalized = (point: Point) => {
      const rect = canvas.getBoundingClientRect();
      const shortestSide = Math.min(rect.width, rect.height) || 1;

      return {
        x: (2 * point.x - rect.width) / shortestSide,
        y: (rect.height - 2 * point.y) / shortestSide,
      };
    };

    const pointToWorld = (point: Point, viewport = viewportRef.current) => {
      const normalized = pointToNormalized(point);
      const yDirection = flipY ? -1 : 1;
      const centerLow = viewport.centerLow || [0, 0];

      return {
        x: addFloat([viewport.center[0], centerLow[0]], normalized.x * viewport.zoomSize),
        y: addFloat(
          [viewport.center[1], centerLow[1]],
          normalized.y * viewport.zoomSize * yDirection,
        ),
      };
    };

    const setViewportFromAnchor = (anchorWorld: PrecisePoint, point: Point, zoomSize: number) => {
      const normalized = pointToNormalized(point);
      const nextX = subtractFloat(anchorWorld.x, normalized.x * zoomSize);
      const nextY = subtractFloat(anchorWorld.y, normalized.y * zoomSize * (flipY ? -1 : 1));

      viewportRef.current = {
        center: [nextX[0], nextY[0]],
        centerLow: [nextX[1], nextY[1]],
        zoomSize,
      };
      onViewportChange();
    };

    const getPointerPair = () => {
      const points = Array.from(activePointers.values());
      return points.length >= 2 ? ([points[0], points[1]] as const) : null;
    };

    const beginPinch = () => {
      const pair = getPointerPair();
      if (!pair) return;

      const currentViewport = viewportRef.current;
      const pinchMidpoint = midpoint(pair[0], pair[1]);
      pinchAnchorWorld = pointToWorld(pinchMidpoint, currentViewport);
      pinchInitialDistance = Math.max(distance(pair[0], pair[1]), 1);
      pinchInitialZoom = currentViewport.zoomSize;
      dragAnchorWorld = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      const { point } = getRelativePoint(event);
      activePointers.set(event.pointerId, point);
      canvas.setPointerCapture?.(event.pointerId);

      if (activePointers.size === 1) {
        dragAnchorWorld = pointToWorld(point);
        canvas.style.cursor = event.pointerType === "mouse" ? "grabbing" : "grab";
        return;
      }

      if (activePointers.size === 2) {
        beginPinch();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activePointers.has(event.pointerId)) return;

      event.preventDefault();
      const { point } = getRelativePoint(event);
      activePointers.set(event.pointerId, point);

      if (activePointers.size >= 2 && pinchAnchorWorld) {
        const pair = getPointerPair();
        if (!pair) return;

        const pinchMidpoint = midpoint(pair[0], pair[1]);
        const currentDistance = Math.max(distance(pair[0], pair[1]), 1);
        const nextZoomSize = constrain(
          pinchInitialZoom * (pinchInitialDistance / currentDistance),
          minZoomSize,
          maxZoomSize,
        );

        setViewportFromAnchor(pinchAnchorWorld, pinchMidpoint, nextZoomSize);
        return;
      }

      if (activePointers.size === 1 && dragAnchorWorld) {
        setViewportFromAnchor(dragAnchorWorld, point, viewportRef.current.zoomSize);
      }
    };

    const endPointer = (pointerId: number) => {
      activePointers.delete(pointerId);

      if (activePointers.size >= 2) {
        beginPinch();
        return;
      }

      if (activePointers.size === 1) {
        const [remainingPoint] = Array.from(activePointers.values());
        dragAnchorWorld = pointToWorld(remainingPoint);
        pinchAnchorWorld = null;
        return;
      }

      dragAnchorWorld = null;
      pinchAnchorWorld = null;
      canvas.style.cursor = "grab";
    };

    const handlePointerUp = (event: PointerEvent) => {
      endPointer(event.pointerId);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const currentViewport = viewportRef.current;
      const { point } = getRelativePoint(event);
      const anchorWorld = pointToWorld(point, currentViewport);
      const zoomFactor = Math.exp(event.deltaY * 0.0015);
      const nextZoomSize = constrain(
        currentViewport.zoomSize * zoomFactor,
        minZoomSize,
        maxZoomSize,
      );

      setViewportFromAnchor(anchorWorld, point, nextZoomSize);
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.style.touchAction = "";
    };
  }, [canvas, flipY, maxZoomSize, minZoomSize, onViewportChange, viewportRef]);
}
