const {
  createProject,
  listWorkspaceProjects,
  getProject,
  updateProject,
  replaceProjectTechnologies,
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  deleteProject,
} = require("./project.service");
const { projectStatusSchema } = require("./project.validation");
const { invalidateProjectDashboard } = require("../../services/cache.service");

const internalError = (res, error) => {
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const create = async (req, res) => {
  try {
    const project = await createProject({
      workspaceId: req.params.workspaceId,
      userId: req.user.id,
      workspaceRole: req.workspaceMember.role,
      ...req.body,
    });
    return res.status(201).json({ success: true, message: "Project created successfully", data: project });
  } catch (error) {
    if (error.message === "PROJECT_KEY_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "Project key already exists in this workspace" });
    }
    return internalError(res, error);
  }
};

const list = async (req, res) => {
  const result = projectStatusSchema.optional().safeParse(req.query.status);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "Invalid project status filter" });
  }

  try {
    const projects = await listWorkspaceProjects({
      workspaceId: req.params.workspaceId,
      userId: req.user.id,
      workspaceRole: req.workspaceMember.role,
      status: result.data,
    });
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    return internalError(res, error);
  }
};

const getById = (req, res) => res.status(200).json({ success: true, data: req.project });

const update = async (req, res) => {
  try {
    const project = await updateProject({
      projectId: req.params.projectId,
      workspaceId: req.params.workspaceId,
      ...req.body,
    });
    return res.status(200).json({ success: true, message: "Project updated successfully", data: project });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    if (error.message === "INVALID_DATE_RANGE") {
      return res.status(400).json({ success: false, message: "Deadline cannot be earlier than startDate" });
    }
    return internalError(res, error);
  }
};

const replaceTechnologies = async (req, res) => {
  try {
    const technologies = await replaceProjectTechnologies({
      projectId: req.params.projectId,
      workspaceId: req.params.workspaceId,
      technologies: req.body.technologies,
    });
    return res.status(200).json({ success: true, message: "Project technologies updated successfully", data: technologies });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    return internalError(res, error);
  }
};

const addMember = async (req, res) => {
  try {
    const member = await addProjectMember({
      projectId: req.params.projectId,
      workspaceId: req.params.workspaceId,
      ...req.body,
    });
    await invalidateProjectDashboard(req.params.projectId);
    return res.status(201).json({ success: true, message: "Project member added successfully", data: member });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (error.message === "USER_NOT_WORKSPACE_MEMBER") {
      return res.status(400).json({ success: false, message: "User must belong to the workspace before joining the project" });
    }
    if (error.message === "PROJECT_MEMBER_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "User is already a project member" });
    }
    return internalError(res, error);
  }
};

const listMembers = async (req, res) => {
  try {
    const members = await listProjectMembers(req.params.projectId, req.params.workspaceId);
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    return internalError(res, error);
  }
};

const removeMember = async (req, res) => {
  try {
    const member = await removeProjectMember({
      projectId: req.params.projectId,
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
    });
    await invalidateProjectDashboard(req.params.projectId);
    return res.status(200).json({ success: true, message: "Project member removed successfully", data: member });
  } catch (error) {
    if (error.message === "PROJECT_MEMBER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project member not found" });
    }
    return internalError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await deleteProject({ projectId: req.params.projectId, workspaceId: req.params.workspaceId });
    await invalidateProjectDashboard(req.params.projectId);
    return res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    return internalError(res, error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  replaceTechnologies,
  addMember,
  listMembers,
  removeMember,
  remove,
};
