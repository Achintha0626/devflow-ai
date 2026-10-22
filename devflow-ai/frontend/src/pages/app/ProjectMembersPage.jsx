import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  addProjectMemberRequest,
  changeProjectMemberRoleRequest,
  listProjectMembersRequest,
  removeProjectMemberRequest,
} from "../../api/projectApi";
import { listWorkspaceMembersRequest } from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import {
  AlertCircleIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
} from "../../components/icons";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errorUtils";
import "./ProjectMembers.css";
import "./NavigationPages.css";

function formatMemberName(member) {
  if (!member) return "Unnamed member";
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return name || member.email || "Unnamed member";
}

function formatMemberDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getMemberRoleBadge(role) {
  switch (role) {
    case "PROJECT_MANAGER":
      return {
        label: "Project Manager",
        className: "project-role-badge project-role-badge--pm",
      };
    case "DEVELOPER":
      return {
        label: "Developer",
        className: "project-role-badge project-role-badge--dev",
      };
    case "QA":
      return {
        label: "QA Engineer",
        className: "project-role-badge project-role-badge--qa",
      };
    default:
      return {
        label: (role || "Member").replaceAll("_", " "),
        className: "project-role-badge",
      };
  }
}

export function ProjectMembersPage() {
  const { workspaceId, projectId } = useParams();
  const { workspace, project, membership } = useOutletContext();
  const { user } = useAuth();

  const [projectMembers, setProjectMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("DEVELOPER");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState(null);

  const [roleModalMember, setRoleModalMember] = useState(null);
  const [newRole, setNewRole] = useState("DEVELOPER");
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleError, setRoleError] = useState(null);

  const [removeModalMember, setRemoveModalMember] = useState(null);
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setIsLoading(true);
      setError(null);
      try {
        const [projMembersRes, wsMembersRes] = await Promise.all([
          listProjectMembersRequest(workspaceId, projectId),
          listWorkspaceMembersRequest(workspaceId),
        ]);
        if (active) {
          setProjectMembers(projMembersRes.data || []);
          setWorkspaceMembers(wsMembersRes.data || []);
        }
      } catch (err) {
        if (active) {
          setError(err);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadMembers();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, reloadKey]);

  const isWorkspaceAdmin = membership?.role === "ADMIN";
  const isWorkspaceProjectManager = membership?.role === "PROJECT_MANAGER";
  const canAddMembers = isWorkspaceAdmin || isWorkspaceProjectManager;
  const canChangeRole = isWorkspaceAdmin || isWorkspaceProjectManager;
  const canRemoveMembers = isWorkspaceAdmin;

  const availableWorkspaceMembers = useMemo(() => {
    const projectUserIds = new Set(projectMembers.map((m) => m.userId));
    return workspaceMembers.filter((wm) => !projectUserIds.has(wm.userId));
  }, [projectMembers, workspaceMembers]);

  const handleOpenAddModal = useCallback(() => {
    if (!canAddMembers) return;
    setAddUserId("");
    setAddRole("DEVELOPER");
    setAddError(null);
    setIsAddOpen(true);
  }, [canAddMembers]);

  const handleCloseAddModal = useCallback(() => {
    if (isSubmittingAdd) return;
    setIsAddOpen(false);
    setAddUserId("");
    setAddRole("DEVELOPER");
    setAddError(null);
  }, [isSubmittingAdd]);

  const handleOpenRoleModal = useCallback(
    (member) => {
      if (!canChangeRole) return;
      setRoleModalMember(member);
      if (!isWorkspaceAdmin && member.role === "PROJECT_MANAGER") {
        setNewRole("DEVELOPER");
      } else {
        setNewRole(member.role || "DEVELOPER");
      }
      setRoleError(null);
    },
    [canChangeRole, isWorkspaceAdmin]
  );

  const handleCloseRoleModal = useCallback(() => {
    if (isSubmittingRole) return;
    setRoleModalMember(null);
    setRoleError(null);
  }, [isSubmittingRole]);

  const handleOpenRemoveModal = useCallback(
    (member) => {
      if (!canRemoveMembers) return;
      setRemoveModalMember(member);
      setRemoveError(null);
    },
    [canRemoveMembers]
  );

  const handleCloseRemoveModal = useCallback(() => {
    if (isSubmittingRemove) return;
    setRemoveModalMember(null);
    setRemoveError(null);
  }, [isSubmittingRemove]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (isAddOpen && !isSubmittingAdd) {
          handleCloseAddModal();
        } else if (roleModalMember && !isSubmittingRole) {
          handleCloseRoleModal();
        } else if (removeModalMember && !isSubmittingRemove) {
          handleCloseRemoveModal();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isAddOpen,
    isSubmittingAdd,
    roleModalMember,
    isSubmittingRole,
    removeModalMember,
    isSubmittingRemove,
    handleCloseAddModal,
    handleCloseRoleModal,
    handleCloseRemoveModal,
  ]);

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!canAddMembers) {
      setAddError("You are not authorized to add project members.");
      return;
    }
    if (!addUserId) {
      setAddError("Please select a user to add.");
      return;
    }
    if (!isWorkspaceAdmin && addRole === "PROJECT_MANAGER") {
      setAddError("Project managers cannot assign the Project Manager role.");
      return;
    }

    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      await addProjectMemberRequest(workspaceId, projectId, {
        userId: addUserId,
        role: addRole,
      });
      setIsAddOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setAddError(getErrorMessage(err, "Failed to add member to project."));
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSubmitRoleChange = async (e) => {
    e.preventDefault();
    if (!canChangeRole || !roleModalMember) {
      setRoleError("You are not authorized to change member roles.");
      return;
    }
    if (!isWorkspaceAdmin && newRole === "PROJECT_MANAGER") {
      setRoleError("Project managers cannot assign the Project Manager role.");
      return;
    }

    setIsSubmittingRole(true);
    setRoleError(null);
    try {
      await changeProjectMemberRoleRequest(
        workspaceId,
        projectId,
        roleModalMember.membershipId,
        { role: newRole }
      );
      setRoleModalMember(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setRoleError(getErrorMessage(err, "Failed to update member role."));
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleSubmitRemove = async (e) => {
    e.preventDefault();
    if (!canRemoveMembers || !removeModalMember) {
      setRemoveError("Only workspace administrators can remove project members.");
      return;
    }

    setIsSubmittingRemove(true);
    setRemoveError(null);
    try {
      await removeProjectMemberRequest(
        workspaceId,
        projectId,
        removeModalMember.membershipId
      );
      setRemoveModalMember(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setRemoveError(getErrorMessage(err, "Failed to remove member from project."));
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  const stats = useMemo(() => {
    const total = projectMembers.length;
    const managers = projectMembers.filter((m) => m.role === "PROJECT_MANAGER").length;
    const devs = projectMembers.filter((m) => m.role === "DEVELOPER").length;
    const qas = projectMembers.filter((m) => m.role === "QA").length;
    return { total, managers, devs, qas };
  }, [projectMembers]);

  const filteredMembers = useMemo(() => {
    return projectMembers.filter((m) => {
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
      const email = (m.email || "").toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [projectMembers, roleFilter, searchQuery]);

  if (isLoading) {
    return <LoadingState label="Loading project members…" />;
  }

  if (error) {
    return (
      <div className="project-members">
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((k) => k + 1)}
          backTo={`/app/workspaces/${workspaceId}/projects/${projectId}`}
          backLabel="Back to overview"
        />
      </div>
    );
  }

  return (
    <div className="project-members">
      <header className="project-members__header">
        <div className="project-members__title-group">
          <p className="navigation-page__eyebrow">TEAM &amp; ACCESS</p>
          <h1>Project Members</h1>
          <p className="project-members__description">
            Manage contributors, assign development and QA responsibilities, and control project management permissions for {project?.name}.
          </p>
        </div>
        <div className="project-members__header-actions">
          <button
            type="button"
            className="project-members__btn project-members__btn--secondary"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={isLoading}
            aria-label="Refresh project members list"
          >
            <RefreshIcon size={14} className={isLoading ? "is-spinning" : ""} />
            <span>Refresh</span>
          </button>
          {canAddMembers && (
            <button
              type="button"
              className="project-members__btn project-members__btn--primary"
              onClick={handleOpenAddModal}
            >
              <PlusIcon size={14} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </header>

      <section className="project-members__stats" aria-label="Project members statistics">
        <article className="project-members__stat-card">
          <div className="project-members__stat-top">
            <h2>Total Members</h2>
            <span className="project-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="project-members__stat-value">{stats.total}</p>
          <p className="project-members__stat-detail">Assigned to this project</p>
        </article>

        <article className="project-members__stat-card">
          <div className="project-members__stat-top">
            <h2>Project Managers</h2>
            <span className="project-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="project-members__stat-value">{stats.managers}</p>
          <p className="project-members__stat-detail">Management and admin access</p>
        </article>

        <article className="project-members__stat-card">
          <div className="project-members__stat-top">
            <h2>Developers</h2>
            <span className="project-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="project-members__stat-value">{stats.devs}</p>
          <p className="project-members__stat-detail">Engineering contributors</p>
        </article>

        <article className="project-members__stat-card">
          <div className="project-members__stat-top">
            <h2>QA Engineers</h2>
            <span className="project-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="project-members__stat-value">{stats.qas}</p>
          <p className="project-members__stat-detail">Quality assurance &amp; testing</p>
        </article>
      </section>

      <div className="project-members__toolbar">
        <div className="project-members__search-box">
          <SearchIcon size={15} className="project-members__search-icon" />
          <input
            type="search"
            className="project-members__search-input"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search members"
          />
          {searchQuery && (
            <button
              type="button"
              className="project-members__search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <div className="project-members__filters" role="group" aria-label="Filter by role">
          <button
            type="button"
            className={`project-members__filter-pill ${roleFilter === "ALL" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("ALL")}
          >
            All Roles ({stats.total})
          </button>
          <button
            type="button"
            className={`project-members__filter-pill ${roleFilter === "PROJECT_MANAGER" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("PROJECT_MANAGER")}
          >
            Managers ({stats.managers})
          </button>
          <button
            type="button"
            className={`project-members__filter-pill ${roleFilter === "DEVELOPER" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("DEVELOPER")}
          >
            Developers ({stats.devs})
          </button>
          <button
            type="button"
            className={`project-members__filter-pill ${roleFilter === "QA" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("QA")}
          >
            QA ({stats.qas})
          </button>
        </div>
      </div>

      <div className="project-members__table-wrapper">
        {filteredMembers.length === 0 ? (
          <div className="project-members__empty">
            <div className="project-members__empty-icon">
              <UserIcon size={24} />
            </div>
            <h3>No members found</h3>
            <p>
              {projectMembers.length === 0
                ? "No members have been assigned to this project yet."
                : "No project members match your active search and filter criteria."}
            </p>
            {projectMembers.length === 0 && canAddMembers && (
              <button
                type="button"
                className="project-members__btn project-members__btn--primary"
                onClick={handleOpenAddModal}
                style={{ marginTop: "0.5rem" }}
              >
                <PlusIcon size={14} />
                <span>Add First Member</span>
              </button>
            )}
          </div>
        ) : (
          <table className="project-members__table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {(canChangeRole || canRemoveMembers) && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const memberName = formatMemberName(member);
                const initial = memberName.charAt(0).toUpperCase() || "U";
                const isCurrentUser = member.userId === user?.id;
                const badge = getMemberRoleBadge(member.role);

                return (
                  <tr key={member.membershipId}>
                    <td data-label="Member">
                      <div className="project-members__user-cell">
                        <div className="project-members__avatar" aria-hidden="true">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="" />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div className="project-members__user-info">
                          <div className="project-members__user-name-row">
                            <span className="project-members__user-name">{memberName}</span>
                            {isCurrentUser && (
                              <span className="project-members__you-badge">You</span>
                            )}
                          </div>
                          <span className="project-members__user-email">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Email">
                      <span>{member.email}</span>
                    </td>
                    <td data-label="Role">
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td data-label="Joined">
                      <span>{formatMemberDate(member.joinedAt)}</span>
                    </td>
                    {(canChangeRole || canRemoveMembers) && (
                      <td data-label="Actions">
                        <div className="project-members__actions-cell">
                          {canChangeRole && (
                            <button
                              type="button"
                              className="project-members__action-btn"
                              onClick={() => handleOpenRoleModal(member)}
                              title="Change member role"
                            >
                              <EditIcon size={13} />
                              <span>Role</span>
                            </button>
                          )}
                          {canRemoveMembers && (
                            <button
                              type="button"
                              className="project-members__action-btn project-members__action-btn--danger"
                              onClick={() => handleOpenRemoveModal(member)}
                              title="Remove from project"
                            >
                              <TrashIcon size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {canAddMembers && isAddOpen && (
        <div className="workspace-modal-backdrop" onClick={handleCloseAddModal}>
          <div
            className="workspace-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
          >
            <div className="workspace-modal__header">
              <div>
                <h2 id="add-member-title">Add Project Member</h2>
                <p>Select a workspace member and assign their role in {project?.name}.</p>
              </div>
              <button
                type="button"
                className="workspace-modal__close"
                onClick={handleCloseAddModal}
                disabled={isSubmittingAdd}
                aria-label="Close modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {addError && (
              <div className="workspace-form__error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{addError}</span>
              </div>
            )}

            {availableWorkspaceMembers.length === 0 ? (
              <div className="project-members__empty" style={{ padding: "1.5rem 0" }}>
                <p>
                  All members of workspace <strong>{workspace?.name}</strong> are already assigned to this project.
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  To add new team members, invite them to the workspace first.
                </p>
                <div className="workspace-modal__actions" style={{ width: "100%", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="navigation-button navigation-button--quiet"
                    onClick={handleCloseAddModal}
                  >
                    Close
                  </button>
                  <Link
                    to={`/app/workspaces/${workspaceId}/members`}
                    className="navigation-button navigation-button--primary"
                  >
                    Manage Workspace Members
                  </Link>
                </div>
              </div>
            ) : (
              <form className="workspace-form" onSubmit={handleSubmitAdd}>
                <div className="workspace-form__field">
                  <label htmlFor="member-user-select">
                    <span>Workspace Member</span>
                    <span className="workspace-form__required">*</span>
                  </label>
                  <select
                    id="member-user-select"
                    className="project-members__select"
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    disabled={isSubmittingAdd}
                    required
                  >
                    <option value="" disabled>Select a workspace member</option>
                    {availableWorkspaceMembers.map((wm) => {
                      const name = formatMemberName(wm);
                      return (
                        <option key={wm.userId} value={wm.userId}>
                          {name} — {wm.email} ({wm.role})
                        </option>
                      );
                    })}
                  </select>
                  <span className="workspace-form__hint" style={{ marginTop: "0.25rem", fontSize: "0.78rem" }}>
                    Need to add someone new?{" "}
                    <Link
                      to={`/app/workspaces/${workspaceId}/members`}
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      Manage Workspace Members
                    </Link>
                  </span>
                </div>

                <div className="workspace-form__field">
                  <label>
                    <span>Project Role</span>
                    <span className="workspace-form__required">*</span>
                  </label>
                  <div className="project-members__role-options">
                    <label
                      className={`project-members__role-option ${
                        addRole === "DEVELOPER" ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="project-role"
                        className="project-members__role-radio"
                        value="DEVELOPER"
                        checked={addRole === "DEVELOPER"}
                        onChange={() => setAddRole("DEVELOPER")}
                        disabled={isSubmittingAdd}
                      />
                      <div className="project-members__role-option-content">
                        <span className="project-members__role-option-title">Developer</span>
                        <span className="project-members__role-option-desc">
                          Can work on assigned tasks, update sprint progress, and contribute to requirements.
                        </span>
                      </div>
                    </label>

                    {isWorkspaceAdmin && (
                      <label
                        className={`project-members__role-option ${
                          addRole === "PROJECT_MANAGER" ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="project-role"
                          className="project-members__role-radio"
                          value="PROJECT_MANAGER"
                          checked={addRole === "PROJECT_MANAGER"}
                          onChange={() => setAddRole("PROJECT_MANAGER")}
                          disabled={isSubmittingAdd}
                        />
                        <div className="project-members__role-option-content">
                          <span className="project-members__role-option-title">Project Manager</span>
                          <span className="project-members__role-option-desc">
                            Full management access: add/remove members, update project settings, and manage sprints.
                          </span>
                        </div>
                      </label>
                    )}

                    <label
                      className={`project-members__role-option ${
                        addRole === "QA" ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="project-role"
                        className="project-members__role-radio"
                        value="QA"
                        checked={addRole === "QA"}
                        onChange={() => setAddRole("QA")}
                        disabled={isSubmittingAdd}
                      />
                      <div className="project-members__role-option-content">
                        <span className="project-members__role-option-title">Quality Assurance (QA)</span>
                        <span className="project-members__role-option-desc">
                          Focuses on testing tasks, reviewing acceptance criteria, and verifying deliverables.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="workspace-modal__actions">
                  <button
                    type="button"
                    className="navigation-button navigation-button--quiet"
                    onClick={handleCloseAddModal}
                    disabled={isSubmittingAdd}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="navigation-button navigation-button--primary"
                    disabled={isSubmittingAdd || !addUserId || (!isWorkspaceAdmin && addRole === "PROJECT_MANAGER")}
                  >
                    {isSubmittingAdd ? "Adding Member…" : "Add Member"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {canChangeRole && roleModalMember && (
        <div className="workspace-modal-backdrop" onClick={handleCloseRoleModal}>
          <div
            className="workspace-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
          >
            <div className="workspace-modal__header">
              <div>
                <h2 id="role-modal-title">Change Project Role</h2>
                <p>Update project role and permissions for this member.</p>
              </div>
              <button
                type="button"
                className="workspace-modal__close"
                onClick={handleCloseRoleModal}
                disabled={isSubmittingRole}
                aria-label="Close modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {roleError && (
              <div className="workspace-form__error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{roleError}</span>
              </div>
            )}

            <div className="project-members__modal-user-summary">
              <div className="project-members__avatar" aria-hidden="true">
                {roleModalMember.avatarUrl ? (
                  <img src={roleModalMember.avatarUrl} alt="" />
                ) : (
                  <span>{formatMemberName(roleModalMember).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="project-members__user-info">
                <span className="project-members__user-name">
                  {formatMemberName(roleModalMember)}
                </span>
                <span className="project-members__user-email">{roleModalMember.email}</span>
              </div>
            </div>

            {roleModalMember.userId === user?.id && roleModalMember.role === "PROJECT_MANAGER" && newRole !== "PROJECT_MANAGER" && (
              <div className="project-members__warning-box">
                <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Notice: Changing your own role from Project Manager will update your project assignment.
                </span>
              </div>
            )}

            <form className="workspace-form" onSubmit={handleSubmitRoleChange}>
              <div className="workspace-form__field">
                <label>
                  <span>Select New Role</span>
                  <span className="workspace-form__required">*</span>
                </label>
                <div className="project-members__role-options">
                  <label
                    className={`project-members__role-option ${
                      newRole === "DEVELOPER" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="project-members__role-radio"
                      value="DEVELOPER"
                      checked={newRole === "DEVELOPER"}
                      onChange={() => setNewRole("DEVELOPER")}
                      disabled={isSubmittingRole}
                    />
                    <div className="project-members__role-option-content">
                      <span className="project-members__role-option-title">Developer</span>
                      <span className="project-members__role-option-desc">
                        Engineering contributor working on tasks and sprints.
                      </span>
                    </div>
                  </label>

                  {isWorkspaceAdmin && (
                    <label
                      className={`project-members__role-option ${
                        newRole === "PROJECT_MANAGER" ? "is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="update-role"
                        className="project-members__role-radio"
                        value="PROJECT_MANAGER"
                        checked={newRole === "PROJECT_MANAGER"}
                        onChange={() => setNewRole("PROJECT_MANAGER")}
                        disabled={isSubmittingRole}
                      />
                      <div className="project-members__role-option-content">
                        <span className="project-members__role-option-title">Project Manager</span>
                        <span className="project-members__role-option-desc">
                          Full member and project administration permissions.
                        </span>
                      </div>
                    </label>
                  )}

                  <label
                    className={`project-members__role-option ${
                      newRole === "QA" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="project-members__role-radio"
                      value="QA"
                      checked={newRole === "QA"}
                      onChange={() => setNewRole("QA")}
                      disabled={isSubmittingRole}
                    />
                    <div className="project-members__role-option-content">
                      <span className="project-members__role-option-title">Quality Assurance (QA)</span>
                      <span className="project-members__role-option-desc">
                        Testing, quality verification, and bug tracking.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="workspace-modal__actions">
                <button
                  type="button"
                  className="navigation-button navigation-button--quiet"
                  onClick={handleCloseRoleModal}
                  disabled={isSubmittingRole}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="navigation-button navigation-button--primary"
                  disabled={
                    isSubmittingRole ||
                    newRole === roleModalMember.role ||
                    (!isWorkspaceAdmin && newRole === "PROJECT_MANAGER")
                  }
                >
                  {isSubmittingRole ? "Updating…" : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canRemoveMembers && removeModalMember && (
        <div className="workspace-modal-backdrop" onClick={handleCloseRemoveModal}>
          <div
            className="workspace-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-modal-title"
          >
            <div className="workspace-modal__header">
              <div>
                <h2 id="remove-modal-title">Remove Project Member</h2>
                <p>Are you sure you want to remove this member from the project?</p>
              </div>
              <button
                type="button"
                className="workspace-modal__close"
                onClick={handleCloseRemoveModal}
                disabled={isSubmittingRemove}
                aria-label="Close modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {removeError && (
              <div className="workspace-form__error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{removeError}</span>
              </div>
            )}

            <div className="project-members__modal-user-summary">
              <div className="project-members__avatar" aria-hidden="true">
                {removeModalMember.avatarUrl ? (
                  <img src={removeModalMember.avatarUrl} alt="" />
                ) : (
                  <span>{formatMemberName(removeModalMember).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="project-members__user-info">
                <span className="project-members__user-name">
                  {formatMemberName(removeModalMember)}
                </span>
                <span className="project-members__user-email">{removeModalMember.email}</span>
              </div>
            </div>

            <div className="project-members__warning-box">
              <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <span>
                  This user will immediately lose access to {project?.name}&apos;s tasks, kanban, sprints, and requirements.
                </span>
                {removeModalMember.userId === user?.id && (
                  <p style={{ marginTop: "0.35rem", fontWeight: 650 }}>
                    Warning: You are about to remove yourself from this project.
                  </p>
                )}
              </div>
            </div>

            <form className="workspace-form" onSubmit={handleSubmitRemove}>
              <div className="workspace-modal__actions">
                <button
                  type="button"
                  className="navigation-button navigation-button--quiet"
                  onClick={handleCloseRemoveModal}
                  disabled={isSubmittingRemove}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="project-members__btn project-members__btn--danger"
                  disabled={isSubmittingRemove}
                >
                  {isSubmittingRemove ? "Removing…" : "Remove Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
