const {
  createWorkspace,
  listUserWorkspaces,
  getUserWorkspace,
} = require("./workspace.service");

const create = async (req, res) => {
  try {
    const data = await createWorkspace({
      ...req.body,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const list = async (req, res) => {
  try {
    const workspaces = await listUserWorkspaces(req.user.id);
    return res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getById = async (req, res) => {
  try {
    const data = await getUserWorkspace({ workspaceId: req.params.workspaceId, userId: req.user.id });

    if (!data) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const adminCheck = (req, res) => res.status(200).json({
  success: true,
  message: "ADMIN workspace access granted",
});

module.exports = {
  create,
  list,
  getById,
  adminCheck,
};