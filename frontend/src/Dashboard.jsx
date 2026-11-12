import { useCallback, useEffect, useMemo, useState } from "react";
import CreateAnnouncement from "./CreateAnnouncement";
import "./Dashboard.css";
import Categories from "./Categories";
import ScheduledNotices from "./ScheduledNotices";
import UserManagement from "./UserManagement";
import Reports from "./Reports";
import Settings from "./Settings";
import { apiRequest, formatDate } from "./api";

const pageComponents = {
  Categories,
  ScheduledNotices,
  UserManagement,
  Reports,
  Settings,
};

function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState("Dashboard");
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [noticeData, categoryData, scheduledData, statsData] = await Promise.all([
        apiRequest("/announcements"),
        apiRequest("/categories"),
        apiRequest("/scheduled"),
        apiRequest("/dashboard/stats").catch(() => null),
      ]);
      setAnnouncements(noticeData);
      setCategories(categoryData);
      setScheduledCount(scheduledData.length);
      if (statsData) setStats(statsData);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredAnnouncements = useMemo(() => announcements.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [announcements, categoryFilter, searchTerm]);

  const handlePublish = async (formData) => {
    const { publishDate, ...notice } = formData;
    try {
      if (formData.status === "Scheduled") {
        await apiRequest("/scheduled", {
          method: "POST",
          body: JSON.stringify({ ...notice, publishDate }),
        });
      } else {
        await apiRequest("/announcements", {
          method: "POST",
          body: JSON.stringify({ ...notice, date: publishDate }),
        });
      }
      await loadDashboard();
      setPage("Dashboard");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteAnnouncement = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await apiRequest(`/announcements/${item._id}`, { method: "DELETE" });
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleEditAnnouncement = async (item) => {
    const title = window.prompt("Enter announcement title:", item.title);
    if (title === null || !title.trim()) return;
    const category = window.prompt("Enter category:", item.category);
    if (category === null) return;
    const department = window.prompt("Enter department:", item.department);
    if (department === null) return;
    try {
      await apiRequest(`/announcements/${item._id}`, {
        method: "PUT",
        body: JSON.stringify({ title: title.trim(), category, department }),
      });
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (page === "CreateAnnouncement") {
    return <CreateAnnouncement
      categories={categories}
      onBack={() => setPage("Dashboard")}
      onPublish={handlePublish}
      error={error}
    />;
  }
  const PageComponent = pageComponents[page];
  if (PageComponent) {
    return <PageComponent onBack={() => { setPage("Dashboard"); loadDashboard(); }} />;
  }

  const now = new Date();
  const totalAnnouncementsCount = stats?.totalAnnouncements ?? announcements.length;
  const publishedCount = stats?.publishedNotices ?? announcements.filter((item) =>
    item.status === "Published" && new Date(item.expiryDate) >= now
  ).length;
  const scheduledNoticesCount = stats?.scheduledNotices ?? scheduledCount;
  const expiredCount = stats?.expiredNotices ?? announcements.filter((item) =>
    item.status !== "Draft" && new Date(item.expiryDate) < now
  ).length;
  const categoryCounts = announcements.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
  const isAdmin = user.role === "Admin";
  const canPublish = isAdmin || user.role === "Faculty";
  const university = JSON.parse(localStorage.getItem("noticeBoardSettings") || "{}").university || "SR UNIVERSITY";

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">SR</div>
          <div>
            <h2>{university}</h2>
            <p>Notice Board</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className="active" href="#dashboard" onClick={(event) => { event.preventDefault(); setPage("Dashboard"); }}>🏠 Dashboard</a>
          <a href="#announcements" onClick={(event) => { event.preventDefault(); document.getElementById("announcements")?.scrollIntoView({ behavior: "smooth" }); }}>📢 Announcements</a>
          {canPublish && <a href="#create" onClick={(event) => { event.preventDefault(); setPage("CreateAnnouncement"); }}>➕ Create Notice</a>}
          {isAdmin && <a href="#categories" onClick={(event) => { event.preventDefault(); setPage("Categories"); }}>📁 Categories</a>}
          {isAdmin && <a href="#schedule" onClick={(event) => { event.preventDefault(); setPage("ScheduledNotices"); }}>📅 Scheduled Notices</a>}
          {isAdmin && <a href="#users" onClick={(event) => { event.preventDefault(); setPage("UserManagement"); }}>👥 Users Management</a>}
          {isAdmin && <a href="#reports" onClick={(event) => { event.preventDefault(); setPage("Reports"); }}>📊 Reports</a>}
          {isAdmin && <a href="#settings" onClick={(event) => { event.preventDefault(); setPage("Settings"); }}>⚙️ Settings</a>}
        </nav>
        <div className="sidebar-footer"><p>© 2026 {university}</p></div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{isAdmin ? "Admin Dashboard" : "Notice Board"}</h1>
            <p>Welcome back, {user.name}. Manage your university announcements.</p>
          </div>
          <div className="admin-profile">
            <div className="admin-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div><h3>{user.name}</h3><p>{user.role}</p></div>
            <button type="button" className="logout-btn" onClick={onLogout}>Sign Out</button>
          </div>
        </header>

        {error && <p className="dashboard-error" role="alert">{error}</p>}

        <section className="dashboard-stats">
          <div className="stat-card"><div className="stat-icon blue">📢</div><div><p>Total Announcements</p><h2>{totalAnnouncementsCount}</h2><span>All notices</span></div></div>
          <div className="stat-card"><div className="stat-icon green">✅</div><div><p>Published Notices</p><h2>{publishedCount}</h2><span>Currently active</span></div></div>
          <div className="stat-card"><div className="stat-icon orange">📅</div><div><p>Scheduled Notices</p><h2>{scheduledNoticesCount}</h2><span>Upcoming notices</span></div></div>
          <div className="stat-card"><div className="stat-icon red">⏰</div><div><p>Expired Notices</p><h2>{expiredCount}</h2><span>Past expiry date</span></div></div>
        </section>

        <section className="announcement-section">
          <div className="section-header">
            <div><h2>Recent Announcements</h2><p>Manage all university notices</p></div>
            {canPublish && <button className="create-btn" onClick={() => setPage("CreateAnnouncement")}>+ Create Announcement</button>}
          </div>
          <div className="announcement-filters">
            <input type="text" placeholder="Search announcements..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="All">All Categories</option>
              {categories.map((category) => <option value={category.name} key={category._id}>{category.name}</option>)}
            </select>
          </div>
          <div className="table-container" id="announcements">
            <table>
              <thead><tr><th>Announcement</th><th>Category</th><th>Department</th><th>Publish Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredAnnouncements.map((item) => {
                  const status = item.status === "Published" && new Date(item.expiryDate) < now ? "Expired" : item.status;
                  return <tr key={item._id}>
                    <td className="notice-title">{item.title}</td><td>{item.category}</td><td>{item.department}</td>
                    <td>{formatDate(item.date)}</td>
                    <td><span className={`status ${status.toLowerCase()}`}>{status}</span></td>
                    <td><div className="action-buttons">
                      <button className="view-btn" onClick={() => window.alert(`${item.title}\n\n${item.description}`)}>View</button>
                      {canPublish && <button className="edit-btn" onClick={() => handleEditAnnouncement(item)}>Edit</button>}
                      {isAdmin && <button className="delete-btn" onClick={() => handleDeleteAnnouncement(item)}>Delete</button>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {filteredAnnouncements.length === 0 && <p className="no-announcements">No announcements match your search.</p>}
          </div>
        </section>

        <section className="dashboard-bottom">
          {isAdmin && <div className="quick-card">
            <h2>Quick Actions</h2>
            <button onClick={() => setPage("CreateAnnouncement")}>+ Create New Notice</button>
            <button onClick={() => setPage("Reports")}>📊 Generate Reports</button>
            <button onClick={() => setPage("UserManagement")}>👥 Manage Users</button>
          </div>}
          {isAdmin && <div className="quick-card">
            <h2>Announcement Categories</h2>
            {categories.map((category) => <div className="category-item" key={category._id}><span>{category.name}</span><strong>{categoryCounts[category.name] || 0}</strong></div>)}
          </div>}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
