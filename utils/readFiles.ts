import { join } from "path";
import { readFile } from "fs/promises";

export function getDescription(fileName: string) {
  return readFile(join(process.cwd(), "fractal-descriptions", fileName), "utf-8");
}
