const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createRequirementSchema,
  updateRequirementSchema,
} = require("../src/modules/requirement/requirement.validation");

const validRequirement = {
  title: "Product catalog",
  description: "Manage product listings.",
};

describe("requirement technology stack validation", () => {
  it("accepts existing requirement payloads without technologies", () => {
    assert.equal(createRequirementSchema.safeParse(validRequirement).success, true);
  });

  it("accepts multiple predefined and custom technologies", () => {
    const result = createRequirementSchema.safeParse({
      ...validRequirement,
      technologies: [
        { category: "Frontend", name: " React " },
        { category: "Backend", name: "Spring Boot" },
        { category: "Database", name: "MySQL" },
        { category: "Backend", name: "Custom service" },
      ],
    });

    assert.equal(result.success, true);
    assert.equal(result.data.technologies[0].name, "React");
  });

  it("accepts an empty stack to clear selections while editing", () => {
    assert.equal(updateRequirementSchema.safeParse({ technologies: [] }).success, true);
  });

  it("rejects unsupported categories, oversized stacks, and duplicate selections", () => {
    assert.equal(createRequirementSchema.safeParse({
      ...validRequirement,
      technologies: [{ category: "Mobile", name: "Flutter" }],
    }).success, false);
    assert.equal(createRequirementSchema.safeParse({
      ...validRequirement,
      technologies: Array.from({ length: 31 }, (_, index) => ({
        category: "Backend",
        name: `Technology ${index}`,
      })),
    }).success, false);
    assert.equal(createRequirementSchema.safeParse({
      ...validRequirement,
      technologies: [
        { category: "Frontend", name: "React" },
        { category: "Frontend", name: "react" },
      ],
    }).success, false);
  });
});
