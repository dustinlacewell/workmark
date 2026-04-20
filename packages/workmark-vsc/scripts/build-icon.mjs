import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync(new URL("../resources/icon.svg", import.meta.url), "utf8");
const png = new Resvg(svg, { fitTo: { mode: "width", value: 256 } }).render().asPng();
writeFileSync(new URL("../resources/icon.png", import.meta.url), png);
