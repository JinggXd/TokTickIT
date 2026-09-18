import React, { useState, useEffect, useCallback } from "react";
import {
  AdminUserItem,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  Role,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  REQUESTER: "bg-light text-dark border",
  IT_STAFF: "bg-success text-white",
  ADMINISTRATOR: "bg-primary text-white",
};

export interface UserManagementProps {
  onNavigateToLogin?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNavigateToLogin }) => {
  const { user: currentUser, logout } = useAuth();

  // State: Data & Query
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    role: "REQUESTER" as Role,
    isActive: true,
    initialPassword: "",
  });
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "REQUESTER" as Role,
    isActive: true,
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  const [resetUser, setResetUser] = useState<AdminUserItem | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  // System-wide active admin count (not affected by search filters)
  const [systemActiveAdminCount, setSystemActiveAdminCount] = useState<number | null>(null);

  const refreshSystemAdminCount = useCallback(async () => {
    try {
      const allAdmins = await fetchAdminUsers({ role: "ADMINISTRATOR" });
      const count = allAdmins.filter((u) => u.isActive).length;
      setSystemActiveAdminCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshSystemAdminCount();
  }, [refreshSystemAdminCount]);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers({
        search: searchInput,
        role: selectedRole,
      });
      setUsers(data);
      refreshSystemAdminCount();
    } catch (err: any) {
      setError(err.message || "Unable to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, selectedRole, refreshSystemAdminCount]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(handler);
  }, [loadUsers]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddFormData({
      name: "",
      email: "",
      role: "REQUESTER",
      isActive: true,
      initialPassword: "",
    });
    setAddFormErrors({});
    setAddModalError(null);
    setShowAddModal(true);
  };

  // Submit Add User
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormErrors({});
    setAddModalError(null);

    const errors: Record<string, string> = {};
    if (!addFormData.name.trim()) errors.name = "Name is required";
    if (!addFormData.email.trim()) errors.email = "Email is required";
    const codePointLen = Array.from(addFormData.initialPassword).length;
    if (!addFormData.initialPassword) {
      errors.initialPassword = "Initial password is required";
    } else if (codePointLen < 12) {
      errors.initialPassword = "Password must be at least 12 characters";
    } else if (codePointLen > 128) {
      errors.initialPassword = "Password must not exceed 128 characters";
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await createAdminUser(addFormData);
      setShowAddModal(false);
      setActionSuccessMessage("User created successfully!");
      loadUsers();
    } catch (err: any) {
      if (err.error === "DUPLICATE_EMAIL" || err.status === 409) {
        setAddModalError("An account with this email address already exists.");
      } else if (err.details) {
        setAddFormErrors(err.details);
      } else {
        setAddModalError(err.message || "Failed to create user.");
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: AdminUserItem) => {
    refreshSystemAdminCount();
    setEditingUser(u);
    setEditFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    });
    setEditFormErrors({});
    setEditModalError(null);
  };

  // Submit Edit User
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormErrors({});
    setEditModalError(null);

    const errors: Record<string, string> = {};
    if (!editFormData.name.trim()) errors.name = "Name is required";
    if (!editFormData.email.trim()) errors.email = "Email is required";

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    const isSelfDemotion =
      editingUser.id === currentUser?.id &&
      editFormData.role !== currentUser?.role &&
      editFormData.role !== "ADMINISTRATOR";

    setIsSubmittingEdit(true);
    try {
      const res = await updateAdminUser(editingUser.id, editFormData);
      setEditingUser(null);
      if (isSelfDemotion) {
        await logout().catch(() => {});
        if (onNavigateToLogin) {
          onNavigateToLogin();
        } else {
          window.history.replaceState({}, "", "/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return;
      }
      if (res.unassignedTicketsCount > 0) {
        setActionSuccessMessage(
          `User updated successfully! ${res.unassignedTicketsCount} ticket(s) previously owned by this user were unassigned.`
        );
      } else {
        setActionSuccessMessage("User updated successfully!");
      }
      loadUsers();
    } catch (err: any) {
      if (err.error === "SELF_DEACTIVATION" || err.status === 400 && err.message?.includes("deactivate your own")) {
        setEditModalError("You cannot deactivate your own account.");
      } else if (err.error === "LAST_ACTIVE_ADMIN" || err.status === 400 && err.message?.includes("active Administrator")) {
        setEditModalError("At least one active Administrator must remain.");
      } else if (err.error === "DUPLICATE_EMAIL" || err.status === 409) {
        setEditModalError("An account with this email address already exists.");
      } else if (err.details) {
        setEditFormErrors(err.details);
      } else {
        setEditModalError(err.message || "Failed to update user.");
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (u: AdminUserItem) => {
    setResetUser(u);
    setResetPasswordInput("");
    setResetPasswordError(null);
    setResetModalError(null);
  };

  // Submit Reset Password
  const handleSubmitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetPasswordError(null);
    setResetModalError(null);

    const codePointLen = Array.from(resetPasswordInput).length;
    if (!resetPasswordInput) {
      setResetPasswordError("Temporary password is required");
      return;
    }
    if (codePointLen < 12) {
      setResetPasswordError("Password must be at least 12 characters");
      return;
    }
    if (codePointLen > 128) {
      setResetPasswordError("Password must not exceed 128 characters");
      return;
    }

    const isSelfReset = resetUser.id === currentUser?.id;

    setIsSubmittingReset(true);
    try {
      await resetAdminUserPassword(resetUser.id, resetPasswordInput);
      setResetUser(null);
      if (isSelfReset) {
        await logout().catch(() => {});
        if (onNavigateToLogin) {
          onNavigateToLogin();
        } else {
          window.history.replaceState({}, "", "/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return;
      }
      setActionSuccessMessage(
        `Initial password for ${resetUser.name} has been reset. All active sessions have been revoked.`
      );
    } catch (err: any) {
      setResetModalError(err.message || "Failed to reset password.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const isEditingSelf = editingUser ? editingUser.id === currentUser?.id : false;
  const isSoleActiveAdmin =
    editingUser
      ? editingUser.role === "ADMINISTRATOR" &&
        editingUser.isActive &&
        (systemActiveAdminCount !== null ? systemActiveAdminCount <= 1 : false)
      : false;

  return (
    <div className="container py-4" data-testid="user-management-page">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">User Management</h1>
          <p className="text-muted mb-0">Provision, manage, and configure system user accounts and roles.</p>
        </div>
        <button
          type="button"
          className="btn btn-success fw-semibold mt-2 mt-sm-0"
          onClick={handleOpenAddModal}
          data-testid="add-user-btn"
        >
          + Add User
        </button>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          {actionSuccessMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "#F8FAF8" }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label htmlFor="user-search-input" className="form-label small fw-semibold text-muted mb-1">
                Search
              </label>
              <input
                id="user-search-input"
                data-testid="user-search-input"
                type="text"
                className="form-control"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="user-role-filter" className="form-label small fw-semibold text-muted mb-1">
                Role Filter
              </label>
              <select
                id="user-role-filter"
                data-testid="user-role-filter"
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
            {(searchInput.trim() || selectedRole !== "ALL") && (
              <div className="col-12 col-md-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchInput("");
                    setSelectedRole("ALL");
                  }}
                  data-testid="clear-user-filters-btn"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table / Content View */}
      {isLoading ? (
        <div className="card shadow-sm border-0 p-5 text-center" data-testid="user-admin-loading">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="text-muted mb-0">Loading user accounts...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger p-4 text-center" data-testid="user-admin-error" role="alert">
          <p className="mb-2 fw-semibold">{error}</p>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadUsers}>
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        searchInput || selectedRole !== "ALL" ? (
          <div className="card shadow-sm border-0 p-5 text-center" data-testid="user-admin-no-results">
            <h2 className="h5 fw-bold text-muted mb-2">No users match your search.</h2>
            <p className="text-muted mb-3">Try adjusting your keyword or role filter.</p>
            <div>
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={() => {
                  setSearchInput("");
                  setSelectedRole("ALL");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm border-0 p-5 text-center" data-testid="user-admin-empty">
            <h2 className="h5 fw-bold text-muted mb-2">No users found</h2>
            <p className="text-muted mb-0">There are no user accounts in the system.</p>
          </div>
        )
      ) : (
        <div className="card shadow-sm border-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" data-testid="user-table" aria-label="User Accounts">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="ps-3">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="ps-3 fw-semibold text-dark">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="badge bg-secondary ms-2 small">You</span>
                      )}
                    </td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_CLASSES[u.role] || "bg-secondary"}`}>
                        {ROLE_DISPLAY_NAMES[u.role] || u.role}
                      </span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => handleOpenEditModal(u)}
                          data-testid={`edit-user-btn-${u.id}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-warning text-dark"
                          onClick={() => handleOpenResetModal(u)}
                          data-testid={`reset-password-btn-${u.id}`}
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          data-testid="add-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmitAdd}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Add New User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {addModalError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert">
                      {addModalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="add-user-name" className="form-label small fw-semibold">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="add-user-name"
                      data-testid="add-user-name"
                      type="text"
                      className={`form-control ${addFormErrors.name ? "is-invalid" : ""}`}
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      required
                    />
                    {addFormErrors.name && <div className="invalid-feedback">{addFormErrors.name}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="add-user-email" className="form-label small fw-semibold">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="add-user-email"
                      data-testid="add-user-email"
                      type="email"
                      className={`form-control ${addFormErrors.email ? "is-invalid" : ""}`}
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                      required
                    />
                    {addFormErrors.email && <div className="invalid-feedback">{addFormErrors.email}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="add-user-role" className="form-label small fw-semibold">
                      System Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="add-user-role"
                      data-testid="add-user-role"
                      className={`form-select ${addFormErrors.role ? "is-invalid" : ""}`}
                      value={addFormData.role}
                      onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as Role })}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="add-user-password" className="form-label small fw-semibold">
                      Initial Temporary Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="add-user-password"
                      data-testid="add-user-password"
                      type="password"
                      className={`form-control ${addFormErrors.initialPassword ? "is-invalid" : ""}`}
                      value={addFormData.initialPassword}
                      onChange={(e) => setAddFormData({ ...addFormData, initialPassword: e.target.value })}
                      placeholder="Minimum 12 characters"
                      required
                    />
                    {addFormErrors.initialPassword && (
                      <div className="invalid-feedback">{addFormErrors.initialPassword}</div>
                    )}
                    <span className="small text-muted d-block mt-1">
                      User will be forced to change this password on their first login.
                    </span>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      id="add-user-active"
                      data-testid="add-user-active"
                      className="form-check-input"
                      type="checkbox"
                      checked={addFormData.isActive}
                      onChange={(e) => setAddFormData({ ...addFormData, isActive: e.target.checked })}
                    />
                    <label htmlFor="add-user-active" className="form-check-label small fw-semibold">
                      Active Account
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAddModal(false)}
                    data-testid="cancel-add-user-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSubmittingAdd}
                    data-testid="submit-add-user-btn"
                  >
                    {isSubmittingAdd ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          data-testid="edit-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmitEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Edit User Account</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditingUser(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {editModalError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert">
                      {editModalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="edit-user-name" className="form-label small fw-semibold">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-name"
                      data-testid="edit-user-name"
                      type="text"
                      className={`form-control ${editFormErrors.name ? "is-invalid" : ""}`}
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                    {editFormErrors.name && <div className="invalid-feedback">{editFormErrors.name}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-user-email" className="form-label small fw-semibold">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-email"
                      data-testid="edit-user-email"
                      type="email"
                      className={`form-control ${editFormErrors.email ? "is-invalid" : ""}`}
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      required
                    />
                    {editFormErrors.email && <div className="invalid-feedback">{editFormErrors.email}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-user-role" className="form-label small fw-semibold">
                      System Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-user-role"
                      data-testid="edit-user-role"
                      className="form-select"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as Role })}
                      disabled={isSoleActiveAdmin}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    {isSoleActiveAdmin && (
                      <span className="small text-warning d-block mt-1">
                        Cannot change role: this is the sole remaining active Administrator in the system.
                      </span>
                    )}
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      id="edit-user-active"
                      data-testid="edit-user-active"
                      className="form-check-input"
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                      disabled={isEditingSelf || isSoleActiveAdmin}
                    />
                    <label htmlFor="edit-user-active" className="form-check-label small fw-semibold">
                      Active Account
                    </label>
                    {isEditingSelf && (
                      <span className="small text-muted d-block mt-1" data-testid="self-deactivation-warning">
                        You cannot deactivate your own account.
                      </span>
                    )}
                    {!isEditingSelf && isSoleActiveAdmin && (
                      <span className="small text-warning d-block mt-1">
                        At least one active Administrator must remain.
                      </span>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    data-testid="cancel-edit-user-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingEdit}
                    data-testid="submit-edit-user-btn"
                  >
                    {isSubmittingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Initial Password Modal */}
      {resetUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          data-testid="reset-password-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmitReset}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Reset Initial Password</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setResetUser(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Resetting password for <strong>{resetUser.name}</strong> ({resetUser.email}).
                  </p>

                  <div className="alert alert-warning py-2 small mb-3">
                    <strong>Notice:</strong> This will invalidate all current active sessions for this user and require
                    a password change upon their next sign-in.
                  </div>

                  {resetModalError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert">
                      {resetModalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="reset-user-password" className="form-label small fw-semibold">
                      New Temporary Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="reset-user-password"
                      data-testid="reset-user-password"
                      type="password"
                      className={`form-control ${resetPasswordError ? "is-invalid" : ""}`}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Minimum 12 characters"
                      required
                    />
                    {resetPasswordError && <div className="invalid-feedback">{resetPasswordError}</div>}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setResetUser(null)}
                    data-testid="cancel-reset-password-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning text-dark fw-semibold"
                    disabled={isSubmittingReset}
                    data-testid="submit-reset-password-btn"
                  >
                    {isSubmittingReset ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
