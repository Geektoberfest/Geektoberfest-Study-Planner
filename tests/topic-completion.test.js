import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldCompleteTopic } from "../lib/topic-completion.js";

test("does not complete a topic when actual time is insufficient", () => {
  const sessions = [
    { plannedMinutes: 60, actualMinutes: 20 },
    { plannedMinutes: 40, actualMinutes: 15 },
  ];

  assert.equal(shouldCompleteTopic(sessions, 100), false);
});

test("completes a topic when actual time reaches the estimate", () => {
  const sessions = [
    { actualMinutes: 40 },
    { actualMinutes: 60 },
  ];

  assert.equal(shouldCompleteTopic(sessions, 100), true);
});

test("adds actual minutes across multiple sessions", () => {
  const sessions = [
    { actualMinutes: 20 },
    { actualMinutes: 25 },
    { actualMinutes: 15 },
  ];

  assert.equal(shouldCompleteTopic(sessions, 60), true);
});

test("does not complete a topic when actual time is below the estimate", () => {
  const sessions = [
    { actualMinutes: 20 },
    { actualMinutes: 15 },
  ];

  assert.equal(shouldCompleteTopic(sessions, 60), false);
});

test("does not complete a topic with zero estimated minutes", () => {
  const sessions = [{ actualMinutes: 60 }];

  assert.equal(shouldCompleteTopic(sessions, 0), false);
});

test("ignores invalid actual minutes", () => {
  const sessions = [
    { actualMinutes: 30 },
    { actualMinutes: -10 },
    { actualMinutes: "40" },
    {},
  ];

  assert.equal(shouldCompleteTopic(sessions, 60), false);
});