const { getDashboardCached } = require("../../services/cache.service");

const get = async (req, res) => {
  try {
    const dashboard = await getDashboardCached({
      workspaceId: req.params.workspaceId,
      projectId: req.project.id,
    });
    return res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  get,
};
