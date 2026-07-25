const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeArchivePath, parseWszstDiffOutput } = require("../electron/szs-diff.cjs");

test("parses multiple changed, added and removed archive files", () => {
  const output = `
* Only in source #2: added.txt
* File data differ:  changed.txt
* Only in source #1: removed.txt
* File size differ:  nested/multi.txt [14+1=15]
* Only in source #2: nested/second-added.txt
Content differ: before.szs : after.szs
`;

  assert.deepEqual(parseWszstDiffOutput(output), [
    { kind: "modified", path: "changed.txt" },
    { kind: "modified", path: "nested/multi.txt" },
    { kind: "added", path: "added.txt" },
    { kind: "added", path: "nested/second-added.txt" },
    { kind: "removed", path: "removed.txt" },
  ]);
});

test("collapses remove/add pairs for the same path into one modification", () => {
  const output = `
* Only in source #2: ./course.kcl
* Only in source #1: ./course.kcl
* Only in source #2: ./new-folder/
`;
  assert.deepEqual(parseWszstDiffOutput(output), [{ kind: "modified", path: "course.kcl" }]);
});

test("normalizes archive paths and size suffixes", () => {
  assert.equal(normalizeArchivePath("./map\\course.kmp [20+4=24]"), "map/course.kmp");
});
