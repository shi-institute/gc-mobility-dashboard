#!/usr/bin/env node
import { CotarIndexBuilder } from "@cotar/builder/build/src/index.js";
import { open, writeFile } from "fs/promises";

async function createIndex(tarPath) {
  if (!tarPath) {
    console.error("Usage: node create_index.js <path-to-tar>");
    process.exit(1);
  }

  try {
    const fd = await open(tarPath, "r");
    const res = await CotarIndexBuilder.create(fd, CotarIndexBuilder.Binary);
    const indexPath = `${tarPath}.index`;
    await writeFile(indexPath, res.buffer);
    await fd.close();
    console.log(`Index created: ${indexPath}`);
  } catch (err) {
    console.error("Error creating index:", err);
    process.exit(1);
  }
}

// first argument after the script name
const tarPath = process.argv[2];
createIndex(tarPath);
