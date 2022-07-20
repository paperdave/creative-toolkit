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
import { LuaTable } from "../src/bmfusion/lua-table";
import { pascalCase } from "change-case";
import { Input } from "../src/bmfusion/input";

// INPUTS
const PROJECT = "/home/dave/fuckingbullshit/stupid";
const PROJECT_NAME = "stupid";
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

  const saver = comp.Tools.get("MainOutput");
  if (saver) {
    if (saver.Type !== "Saver") {
      console.log(
        `${filename} has something named \`MainOutput\` that is not a Saver.`
      );
    }
    const clipValue = saver.Inputs.get("Clip")!.Value;
    const renderTo = clipValue.get("Filename");
    const desiredRenderTo = `${RENDER_ROOT}/${pascalCase(
      PROJECT_NAME
    )}-Fusion-${pascalCase(label)}/.png`;

    if (renderTo !== desiredRenderTo) {
      dirty = true;
      clipValue.set("Filename", desiredRenderTo);
    }

    if (clipValue.get("FormatID") !== "PNGFormat") {
      dirty = true;
      clipValue.set("FormatID", "PNGFormat");
    }

    const createDir = saver.Inputs.get("CreateDir");
    if (!createDir || createDir.get("Value") !== 1) {
      dirty = true;
      saver.Inputs.set("CreateDir", new Input(1));
    }

    const outputFormat = saver.Inputs.get("OutputFormat");
    if (!outputFormat || outputFormat.get("Value").get(0) !== "PNGFormat") {
      dirty = true;
      saver.Inputs.set(
        "OutputFormat",
        new LuaTable(`Input { Value = FuId { "PNGFormat" } }`)
      );
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
  const saver = !!comp.Tools.get("MainOutput");

  console.log(
    `[${i}] ${label} - frames ${comp.RenderRange.join("-")} - ${
      comp.Tools.keys().length
    } Tools${saver ? "" : " [MISSING SAVER]"}`
  );
});
