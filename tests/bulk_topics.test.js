import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSyllabusText } from "../lib/utils.js";
import { bulkTopicsSchema, bulkTopicItemSchema } from "../lib/validation.js";

test("parseSyllabusText: parses plain lines, numbered lists, and bullet points", () => {
  const sample = `
1. Introduction to Operating Systems
2) Process Synchronization
3 - CPU Scheduling
- Memory Management
* Virtual Memory Systems
• File Systems and I/O
+ Distributed Systems
`;

  const parsed = parseSyllabusText(sample, {
    defaultDifficulty: "hard",
    defaultMinutes: 90,
    defaultImportance: 8,
  });

  assert.equal(parsed.length, 7);
  assert.equal(parsed[0].name, "Introduction to Operating Systems");
  assert.equal(parsed[0].difficulty, "hard");
  assert.equal(parsed[0].estimatedMinutes, 90);
  assert.equal(parsed[0].importance, 8);

  assert.equal(parsed[1].name, "Process Synchronization");
  assert.equal(parsed[2].name, "CPU Scheduling");
  assert.equal(parsed[3].name, "Memory Management");
  assert.equal(parsed[4].name, "Virtual Memory Systems");
  assert.equal(parsed[5].name, "File Systems and I/O");
  assert.equal(parsed[6].name, "Distributed Systems");
});

test("parseSyllabusText: strips markdown headers and trailing punctuation", () => {
  const sample = `
## Module 1: Computer Networks;
### TCP/IP Protocol Suite,
# Network Security & Firewalls.
`;

  const parsed = parseSyllabusText(sample);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].name, "Module 1: Computer Networks");
  assert.equal(parsed[1].name, "TCP/IP Protocol Suite");
  assert.equal(parsed[2].name, "Network Security & Firewalls");
});

test("parseSyllabusText: prevents duplicates case-insensitively within import", () => {
  const sample = `
Binary Search Trees
binary search trees
BINARY SEARCH TREES
AVL Trees
`;

  const parsed = parseSyllabusText(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "Binary Search Trees");
  assert.equal(parsed[1].name, "AVL Trees");
});

test("parseSyllabusText: handles empty input and whitespace gracefully", () => {
  assert.deepEqual(parseSyllabusText(""), []);
  assert.deepEqual(parseSyllabusText("   \n\n\t  \n  "), []);
  assert.deepEqual(parseSyllabusText(null), []);
});

test("bulkTopicsSchema: validates valid bulk topic array and subjectId", () => {
  const validPayload = {
    subjectId: "65d4a1b2c3d4e5f6a7b8c9d0",
    topics: [
      { name: "Sorting Algorithms", difficulty: "easy", estimatedMinutes: 45, importance: 6 },
      { name: "Graph Algorithms", difficulty: "hard", estimatedMinutes: 120, importance: 9 },
    ],
  };

  const result = bulkTopicsSchema.safeParse(validPayload);
  assert.equal(result.success, true);
  assert.equal(result.data.topics.length, 2);
});

test("bulkTopicsSchema: rejects invalid topic data (empty list, invalid minutes, bad id)", () => {
  // Empty topics list
  const emptyTopics = bulkTopicsSchema.safeParse({
    subjectId: "65d4a1b2c3d4e5f6a7b8c9d0",
    topics: [],
  });
  assert.equal(emptyTopics.success, false);

  // Invalid ObjectId
  const invalidId = bulkTopicsSchema.safeParse({
    subjectId: "not-an-objectid",
    topics: [{ name: "Topic A" }],
  });
  assert.equal(invalidId.success, false);

  // Out of range minutes (< 5)
  const tooLowMin = bulkTopicItemSchema.safeParse({
    name: "Topic A",
    estimatedMinutes: 2,
  });
  assert.equal(tooLowMin.success, false);

  // Out of range importance (> 10)
  const tooHighImp = bulkTopicItemSchema.safeParse({
    name: "Topic A",
    importance: 15,
  });
  assert.equal(tooHighImp.success, false);
});
