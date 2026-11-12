import { useEffect, useMemo, useState } from "react";
import "./Reports.css";
import { apiRequest, formatDate } from "./api";

function Reports({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expired, setExpired] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/reports/publications"),
      apiRequest("/reports/categories"),
      apiRequest("/reports/expired"),
    ]).then(([publications, categoryReport, expiredReport]) => {
      setAnnouncements(publications);
      setCategories(categoryReport);
      setExpired(expiredReport);
    }).catch((requestError) => setError(requestError.message));
  }, []);

  const categoryCount = useMemo(() => new Set(
    announcements.filter((item) => item.status !== "Draft").map((item) => item.category)
  ).size, [announcements]);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <button className="reports-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>Reports &amp; Analytics</h1>
        <p>View announcement publication, category, and expiry reports.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="report-summary">
        <div className="report-card"><h3>Total Announcements</h3><h2>{announcements.filter((item) => item.status !== "Draft").length}</h2></div>
        <div className="report-card"><h3>Categories</h3><h2>{categoryCount}</h2></div>
        <div className="report-card"><h3>Expired Notices</h3><h2>{expired.length}</h2></div>
      </div>
      <div className="report-section">
        <h2>Announcement Publication Report</h2>
        <table className="reports-table">
          <thead><tr><th>Notice Title</th><th>Category</th><th>Department</th><th>Published Date</th><th>Status</th></tr></thead>
          <tbody>{announcements.map((item) => (
            <tr key={item._id}><td>{item.title}</td><td>{item.category}</td><td>{item.department}</td>
              <td>{formatDate(item.date)}</td><td>{item.status}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="report-section">
        <h2>Category-wise Notice Report</h2>
        <table className="reports-table">
          <thead><tr><th>Category</th><th>Total Notices</th></tr></thead>
          <tbody>{categories.map((item) => <tr key={item._id}><td>{item._id}</td><td>{item.totalNotices}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="report-section">
        <h2>Expired Announcement Report</h2>
        <table className="reports-table">
          <thead><tr><th>Notice Title</th><th>Category</th><th>Department</th><th>Expiry Date</th><th>Status</th></tr></thead>
          <tbody>{expired.map((item) => (
            <tr key={item._id}><td>{item.title}</td><td>{item.category}</td><td>{item.department}</td>
              <td>{formatDate(item.expiryDate)}</td><td>Expired</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
