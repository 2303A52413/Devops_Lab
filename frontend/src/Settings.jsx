import React, { useEffect, useState } from "react";
import "./Settings.css";
import { getSettings, updateSettings } from "./api";

function Settings({ onBack }) {
  const savedSettings = JSON.parse(
    localStorage.getItem("noticeBoardSettings") || "{}"
  );

  const [university, setUniversity] = useState(
    savedSettings.university || "SR University"
  );

  const [emailNotifications, setEmailNotifications] = useState(
    savedSettings.emailNotifications ?? true
  );

  const [expiryDays, setExpiryDays] = useState(
    savedSettings.expiryDays || "7"
  );

  const [autoExpire, setAutoExpire] = useState(
    savedSettings.autoExpire ?? true
  );

  const [message, setMessage] = useState("");

  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data) {
          if (data.university) setUniversity(data.university);
          if (data.emailNotifications !== undefined) setEmailNotifications(data.emailNotifications);
          if (data.expiryDays) setExpiryDays(data.expiryDays);
          if (data.autoExpire !== undefined) setAutoExpire(data.autoExpire);
          localStorage.setItem("noticeBoardSettings", JSON.stringify(data));
        }
      })
      .catch((err) => {
        console.warn("Could not load remote settings, using local preferences:", err.message);
      });
  }, []);

  const saveSettings = async () => {
    const settingsData = {
      university,
      emailNotifications,
      expiryDays,
      autoExpire,
    };

    try {
      const updated = await updateSettings(settingsData);
      localStorage.setItem(
        "noticeBoardSettings",
        JSON.stringify(updated || settingsData)
      );
      setMessage("Settings saved successfully!");
      alert("Settings saved successfully!");
    } catch (err) {
      localStorage.setItem(
        "noticeBoardSettings",
        JSON.stringify(settingsData)
      );
      setMessage("Settings saved locally (" + err.message + ")");
      alert("Settings saved locally!");
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <h1>Settings</h1>
        <p>Configure your Digital Notice Board preferences.</p>
      </div>

      {message && <p style={{ color: "#059669", fontWeight: 600, marginBottom: "1rem" }}>{message}</p>}

      <div className="settings-card">
        <h2>University Information</h2>

        <label>University Name</label>
        <input
          type="text"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
        />
      </div>

      <div className="settings-card">
        <h2>Notification Preferences</h2>

        <div className="settings-option">
          <div>
            <h3>Email Notifications</h3>
            <p>Receive email notifications for new announcements.</p>
          </div>

          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
        </div>
      </div>

      <div className="settings-card">
        <h2>Announcement Expiry Settings</h2>

        <div className="settings-option">
          <div>
            <h3>Automatic Expiry</h3>
            <p>Automatically expire notices after the selected period.</p>
          </div>

          <input
            type="checkbox"
            checked={autoExpire}
            onChange={(e) => setAutoExpire(e.target.checked)}
          />
        </div>

        <label>Default Expiry Period</label>

        <select
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
        >
          <option value="3">3 Days</option>
          <option value="7">7 Days</option>
          <option value="15">15 Days</option>
          <option value="30">30 Days</option>
        </select>
      </div>

      <button className="settings-save-btn" onClick={saveSettings}>
        Save Settings
      </button>
    </div>
  );
}

export default Settings;
