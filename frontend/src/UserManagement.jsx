import React, { useEffect, useMemo, useState } from "react";
import "./UserManagement.css";
import { apiRequest } from "./api";

function UserManagement({ onBack }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setUsers(await apiRequest("/users"));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const addUser = async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("Student");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiRequest(`/users/${id}`, { method: "DELETE" });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const filteredUsers = useMemo(() => users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  return (
    <div className="user-management">
      <div className="user-header">
        <button onClick={onBack} className="user-back-btn">← Back to Dashboard</button>
        <h1>User Management</h1>
        <p>Manage students, faculty members, and administrators.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="user-form-container">
        <h2>Add New User</h2>
        <form onSubmit={addUser} className="user-form">
          <input type="text" placeholder="Enter Full Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <input type="email" placeholder="Enter Email Address" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input type="password" placeholder="Temporary password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit">Add User</button>
        </form>
      </div>
      <div className="user-table-container">
        <h2>All Users ({users.length})</h2>
        <input type="text" className="user-search" placeholder="Search users by name or email..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <table className="user-table">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id.slice(-6)}</td><td>{user.name}</td><td>{user.email}</td>
                <td><span className={`user-role ${user.role.toLowerCase()}`}>{user.role}</span></td>
                <td><button className="user-delete-btn" onClick={() => deleteUser(user.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <p className="no-users">No users found.</p>}
      </div>
    </div>
  );
}

export default UserManagement;
