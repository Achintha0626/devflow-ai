const {
  createRequirement,
  listProjectRequirements,
  getRequirement,
  updateRequirement,
  deleteRequirement,
} = require("./requirement.service");
const { requirementFiltersSchema } = require("./requirement.validation");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const create = async (req, res) => {
  try {
    const requirement = await createRequirement({
      projectId: req.project.id,
      userId: req.user.id,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Requirement created successfully",
      data: requirement,
    });
  } catch (error) {
    return internalError(res, error);
  }
};

const list = async (req, res) => {
  const filters = requirementFiltersSchema.safeParse(req.query);
  if (!filters.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid requirement filters",
      errors: filters.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const requirements = await listProjectRequirements({
      projectId: req.project.id,
      ...filters.data,
    });
    return res.status(200).json({ success: true, data: requirements });
  } catch (error) {
    return internalError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const requirement = await getRequirement({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
    });

    if (!requirement) {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }

    return res.status(200).json({ success: true, data: requirement });
  } catch (error) {
    return internalError(res, error);
  }
};

const update = async (req, res) => {
  try {
    const requirement = await updateRequirement({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Requirement updated successfully",
      data: requirement,
    });
  } catch (error) {
    if (error.message === "REQUIREMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }
    return internalError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await deleteRequirement({
      projectId: req.project.id,
      requirementId: req.params.requirementId,
    });

    return res.status(200).json({
      success: true,
      message: "Requirement deleted successfully",
    });
  } catch (error) {
    if (error.message === "REQUIREMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Requirement not found" });
    }
    return internalError(res, error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
