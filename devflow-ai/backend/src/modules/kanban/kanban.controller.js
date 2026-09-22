const { getBoard } = require("./kanban.service");
const { kanbanFiltersSchema } = require("./kanban.validation");

const get = async (req, res) => {
  const filters = kanbanFiltersSchema.safeParse(req.query);
  if (!filters.success) {
    return res.status(400).json({ success: false, message: "Invalid Kanban filters" });
  }

  try {
    const board = await getBoard({
      projectId: req.project.id,
      filters: filters.data,
      sprintId: req.params.sprintId || filters.data.sprintId,
    });
    return res.status(200).json({ success: true, data: board });
  } catch (error) {
    if (error.message === "SPRINT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Sprint not found" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  get,
};
