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
const comps = listOfComps.map(
  (filename) =>
    new Composition(readFileSync(path.join(COMP_ROOT, filename), "utf-8"))
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

  let dirty = false;

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
    const desiredRenderTo = `${RENDER_ROOT}/${renderId}/.png`;

    if (saver.Clip.Filename !== desiredRenderTo) {
      dirty = true;
      saver.Clip.Filename = desiredRenderTo;
    }

    if (saver.Clip.FormatID !== FormatID.PNG) {
      dirty = true;
      saver.Clip.FormatID = FormatID.PNG;
    }

    if (saver.CreateDir !== BoolNum.True) {
      dirty = true;
      saver.CreateDir = BoolNum.True;
    }

    if (saver.OutputFormat !== FormatID.PNG) {
      dirty = true;
      saver.OutputFormat = FormatID.PNG;
    }
  }

  if (dirty) {
    console.log("modifying comp: " + label);
  }

  if (originalName !== filename) {
    console.log(`rename: ${originalName} --> ${filename}`);

    if (dirty) {
      unlinkSync(path.join(COMP_ROOT, originalName));
      writeFileSync(path.join(COMP_ROOT, filename), comp.toString());
    } else {
      renameSync(
        path.join(COMP_ROOT, originalName),
        path.join(COMP_ROOT, filename)
      );
    }
  } else if (dirty) {
    writeFileSync(path.join(COMP_ROOT, filename), comp.toString());
  }
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
