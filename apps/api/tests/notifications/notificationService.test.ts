import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNotificationDeliveryPrefs } from "../../src/services/notifications/notificationService.js";
import {
  NOTIFICATION_CATEGORIES,
  isNotificationCategory,
} from "../../src/services/notifications/categories.js";

describe("notification preferences", () => {
  it("defaults both channels to enabled when no stored preference (opt-out model)", () => {
    assert.deepEqual(resolveNotificationDeliveryPrefs(null), {
      emailEnabled: true,
      inAppEnabled: true,
    });
    assert.deepEqual(resolveNotificationDeliveryPrefs(undefined), {
      emailEnabled: true,
      inAppEnabled: true,
    });
  });

  it("honours stored preference rows", () => {
    assert.deepEqual(
      resolveNotificationDeliveryPrefs({ email_enabled: false, in_app_enabled: true }),
      {
        emailEnabled: false,
        inAppEnabled: true,
      },
    );
  });
});

describe("notification categories", () => {
  it("defines v1 hook categories", () => {
    assert.deepEqual(NOTIFICATION_CATEGORIES, [
      "assessment_submitted",
      "exam_opened",
      "exam_marks_submitted",
      "exam_ready_to_close",
      "exam_closed",
    ]);
  });

  it("validates category strings", () => {
    assert.equal(isNotificationCategory("assessment_submitted"), true);
    assert.equal(isNotificationCategory("exam_opened"), true);
    assert.equal(isNotificationCategory("exam_marks_submitted"), true);
    assert.equal(isNotificationCategory("fee_invoice"), false);
  });
});
