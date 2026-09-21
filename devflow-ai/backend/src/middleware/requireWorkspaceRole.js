const requireWorkspaceRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!req.workspaceMember) {
    return res.status(403).json({ success: false, message: "Workspace membership required" });
  }

  if (!allowedRoles.includes(req.workspaceMember.role)) {
    return res.status(403).json({ success: false, message: "Insufficient workspace permissions" });
  }

  return next();
};

module.exports = requireWorkspaceRole;