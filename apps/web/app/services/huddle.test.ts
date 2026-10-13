import { afterEach, describe, expect, it } from "vitest";
import { huddleService } from "./huddle";

afterEach(() => huddleService.leaveHuddle());

describe("mock huddle service", () => {
  it("allows only one screen share and revokes editing when sharing stops", () => {
    huddleService.startHuddle({ name: "Alex", avatar: "" });

    expect(huddleService.startScreenShare("you")).toBe(true);
    expect(huddleService.startScreenShare("sarah")).toBe(false);

    huddleService.grantControl("sarah", "edit");
    expect(huddleService.getSnapshot().controlGrant?.permission).toBe("edit");

    huddleService.stopScreenShare("you");
    expect(huddleService.getSnapshot().sharerId).toBeNull();
    expect(huddleService.getSnapshot().controlGrant).toBeNull();
  });
});
