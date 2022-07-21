/* Creative Toolkit - by dave caruso */
import { BoolNum, ClipAspectMode, ClipDepth, FormatID } from "./enum";
import { LuaTable } from "./lua-table";
import { FuId } from "./fuid";

export class Clip extends LuaTable {
  get Length() {
    return this.get("Length");
  }
  set Length(value: number) {
    this.set("Length", value);
  }
  get Saving() {
    return this.get("Saving");
  }
  set Saving(value: boolean) {
    this.set("Saving", value);
  }
  get TrimIn() {
    return this.get("TrimIn");
  }
  set TrimIn(value: number) {
    this.set("TrimIn", value);
  }
  get ExtendFirst() {
    return this.get("ExtendFirst");
  }
  set ExtendFirst(value: number) {
    this.set("ExtendFirst", value);
  }
  get ExtendLast() {
    return this.get("ExtendLast");
  }
  set ExtendLast(value: number) {
    this.set("ExtendLast", value);
  }
  get Loop() {
    return this.get("Loop");
  }
  set Loop(value: BoolNum) {
    this.set("Loop", value);
  }
  get AspectMode() {
    return this.get("AspectMode");
  }
  set AspectMode(value: ClipAspectMode) {
    this.set("AspectMode", value);
  }
  get Depth() {
    return this.get("Depth");
  }
  set Depth(value: ClipDepth) {
    this.set("Depth", value);
  }
  get GlobalStart() {
    return this.get("GlobalStart");
  }
  set GlobalStart(value: number) {
    this.set("GlobalStart", value);
  }
  get GlobalEnd() {
    return this.get("GlobalEnd");
  }
  set GlobalEnd(value: number) {
    this.set("GlobalEnd", value);
  }
  get Filename() {
    return this.get("Filename");
  }
  set Filename(value: string) {
    this.set("Filename", value);
  }
  get FormatID() {
    return this.get("FormatID");
  }
  set FormatID(value: FormatID) {
    this.set("FormatID", value);
  }
}
