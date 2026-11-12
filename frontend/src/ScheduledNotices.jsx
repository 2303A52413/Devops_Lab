import { useEffect, useState } from "react";
import "./ScheduledNotices.css";
import { apiRequest, formatDate } from "./api";

function ScheduledNotices({ onBack }) {
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState("");

  const loadNotices = async () => {
    try {
      setNotices(await apiRequest("/scheduled"));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { loadNotices(); }, []);

  const handleCancel = async (notice) => {
    if (!window.confirm(`Cancel "${notice.title}"?`)) return;
    try {
      await apiRequest(`/scheduled/${notice._id}`, { method: "DELETE" });
      await loadNotices();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="scheduled-page">
      <div className="scheduled-header">
        <button className="scheduled-back" onClick={onBack}>← Back to Dashboard</button>
        <h1 style={{ color: "#26354b" }}>Scheduled Notices</h1>
        <p>Manage upcoming announcements</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="scheduled-table-container">
        <table className="scheduled-table">
          <thead><tr><th>Title</th><th>Category</th><th>Department</th><th>Publish Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice._id}>
                <td>{notice.title}</td><td>{notice.category}</td><td>{notice.department}</td>
                <td>{formatDate(notice.publishDate)}</td>
                <td><span className="scheduled-status">{notice.status}</span></td>
                <td><button className="cancel-scheduled" onClick={() => handleCancel(notice)}>Cancel</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {notices.length === 0 && <p className="no-scheduled">No scheduled announcements available.</p>}
      </div>
    </div>
  );
}

export default ScheduledNotices;
