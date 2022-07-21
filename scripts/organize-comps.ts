#!/usr/bin/env bun
/* Creative Toolkit - by dave caruso */
// CLI sets up composition names and saver format

import {
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";
import { Composition } from "../src/bmfusion/composition";
import { pascalCase } from "change-case";
import { SaverTool } from "../src/bmfusion/tool/saver";
import { BoolNum, FormatID } from "../src/bmfusion/enum";

// INPUTS
const PROJECT = "/home/dave/fuckingbullshit/local-test2";
const PROJECT_NAME = "local-test2";
const RENDER_ROOT = "/render";

//
const COMP_ROOT = path.join(PROJECT, "comps");

const listOfComps = readdirSync(COMP_ROOT).filter((x) => x.endsWith(".comp"));
const comps = listOfComps.map((filename) =>
  Composition.fromFile(path.join(COMP_ROOT, filename))
);

const longestNum = comps
  .flatMap((comp) => comp.RenderRange)
  .reduce((acc, curr) => Math.max(acc, curr));

const newFilenames: any[] = [];

comps.forEach((comp, i) => {
  const originalName = listOfComps[i];
  const label = originalName
    .replace(/^[0-9]+-[0-9]+_/, "")
    .replace(/.comp$/, "");
  const prefix = comp.RenderRange.map((x) =>
    x.toString().padStart(longestNum.toString().length, "0")
  ).join("-");
  const filename = `${prefix}_${label}.comp`;

  newFilenames.push({
    prefix,
    filename,
    label,
  });

  const saver = comp.Tools.get("MainOutput", SaverTool);
  if (saver) {
    if (saver.Type !== "Saver") {
      console.log(
        `${filename} has something named \`MainOutput\` that is not a Saver.`
      );
    }

    const renderId = `${pascalCase(PROJECT_NAME)}-Fusion-${pascalCase(label)}`;

    saver.Clip.Filename = `${RENDER_ROOT}/${renderId}/.png`;
    saver.Clip.FormatID = FormatID.PNG;
    saver.CreateDir = BoolNum.True;
    saver.OutputFormat = FormatID.PNG;
  }

  if (comp.dirty) {
    console.log("modifying comp: " + label);
  }

  comp.writeAndMoveFile(path.join(COMP_ROOT, filename));
});

console.log();

comps.forEach((comp, i) => {
  const { label } = newFilenames[i];
  const saver = !!comp.Tools.has("MainOutput");

  console.log(
    `[${i}] ${label} - frames ${comp.RenderRange.join("-")} - ${
      comp.Tools.length
    } Tools${saver ? "" : " [MISSING SAVER]"}`
  );
});
