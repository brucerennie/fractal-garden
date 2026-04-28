import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function getDescription(fileName: string) {
  return readFile(join(process.cwd(), "fractal-descriptions", fileName), "utf-8");
}
