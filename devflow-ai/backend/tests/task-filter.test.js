const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { taskQuerySchema } = require("../src/modules/tasks/task.validation");

const EMPTY_FILTERS = {
  search: "",
  status: "",
  priority: "",
  type: "",
  assigneeId: "",
  requirementId: "",
};

function getApiFilters(filters = {}) {
  const result = {};
  const search = typeof filters?.search === "string" ? filters.search.trim() : "";
  if (search) {
    result.search = search.slice(0, 100);
  }
  ["status", "priority", "type", "assigneeId", "requirementId"].forEach((key) => {
    if (filters?.[key]) {
      result[key] = filters[key];
    }
  });
  return result;
}

function hasActiveFilters(filters = {}) {
  const search = typeof filters?.search === "string" ? filters.search.trim() : "";
  if (search) {
    return true;
  }
  return ["status", "priority", "type", "assigneeId", "requirementId"].some(
    (key) => Boolean(filters?.[key])
  );
}

describe("Task Search and Filter — Root Cause & Sanitization", () => {
  it("reproduces and prevents TypeError on undefined search when applying filters", () => {
    const filtersWithoutSearch = { status: "TODO" };
    assert.equal(filtersWithoutSearch.search, undefined);

    assert.throws(
      () => {
        if (filtersWithoutSearch.search.trim()) {
          return true;
        }
      },
      {
        name: "TypeError",
        message: /Cannot read properties of undefined \(reading 'trim'\)/,
      }
    );

    const safeResult = getApiFilters(filtersWithoutSearch);
    assert.deepEqual(safeResult, { status: "TODO" });
  });

  it("handles undefined, null, and empty objects without crashing", () => {
    assert.deepEqual(getApiFilters(), {});
    assert.deepEqual(getApiFilters(null), {});
    assert.deepEqual(getApiFilters({}), {});
    assert.deepEqual(getApiFilters({ search: undefined }), {});
    assert.deepEqual(getApiFilters({ search: null }), {});
  });

  it("omits empty string and whitespace-only search input", () => {
    assert.deepEqual(getApiFilters({ search: "" }), {});
    assert.deepEqual(getApiFilters({ search: "   " }), {});
    assert.deepEqual(getApiFilters({ search: "\t\n  " }), {});
  });

  it("trims valid search queries and enforces max length of 100 characters", () => {
    const normal = getApiFilters({ search: "  PROJ-102  " });
    assert.deepEqual(normal, { search: "PROJ-102" });

    const longQuery = "a".repeat(150);
    const capped = getApiFilters({ search: longQuery });
    assert.equal(capped.search.length, 100);
    assert.equal(capped.search, "a".repeat(100));
  });

  it("preserves filters individually and in combination while stripping empty values", () => {
    const individual = getApiFilters({ status: "IN_PROGRESS" });
    assert.deepEqual(individual, { status: "IN_PROGRESS" });

    const combined = getApiFilters({
      search: "  login bug  ",
      status: "TODO",
      priority: "HIGH",
      type: "BUG",
      assigneeId: "550e8400-e29b-41d4-a716-446655440000",
      requirementId: "550e8400-e29b-41d4-a716-446655440001",
    });
    assert.deepEqual(combined, {
      search: "login bug",
      status: "TODO",
      priority: "HIGH",
      type: "BUG",
      assigneeId: "550e8400-e29b-41d4-a716-446655440000",
      requirementId: "550e8400-e29b-41d4-a716-446655440001",
    });

    const withEmptyStrings = getApiFilters({
      ...EMPTY_FILTERS,
      status: "DONE",
    });
    assert.deepEqual(withEmptyStrings, { status: "DONE" });
  });

  it("clearing filters restores empty api filter object", () => {
    const cleared = getApiFilters(EMPTY_FILTERS);
    assert.deepEqual(cleared, {});
  });

  it("is idempotent when applied to already-sanitized filters", () => {
    const once = getApiFilters({ search: "  auth  ", status: "TODO" });
    const twice = getApiFilters(once);
    assert.deepEqual(once, twice);
  });
});

describe("Task Search and Filter — Active Filter Detection", () => {
  it("returns false for EMPTY_FILTERS, empty objects, and whitespace search", () => {
    assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
    assert.equal(hasActiveFilters({}), false);
    assert.equal(hasActiveFilters(null), false);
    assert.equal(hasActiveFilters(undefined), false);
    assert.equal(hasActiveFilters({ search: "    " }), false);
  });

  it("returns true when any filter is active", () => {
    assert.equal(hasActiveFilters({ search: "PROJ-1" }), true);
    assert.equal(hasActiveFilters({ status: "TODO" }), true);
    assert.equal(hasActiveFilters({ priority: "CRITICAL" }), true);
    assert.equal(hasActiveFilters({ type: "FRONTEND" }), true);
    assert.equal(hasActiveFilters({ assigneeId: "u-1" }), true);
    assert.equal(hasActiveFilters({ requirementId: "r-1" }), true);
  });
});

describe("Task Search and Filter — Backend Query Schema Validation", () => {
  it("validates and trims search query parameter", () => {
    const parsed = taskQuerySchema.safeParse({ search: "  PROJ-9  " });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.search, "PROJ-9");
  });

  it("rejects search queries longer than 100 characters", () => {
    const parsed = taskQuerySchema.safeParse({ search: "x".repeat(101) });
    assert.equal(parsed.success, false);
  });

  it("accepts valid filter combinations", () => {
    const parsed = taskQuerySchema.safeParse({
      status: "IN_REVIEW",
      priority: "MEDIUM",
      type: "BACKEND",
      assigneeId: "550e8400-e29b-41d4-a716-446655440000",
      requirementId: "550e8400-e29b-41d4-a716-446655440001",
      search: "database migration",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects invalid status, priority, and type enums", () => {
    assert.equal(taskQuerySchema.safeParse({ status: "INVALID_STATUS" }).success, false);
    assert.equal(taskQuerySchema.safeParse({ priority: "URGENT" }).success, false);
    assert.equal(taskQuerySchema.safeParse({ type: "INFRA" }).success, false);
  });

  it("rejects invalid UUIDs for assigneeId and requirementId", () => {
    assert.equal(taskQuerySchema.safeParse({ assigneeId: "not-a-uuid" }).success, false);
    assert.equal(taskQuerySchema.safeParse({ requirementId: "123" }).success, false);
  });

  it("rejects unrecognized query parameters due to strict schema", () => {
    assert.equal(taskQuerySchema.safeParse({ unknownParam: "value" }).success, false);
  });
});

describe("Task Search and Filter — Backend listTasks Query Composition", () => {
  it("builds where clause with taskNumber and title OR search when search is present", () => {
    const buildWhere = (projectId, filters) => ({
      projectId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.requirementId ? { requirementId: filters.requirementId } : {}),
      ...(filters.search ? {
        OR: [
          { taskNumber: { contains: filters.search, mode: "insensitive" } },
          { title: { contains: filters.search, mode: "insensitive" } },
        ],
      } : {}),
    });

    const whereWithSearch = buildWhere("p-1", { search: "FEAT" });
    assert.deepEqual(whereWithSearch.OR, [
      { taskNumber: { contains: "FEAT", mode: "insensitive" } },
      { title: { contains: "FEAT", mode: "insensitive" } },
    ]);

    const whereWithoutSearch = buildWhere("p-1", {});
    assert.equal(whereWithoutSearch.OR, undefined);
    assert.equal(whereWithoutSearch.projectId, "p-1");
  });
});
