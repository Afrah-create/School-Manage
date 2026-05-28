import { maxLoginAttempts } from "../../src/middleware/accountLockout.js";

describe("accountLockout", () => {
  it("reads MAX_LOGIN_ATTEMPTS from env", () => {
    expect(maxLoginAttempts()).toBe(5);
  });
});
