import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  buildSubgoalActivityTitle,
  hasSubgoalCompletedEvent,
  toZonedDayKey
} from "../utils/goalActivityUtils.js";

test("buildSubgoalActivityTitle formats consistent sub-goal log titles", () => {
  assert.equal(
    buildSubgoalActivityTitle("Complete DBMS", "Crack GATE 2027"),
    "Complete DBMS (Sub-goal in Crack GATE 2027)"
  );
});

test("toZonedDayKey respects timezone day boundaries", () => {
  const utcDate = new Date("2026-05-05T23:45:00.000Z");
  assert.equal(toZonedDayKey(utcDate, "Asia/Kolkata"), "2026-05-06");
  assert.equal(toZonedDayKey(utcDate, "UTC"), "2026-05-05");
});

test("hasSubgoalCompletedEvent matches subgoal completion using subgoalId", () => {
  const subgoalId = new mongoose.Types.ObjectId();
  const goal = {
    title: "Goal A",
    activityLogs: [
      {
        action: "subgoal_completed",
        title: "Legacy title",
        subgoalId,
        at: new Date("2026-05-06T10:00:00.000Z")
      }
    ]
  };
  const subgoal = {
    _id: subgoalId,
    title: "ABC",
    completedAt: new Date("2026-05-06T10:00:00.000Z")
  };

  assert.equal(hasSubgoalCompletedEvent(goal, subgoal), true);
});

test("hasSubgoalCompletedEvent falls back to title and timestamp for legacy logs", () => {
  const completedAt = new Date("2026-05-06T10:00:00.000Z");
  const goal = {
    title: "Goal A",
    activityLogs: [
      {
        action: "subgoal_completed",
        title: "ABC (Sub-goal in Goal A)",
        at: new Date("2026-05-06T10:00:00.500Z")
      }
    ]
  };
  const subgoal = {
    _id: new mongoose.Types.ObjectId(),
    title: "ABC",
    completedAt
  };

  assert.equal(hasSubgoalCompletedEvent(goal, subgoal), true);
});
