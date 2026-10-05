import { describe, expect, it } from "vitest";
import { FindController } from "./FindController";

describe("FindController", () => {
  it("moves the active match in both directions and wraps", () => {
    const controller = new FindController();
    const first = controller.search("div\ndon\ndanny", "d");

    expect(first.matches.map((match) => match.start)).toEqual([0, 4, 8]);
    expect(first.index).toBe(0);
    expect(controller.next().index).toBe(1);
    expect(controller.next().index).toBe(2);
    expect(controller.next().index).toBe(0);
    expect(controller.prev().index).toBe(2);
  });

  it("starts at the first match at or after the editor cursor", () => {
    const controller = new FindController();

    expect(controller.search("d\nd\nd", "d", 2).index).toBe(1);
  });

  it("supports case, whole-word, and regular-expression options", () => {
    const controller = new FindController();
    controller.toggleCase();
    expect(controller.search("Div div", "div").matches).toHaveLength(1);

    controller.toggleCase();
    controller.toggleWord();
    expect(controller.search("div divider", "div").matches).toHaveLength(1);

    controller.toggleWord();
    controller.toggleRegex();
    expect(controller.search("div div", "(d)(iv)").matches[0]?.groups).toEqual([
      "d",
      "iv",
    ]);
    expect(controller.search("div", "(").error).toBe(
      "Invalid regular expression.",
    );
  });

  it("replaces the current and all matches, expanding regex captures", () => {
    const controller = new FindController();
    controller.toggleRegex();
    controller.search("ab ab", "(a)(b)");

    expect(controller.replace("ab ab", "$2$1")).toBe("ba ab");
    controller.search("ab ab", "(a)(b)");
    expect(controller.replaceAll("ab ab", "$2$1")).toBe("ba ba");
  });

  it("limits matching to a selected range", () => {
    const controller = new FindController();
    controller.setSelection({ start: 2, end: 5 });

    expect(
      controller.search("d d d d", "d").matches.map((m) => m.start),
    ).toEqual([2, 4]);
  });
});
