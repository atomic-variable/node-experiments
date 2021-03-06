#!/usr/bin/env node

"use strict";

import { createReadStream, createWriteStream } from "fs";
import { resolve, join } from "path";
import minimist from "minimist";
import { Stream } from "stream";
import { createGunzip, createGzip } from "zlib";

var TransformStream = Stream.Transform;

var args = minimist(process.argv.slice(2), {
  boolean: ["help", "in", "out", "compress", "decompress"],
  string: ["file"]
});

var BASE_PATH = resolve(process.env.BASE_PATH || resolve());

var OUT_FILE = join(BASE_PATH, "out.txt");

if(args.help) {
  printHelp();
} else if(args.in || args._.includes("-")) {
  processContents(process.stdin);
} else if(args.file) {
  var fileName = join(BASE_PATH, args.file);
  let stream = createReadStream(fileName);
  processContents(stream);
} else {
  error("Incorrect usage!!", true);
}

//This way we are saving a lot of memory as we'll never have the whole file in memory. Effectively, we only had about 65,000 bytes in memory anytime because it would read a chunk, and then write it out to the standard out and then read another chunk and read it out to the standard out. Instead of like we were doing before, which is we read it into a buffer and then converted it to a string and changed it to an uppercase string and then wrote it out.
function processContents(inStream) {
  var targetStream;

  if(args.decompress) {
    let gunzipStream = createGunzip();
    inStream = inStream.pipe(gunzipStream);
  }

  //This whole transformation will not happen at once, as mentioned above it'll happen in chunks
  var upperStream = new TransformStream({
    transform(chunk, encoding, callback) {
      this.push(chunk.toString().toUpperCase());
      //setTimeout(callback, 500); //With a very large file you can see that happening 
      callback()
    }
  });

  inStream = inStream.pipe(upperStream)
  
  if(args.compress) {
    let gzipStream = createGzip();
    inStream = inStream.pipe(gzipStream);
    OUT_FILE = `${OUT_FILE}.gz`;
  }

  if(args.out) {
    targetStream = process.stdout;
  } else {
    targetStream = createWriteStream(OUT_FILE);
  }

  inStream.pipe(targetStream);
}

function error(msg, includeHelp = false) {
  console.error(msg);
  includeHelp && (console.log(""), printHelp());
}

function printHelp() {
  console.log("test usage");
  console.log("  test.js --file={FILENAME}");
  console.log("");
  console.log("--help            print this help");
  console.log("--file={FILENAME} process this file");
  console.log("--in, -           process stdin")
  console.log("--out             print to stdout")
  console.log("--compress        will gzip the input");
  console.log("--decompress      will ungzip the input");
  console.log("");
}

//vi out.txt.gz // this will automatically unzips the file and show in editor
//cat out.txt.gz // this will print the file as is
