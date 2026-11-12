
import React, { useState } from "react";
import "./CreateAnnouncement.css";

function CreateAnnouncement({ onBack, onPublish, categories = [], error }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Academic",
    department: "All Departments",
    targetRole: "All",
    publishDate: "",
    expiryDate: "",
    status: "Published",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      formData.expiryDate &&
      formData.publishDate &&
      formData.expiryDate < formData.publishDate
    ) {
      alert("Expiry date must be after the publish date.");
      return;
    }

    onPublish(formData);
  };

  return (
    <div className="create-announcement-page">
      <div className="create-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <h1>Create Announcement</h1>

        <p>
          Create and publish important university announcements.
        </p>
      </div>

      <form className="announcement-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Announcement Details</h2>

          <div className="input-group">
            <label>Announcement Title *</label>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div className="input-group">
            <label>Description *</label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter announcement details"
              rows="5"
              required
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Category *</label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {(categories.length ? categories.map((item) => item.name) : [
                  "Academic", "Examinations", "Events", "Workshop", "General", "Placement",
                ]).map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label>Department *</label>

              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="All Departments">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="CSE-AIML">CSE-AIML</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Target User Role *</label>

            <select
              name="targetRole"
              value={formData.targetRole}
              onChange={handleChange}
              required
            >
              <option value="All">All Users</option>
              <option value="Student">Students</option>
              <option value="Faculty">Faculty</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>Publishing Schedule</h2>

          <div className="form-row">
            <div className="input-group">
              <label>Publish Date *</label>

              <input
                type="date"
                name="publishDate"
                value={formData.publishDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Expiry Date *</label>

              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                min={formData.publishDate || undefined}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Announcement Status *</label>

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Published">Published</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onBack}
          >
            Cancel
          </button>

          <button type="submit" className="publish-btn">
            Create Announcement
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateAnnouncement;
