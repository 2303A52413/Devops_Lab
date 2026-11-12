import Dashboard from "./Dashboard";
import React, { useEffect, useState } from "react";
import "./App.css";
import { apiRequest } from "./api";

function App() {
  const [user, setUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [session, setup] = await Promise.all([
          localStorage.getItem("noticeBoardToken")
            ? apiRequest("/auth/me")
            : Promise.resolve(null),
          apiRequest("/auth/setup-status"),
        ]);
        if (session?.user) setUser(session.user);
        setSetupRequired(setup.setupRequired);
      } catch {
        localStorage.removeItem("noticeBoardToken");
        localStorage.removeItem("noticeBoardUser");
        try {
          const setup = await apiRequest("/auth/setup-status");
          setSetupRequired(setup.setupRequired);
        } catch (requestError) {
          setError(requestError.message);
        }
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    let endpoint = "/auth/login";
    if (setupRequired) {
      endpoint = "/auth/setup";
    } else if (isRegistering) {
      endpoint = "/auth/register";
    }

    try {
      const result = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("noticeBoardToken", result.token);
      localStorage.setItem("noticeBoardUser", JSON.stringify(result.user));
      setUser(result.user);
      setSetupRequired(false);
      setIsRegistering(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("noticeBoardToken");
    localStorage.removeItem("noticeBoardUser");
    setUser(null);
  };

  if (checkingSession) {
    return <div className="login-loading">Connecting to your notice board…</div>;
  }
  if (user) return <Dashboard user={user} onLogout={handleLogout} />;

  let headingTitle = "Welcome Back!";
  let headingSubtitle = "Sign in to access your notice board";
  let submitButtonText = "Sign In";

  if (setupRequired) {
    headingTitle = "Set Up Administrator";
    headingSubtitle = "Create the first administrator account";
    submitButtonText = "Create Administrator";
  } else if (isRegistering) {
    headingTitle = "Create an Account";
    headingSubtitle = "Register to access university notices";
    submitButtonText = "Register Account";
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="university-logo">
          <div className="logo-icon">SR</div>
          <h2>SR UNIVERSITY</h2>
        </div>

        <div className="welcome-content">
          <h1>Digital Notice Board</h1>

          <p>
            Stay informed. Stay connected.
            <br />
            Your university announcements, all in one place.
          </p>

          <div className="notice-preview">
            <div className="notice-icon">📢</div>

            <div>
              <h3>University Announcements</h3>
              <p>
                Access academic notices, events, examination updates,
                and important information.
              </p>
            </div>
          </div>
        </div>

        <div className="left-footer">
          © 2026 SR University | Digital Notice Board
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-heading">
            <h1>{headingTitle}</h1>
            <p>{headingSubtitle}</p>
          </div>

          <form onSubmit={handleLogin}>
            {(setupRequired || isRegistering) && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input id="name" name="name" type="text" placeholder="Enter your full name" required />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your university email"
                required
              />
            </div>

            {isRegistering && !setupRequired && (
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" defaultValue="Student">
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder={setupRequired || isRegistering ? "At least 8 characters" : "Enter your password"}
                minLength={setupRequired || isRegistering ? 8 : undefined}
                required
              />
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="login-button">
              {submitButtonText}
            </button>
          </form>

          <div className="login-bottom">
            {setupRequired ? (
              <p>This one-time setup is only available before the first account is created.</p>
            ) : (
              <p>
                {isRegistering ? "Already have an account? " : "New to the notice board? "}
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                  }}
                >
                  {isRegistering ? "Sign in here" : "Register here"}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
