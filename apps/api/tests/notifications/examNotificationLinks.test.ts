import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { examDetailLinkForRole } from "../../src/services/notifications/examNotificationLinks.js";

describe("examDetailLinkForRole", () => {
  it("maps roles to exam detail routes", () => {
    const examId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    assert.equal(examDetailLinkForRole("subject_teacher", examId), `/subject-teacher/exams/${examId}`);
    assert.equal(examDetailLinkForRole("class_teacher", examId), `/class-teacher/exams/${examId}`);
    assert.equal(examDetailLinkForRole("headteacher", examId), `/headteacher/exams/${examId}`);
    assert.equal(examDetailLinkForRole("admin", examId), `/admin/exams/${examId}`);
  });
});
