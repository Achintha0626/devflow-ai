import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addCustomTechnologies,
  areTechnologyStacksEqual,
  getCustomTechnologyError,
  TECHNOLOGY_CATEGORIES,
  toggleTechnology,
} from "../src/components/requirements/technologyStackUtils.js";

describe("requirement technology stack helpers", () => {
  it("provides the requested choices in all three categories", () => {
    assert.deepEqual(TECHNOLOGY_CATEGORIES.map(({ name }) => name), ["Frontend", "Backend", "Database"]);
    assert.ok(TECHNOLOGY_CATEGORIES[0].options.includes("React Native"));
    assert.ok(TECHNOLOGY_CATEGORIES[1].options.includes("Spring Boot"));
    assert.ok(TECHNOLOGY_CATEGORIES[2].options.includes("PostgreSQL"));
  });

  it("adds and removes a selected technology", () => {
    const selected = toggleTechnology([], "Frontend", "React");
    assert.deepEqual(selected, [{ category: "Frontend", name: "React" }]);
    assert.deepEqual(toggleTechnology(selected, "Frontend", "React"), []);
  });

  it("adds custom comma-separated options without case-insensitive duplicates", () => {
    const selected = addCustomTechnologies([], "Backend", " NestJS, Go, nestjs ");
    assert.deepEqual(selected, [
      { category: "Backend", name: "NestJS" },
      { category: "Backend", name: "Go" },
    ]);
  });

  it("validates custom technology names and the total selection limit", () => {
    assert.match(getCustomTechnologyError([], "Backend", "x".repeat(81)), /80 characters/);
    assert.match(getCustomTechnologyError(
      Array.from({ length: 30 }, (_, index) => ({ category: "Backend", name: `Technology ${index}` })),
      "Backend",
      "New technology"
    ), /no more than 30/);
    assert.equal(getCustomTechnologyError([], "Backend", "NestJS, Go"), "");
  });

  it("compares stacks independent of selection ordering and casing", () => {
    assert.equal(areTechnologyStacksEqual(
      [{ category: "Frontend", name: "React" }, { category: "Backend", name: "Go" }],
      [{ category: "Backend", name: "go" }, { category: "Frontend", name: "react" }]
    ), true);
  });
});
