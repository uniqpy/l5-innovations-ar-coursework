import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "bootstrap/dist/css/bootstrap.min.css";
import "./LogInPage.css";
import { API_BASE_URL } from "../config/api";

const LoginPage = ({ isAuthenticated, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/ArPage", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Login failed." }));
        setError(errorData.error || "Login failed.");
        return;
      }

      onLoginSuccess();
      navigate("/ArPage", { replace: true });
    } catch (err) {
      setError("Unable to reach server. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <p className="login-brand mb-2">AR Maintenance</p>
          <h1 className="login-title mb-2">Sign In</h1>
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label login-label" htmlFor="emailAddress">
                Email Address
              </label>
              <input
                id="emailAddress"
                type="email"
                autoComplete="username"
                className="form-control login-input"
                placeholder="you@company.com"
                value={email}
                onChange={(inputEvent) => setEmail(inputEvent.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label login-label" htmlFor="accountPassword">
                Password
              </label>
              <input
                id="accountPassword"
                type="password"
                autoComplete="current-password"
                className="form-control login-input"
                placeholder="Enter password"
                value={password}
                onChange={(inputEvent) => setPassword(inputEvent.target.value)}
                required
              />
            </div>

            <button className="btn login-submit w-100" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;

LoginPage.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
};
