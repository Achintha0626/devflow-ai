const requireProjectManagement = (req, res, next) => {
  if (!req.user || !req.workspaceMember || !req.project) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const hasManagementAccess = ["ADMIN", "PROJECT_MANAGER"].includes(req.workspaceMember.role)
    || req.projectMember?.role === "PROJECT_MANAGER";

  if (!hasManagementAccess) {
    return res.status(403).json({ success: false, message: "Project management permissions required" });
  }

  return next();
};

module.exports = requireProjectManagement;
