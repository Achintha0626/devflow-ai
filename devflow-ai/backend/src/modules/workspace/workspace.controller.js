const {
  createWorkspace,
  listUserWorkspaces,
  getUserWorkspace,
  addWorkspaceMember,
  listWorkspaceMembers,
  changeWorkspaceMemberRole,
  removeWorkspaceMember,
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

const addMember = async (req, res) => {
  try {
    const member = await addWorkspaceMember({
      workspaceId: req.params.workspaceId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Workspace member added successfully",
      data: member,
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Registered user not found" });
    }
    if (error.message === "MEMBER_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "User is already a workspace member" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listMembers = async (req, res) => {
  try {
    const members = await listWorkspaceMembers(req.params.workspaceId);
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const changeMemberRole = async (req, res) => {
  try {
    const member = await changeWorkspaceMemberRole({
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
      role: req.body.role,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace member role updated successfully",
      data: member,
    });
  } catch (error) {
    if (error.message === "MEMBER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Workspace member not found" });
    }
    if (error.message === "CANNOT_DEMOTE_WORKSPACE_CREATOR") {
      return res.status(409).json({ success: false, message: "Workspace creator must remain an Administrator" });
    }
    if (error.message === "LAST_ADMIN") {
      return res.status(409).json({ success: false, message: "A workspace must have at least one ADMIN" });
    }
    if (error.message === "TRANSACTION_CONFLICT") {
      return res.status(409).json({ success: false, message: "Workspace membership changed concurrently; please retry" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const removeMember = async (req, res) => {
  try {
    const member = await removeWorkspaceMember({
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace member removed successfully",
      data: member,
    });
  } catch (error) {
    if (error.message === "MEMBER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Workspace member not found" });
    }
    if (error.message === "CANNOT_REMOVE_WORKSPACE_CREATOR") {
      return res.status(409).json({ success: false, message: "Workspace creator cannot be removed from the workspace" });
    }
    if (error.message === "LAST_ADMIN") {
      return res.status(409).json({ success: false, message: "A workspace must have at least one ADMIN" });
    }
    if (error.message === "TRANSACTION_CONFLICT") {
      return res.status(409).json({ success: false, message: "Workspace membership changed concurrently; please retry" });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  create,
  list,
  getById,
  adminCheck,
  addMember,
  listMembers,
  changeMemberRole,
  removeMember,
};