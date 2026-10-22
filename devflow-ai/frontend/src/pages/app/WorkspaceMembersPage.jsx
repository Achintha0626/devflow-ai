import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addWorkspaceMemberRequest,
  changeWorkspaceMemberRoleRequest,
  getWorkspaceRequest,
  listWorkspaceMembersRequest,
  removeWorkspaceMemberRequest,
} from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
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
import "./WorkspaceMembers.css";
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

function getWorkspaceRoleBadge(role) {
  switch (role) {
    case "ADMIN":
      return {
        label: "Administrator",
        className: "workspace-role-badge workspace-role-badge--admin",
      };
    case "PROJECT_MANAGER":
      return {
        label: "Project Manager",
        className: "workspace-role-badge workspace-role-badge--pm",
      };
    case "DEVELOPER":
      return {
        label: "Developer",
        className: "workspace-role-badge workspace-role-badge--dev",
      };
    case "QA":
      return {
        label: "QA Engineer",
        className: "workspace-role-badge workspace-role-badge--qa",
      };
    default:
      return {
        label: (role || "Member").replaceAll("_", " "),
        className: "workspace-role-badge",
      };
  }
}

export function WorkspaceMembersPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
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

    async function loadWorkspaceData() {
      setIsLoading(true);
      setError(null);
      try {
        const [wsRes, membersRes] = await Promise.all([
          getWorkspaceRequest(workspaceId),
          listWorkspaceMembersRequest(workspaceId),
        ]);
        if (active) {
          setWorkspace(wsRes.data.workspace);
          setMembership(wsRes.data.membership);
          setWorkspaceMembers(membersRes.data || []);
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

    loadWorkspaceData();
    return () => {
      active = false;
    };
  }, [workspaceId, reloadKey]);

  const isAdmin = useMemo(() => {
    return membership?.role === "ADMIN";
  }, [membership?.role]);

  const handleOpenAddModal = useCallback(() => {
    setAddEmail("");
    setAddRole("DEVELOPER");
    setAddError(null);
    setIsAddOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    if (isSubmittingAdd) return;
    setIsAddOpen(false);
    setAddEmail("");
    setAddRole("DEVELOPER");
    setAddError(null);
  }, [isSubmittingAdd]);

  const handleOpenRoleModal = useCallback((member) => {
    setRoleModalMember(member);
    setNewRole(member.role || "DEVELOPER");
    setRoleError(null);
  }, []);

  const handleCloseRoleModal = useCallback(() => {
    if (isSubmittingRole) return;
    setRoleModalMember(null);
    setRoleError(null);
  }, [isSubmittingRole]);

  const handleOpenRemoveModal = useCallback((member) => {
    setRemoveModalMember(member);
    setRemoveError(null);
  }, []);

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
    const cleanEmail = addEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setAddError("Please enter an email address.");
      return;
    }

    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      await addWorkspaceMemberRequest(workspaceId, {
        email: cleanEmail,
        role: addRole,
      });
      setIsAddOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.response?.status === 404) {
        setAddError("Registered user not found. Please ensure the user has signed up for a DevFlow AI account first.");
      } else if (err.response?.status === 409) {
        setAddError("User is already a member of this workspace.");
      } else {
        setAddError(getErrorMessage(err, "Failed to add member to workspace."));
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSubmitRoleChange = async (e) => {
    e.preventDefault();
    if (!roleModalMember) return;

    setIsSubmittingRole(true);
    setRoleError(null);
    try {
      await changeWorkspaceMemberRoleRequest(
        workspaceId,
        roleModalMember.membershipId,
        { role: newRole }
      );
      setRoleModalMember(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes("at least one ADMIN")) {
        setRoleError("A workspace must have at least one Administrator.");
      } else {
        setRoleError(getErrorMessage(err, "Failed to update member role."));
      }
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleSubmitRemove = async (e) => {
    e.preventDefault();
    if (!removeModalMember) return;

    setIsSubmittingRemove(true);
    setRemoveError(null);
    try {
      await removeWorkspaceMemberRequest(
        workspaceId,
        removeModalMember.membershipId
      );
      const isRemovingSelf = removeModalMember.userId === user?.id;
      setRemoveModalMember(null);
      if (isRemovingSelf) {
        navigate("/app/workspaces");
      } else {
        setReloadKey((k) => k + 1);
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes("at least one ADMIN")) {
        setRemoveError("Cannot remove the last Administrator. A workspace must have at least one Administrator.");
      } else {
        setRemoveError(getErrorMessage(err, "Failed to remove member from workspace."));
      }
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  const stats = useMemo(() => {
    const total = workspaceMembers.length;
    const admins = workspaceMembers.filter((m) => m.role === "ADMIN").length;
    const managers = workspaceMembers.filter((m) => m.role === "PROJECT_MANAGER").length;
    const devsAndQa = workspaceMembers.filter((m) => m.role === "DEVELOPER" || m.role === "QA").length;
    return { total, admins, managers, devsAndQa };
  }, [workspaceMembers]);

  const filteredMembers = useMemo(() => {
    return workspaceMembers.filter((m) => {
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
      const email = (m.email || "").toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [workspaceMembers, roleFilter, searchQuery]);

  if (isLoading) {
    return <LoadingState label="Loading workspace members…" />;
  }

  if (error) {
    return (
      <div className="workspace-members">
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((k) => k + 1)}
          backTo="/app/workspaces"
          backLabel="All workspaces"
        />
      </div>
    );
  }

  return (
    <div className="workspace-members">
      <Link className="navigation-back" to={`/app/workspaces/${workspaceId}/projects`}>
        <ArrowLeftIcon size={14} />
        <span>Back to projects</span>
      </Link>

      <header className="workspace-members__header">
        <div className="workspace-members__title-group">
          <p className="navigation-page__eyebrow">WORKSPACE / MEMBERS</p>
          <h1>{workspace?.name || "Workspace"} Members</h1>
          <p className="workspace-members__description">
            Manage team members, roles, and workspace access. Once added here, members can be assigned to projects within {workspace?.name}.
          </p>
        </div>
        <div className="workspace-members__header-actions">
          <button
            type="button"
            className="workspace-members__btn workspace-members__btn--secondary"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={isLoading}
            aria-label="Refresh workspace members list"
          >
            <RefreshIcon size={14} className={isLoading ? "is-spinning" : ""} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="workspace-members__btn workspace-members__btn--primary"
              onClick={handleOpenAddModal}
              id="add-workspace-member-btn"
            >
              <PlusIcon size={14} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </header>

      <section className="workspace-members__stats" aria-label="Workspace member statistics">
        <article className="workspace-members__stat-card">
          <div className="workspace-members__stat-top">
            <h2>Total Members</h2>
            <span className="workspace-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="workspace-members__stat-value">{stats.total}</p>
          <p className="workspace-members__stat-detail">Across all projects</p>
        </article>

        <article className="workspace-members__stat-card">
          <div className="workspace-members__stat-top">
            <h2>Administrators</h2>
            <span className="workspace-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="workspace-members__stat-value">{stats.admins}</p>
          <p className="workspace-members__stat-detail">Workspace management</p>
        </article>

        <article className="workspace-members__stat-card">
          <div className="workspace-members__stat-top">
            <h2>Project Managers</h2>
            <span className="workspace-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="workspace-members__stat-value">{stats.managers}</p>
          <p className="workspace-members__stat-detail">Project administrators</p>
        </article>

        <article className="workspace-members__stat-card">
          <div className="workspace-members__stat-top">
            <h2>Engineers &amp; QA</h2>
            <span className="workspace-members__stat-icon">
              <UserIcon size={14} />
            </span>
          </div>
          <p className="workspace-members__stat-value">{stats.devsAndQa}</p>
          <p className="workspace-members__stat-detail">Technical contributors</p>
        </article>
      </section>

      <div className="workspace-members__toolbar">
        <div className="workspace-members__search-box">
          <SearchIcon size={15} className="workspace-members__search-icon" />
          <input
            type="search"
            className="workspace-members__search-input"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search members"
          />
          {searchQuery && (
            <button
              type="button"
              className="workspace-members__search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <div className="workspace-members__filters" role="group" aria-label="Filter by role">
          <button
            type="button"
            className={`workspace-members__filter-pill ${roleFilter === "ALL" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("ALL")}
          >
            All Roles ({stats.total})
          </button>
          <button
            type="button"
            className={`workspace-members__filter-pill ${roleFilter === "ADMIN" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("ADMIN")}
          >
            Admins ({stats.admins})
          </button>
          <button
            type="button"
            className={`workspace-members__filter-pill ${roleFilter === "PROJECT_MANAGER" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("PROJECT_MANAGER")}
          >
            Managers ({stats.managers})
          </button>
          <button
            type="button"
            className={`workspace-members__filter-pill ${roleFilter === "DEVELOPER" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("DEVELOPER")}
          >
            Developers ({workspaceMembers.filter((m) => m.role === "DEVELOPER").length})
          </button>
          <button
            type="button"
            className={`workspace-members__filter-pill ${roleFilter === "QA" ? "is-active" : ""}`}
            onClick={() => setRoleFilter("QA")}
          >
            QA ({workspaceMembers.filter((m) => m.role === "QA").length})
          </button>
        </div>
      </div>

      <div className="workspace-members__table-wrapper">
        {filteredMembers.length === 0 ? (
          <div className="workspace-members__empty">
            <div className="workspace-members__empty-icon">
              <UserIcon size={24} />
            </div>
            <h3>No members found</h3>
            <p>
              {workspaceMembers.length === 0
                ? "No members in this workspace yet."
                : "No workspace members match your search or filter criteria."}
            </p>
          </div>
        ) : (
          <table className="workspace-members__table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Workspace Role</th>
                <th>Joined</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const memberName = formatMemberName(member);
                const initial = memberName.charAt(0).toUpperCase() || "U";
                const isCurrentUser = member.userId === user?.id;
                const badge = getWorkspaceRoleBadge(member.role);

                return (
                  <tr key={member.membershipId}>
                    <td data-label="Member">
                      <div className="workspace-members__user-cell">
                        <div className="workspace-members__avatar" aria-hidden="true">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="" />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div className="workspace-members__user-info">
                          <div className="workspace-members__user-name-row">
                            <span className="workspace-members__user-name">{memberName}</span>
                            {isCurrentUser && (
                              <span className="workspace-members__you-badge">You</span>
                            )}
                          </div>
                          <span className="workspace-members__user-email">{member.email}</span>
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
                    {isAdmin && (
                      <td data-label="Actions">
                        <div className="workspace-members__actions-cell">
                          <button
                            type="button"
                            className="workspace-members__action-btn"
                            onClick={() => handleOpenRoleModal(member)}
                            title="Change member role"
                          >
                            <EditIcon size={13} />
                            <span>Role</span>
                          </button>
                          <button
                            type="button"
                            className="workspace-members__action-btn workspace-members__action-btn--danger"
                            onClick={() => handleOpenRemoveModal(member)}
                            title="Remove from workspace"
                          >
                            <TrashIcon size={13} />
                            <span>Remove</span>
                          </button>
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

      {isAddOpen && (
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
                <h2 id="add-member-title">Add Workspace Member</h2>
                <p>Add an existing registered user to {workspace?.name}.</p>
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

            <div className="workspace-members__notice-box">
              <UserIcon size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>
                The account must already be registered in DevFlow AI. Enter the exact email address they used when registering.
              </span>
            </div>

            <form className="workspace-form" onSubmit={handleSubmitAdd}>
              <div className="workspace-form__field">
                <label htmlFor="member-email-input">
                  <span>Registered Email</span>
                  <span className="workspace-form__required">*</span>
                </label>
                <input
                  id="member-email-input"
                  type="email"
                  placeholder="e.g. colleague@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  disabled={isSubmittingAdd}
                  required
                  autoFocus
                />
              </div>

              <div className="workspace-form__field">
                <label>
                  <span>Workspace Role</span>
                  <span className="workspace-form__required">*</span>
                </label>
                <div className="workspace-members__role-options">
                  <label
                    className={`workspace-members__role-option ${
                      addRole === "DEVELOPER" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="workspace-role"
                      className="workspace-members__role-radio"
                      value="DEVELOPER"
                      checked={addRole === "DEVELOPER"}
                      onChange={() => setAddRole("DEVELOPER")}
                      disabled={isSubmittingAdd}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Developer</span>
                      <span className="workspace-members__role-option-desc">
                        Can join projects, update assigned tasks, and contribute code.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      addRole === "PROJECT_MANAGER" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="workspace-role"
                      className="workspace-members__role-radio"
                      value="PROJECT_MANAGER"
                      checked={addRole === "PROJECT_MANAGER"}
                      onChange={() => setAddRole("PROJECT_MANAGER")}
                      disabled={isSubmittingAdd}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Project Manager</span>
                      <span className="workspace-members__role-option-desc">
                        Can create and manage projects, plan sprints, and oversee deliverables.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      addRole === "QA" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="workspace-role"
                      className="workspace-members__role-radio"
                      value="QA"
                      checked={addRole === "QA"}
                      onChange={() => setAddRole("QA")}
                      disabled={isSubmittingAdd}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Quality Assurance (QA)</span>
                      <span className="workspace-members__role-option-desc">
                        Focuses on verifying requirements, testing features, and tracking bugs.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      addRole === "ADMIN" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="workspace-role"
                      className="workspace-members__role-radio"
                      value="ADMIN"
                      checked={addRole === "ADMIN"}
                      onChange={() => setAddRole("ADMIN")}
                      disabled={isSubmittingAdd}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Administrator</span>
                      <span className="workspace-members__role-option-desc">
                        Full administrative access to workspace settings, projects, and member management.
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
                  disabled={isSubmittingAdd || !addEmail.trim()}
                >
                  {isSubmittingAdd ? "Adding Member…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleModalMember && (
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
                <h2 id="role-modal-title">Change Workspace Role</h2>
                <p>Update workspace permissions for this member.</p>
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

            <div className="workspace-members__modal-user-summary">
              <div className="workspace-members__avatar" aria-hidden="true">
                {roleModalMember.avatarUrl ? (
                  <img src={roleModalMember.avatarUrl} alt="" />
                ) : (
                  <span>{formatMemberName(roleModalMember).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="workspace-members__user-info">
                <span className="workspace-members__user-name">
                  {formatMemberName(roleModalMember)}
                </span>
                <span className="workspace-members__user-email">{roleModalMember.email}</span>
              </div>
            </div>

            {roleModalMember.userId === user?.id && newRole !== "ADMIN" && (
              <div className="workspace-members__warning-box">
                <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Notice: Changing your own role from Administrator will remove your ability to manage workspace members and settings.
                </span>
              </div>
            )}

            <form className="workspace-form" onSubmit={handleSubmitRoleChange}>
              <div className="workspace-form__field">
                <label>
                  <span>Select New Role</span>
                  <span className="workspace-form__required">*</span>
                </label>
                <div className="workspace-members__role-options">
                  <label
                    className={`workspace-members__role-option ${
                      newRole === "DEVELOPER" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="workspace-members__role-radio"
                      value="DEVELOPER"
                      checked={newRole === "DEVELOPER"}
                      onChange={() => setNewRole("DEVELOPER")}
                      disabled={isSubmittingRole}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Developer</span>
                      <span className="workspace-members__role-option-desc">
                        Engineering contributor working on projects and tasks.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      newRole === "PROJECT_MANAGER" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="workspace-members__role-radio"
                      value="PROJECT_MANAGER"
                      checked={newRole === "PROJECT_MANAGER"}
                      onChange={() => setNewRole("PROJECT_MANAGER")}
                      disabled={isSubmittingRole}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Project Manager</span>
                      <span className="workspace-members__role-option-desc">
                        Can manage projects, sprints, and tasks within this workspace.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      newRole === "QA" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="workspace-members__role-radio"
                      value="QA"
                      checked={newRole === "QA"}
                      onChange={() => setNewRole("QA")}
                      disabled={isSubmittingRole}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Quality Assurance (QA)</span>
                      <span className="workspace-members__role-option-desc">
                        Quality verification, requirements testing, and bug tracking.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`workspace-members__role-option ${
                      newRole === "ADMIN" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="update-role"
                      className="workspace-members__role-radio"
                      value="ADMIN"
                      checked={newRole === "ADMIN"}
                      onChange={() => setNewRole("ADMIN")}
                      disabled={isSubmittingRole}
                    />
                    <div className="workspace-members__role-option-content">
                      <span className="workspace-members__role-option-title">Administrator</span>
                      <span className="workspace-members__role-option-desc">
                        Full administrative access to workspace settings and member management.
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
                  disabled={isSubmittingRole || newRole === roleModalMember.role}
                >
                  {isSubmittingRole ? "Updating…" : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeModalMember && (
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
                <h2 id="remove-modal-title">Remove Workspace Member</h2>
                <p>Are you sure you want to remove this member from the workspace?</p>
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

            <div className="workspace-members__modal-user-summary">
              <div className="workspace-members__avatar" aria-hidden="true">
                {removeModalMember.avatarUrl ? (
                  <img src={removeModalMember.avatarUrl} alt="" />
                ) : (
                  <span>{formatMemberName(removeModalMember).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="workspace-members__user-info">
                <span className="workspace-members__user-name">
                  {formatMemberName(removeModalMember)}
                </span>
                <span className="workspace-members__user-email">{removeModalMember.email}</span>
              </div>
            </div>

            <div className="workspace-members__warning-box">
              <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <span>
                  This user will immediately lose access to {workspace?.name} and all of its projects, tasks, and sprints.
                </span>
                {removeModalMember.userId === user?.id && (
                  <p style={{ marginTop: "0.35rem", fontWeight: 650 }}>
                    Warning: You are about to remove yourself from this workspace.
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
                  className="workspace-members__btn workspace-members__btn--danger"
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
