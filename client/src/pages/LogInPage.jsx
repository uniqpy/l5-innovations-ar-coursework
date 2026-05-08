import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from "prop-types";
import 'bootstrap/dist/css/bootstrap.min.css';




const LoginPage = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    //send our username and password to server. 
    try {
      const response = await fetch("http://localhost:8080/LogInPage", {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      //we got the wrong username password pair
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Login failed");
        return;
      }
      //we got the right username password pair and now we have been given a token we can use to access the ar page.
      const data = await response.json();
      setToken(data);
      navigate("/ArPage");
    } catch (err) {
      setError("Server error. Please try again.");
      console.error(err);
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4">AR Maintaince Tool Log In</h2>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input
              type="email"
              className="form-control"
              id="floatingEmail"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="floatingEmail">Email address</label>
          </div>

          <div className="form-floating mb-3">
            <input
              type="password"
              className="form-control"
              id="floatingPassword"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="floatingPassword">Password</label>
          </div>
          <button className="btn btn-primary w-100" type="submit">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

LoginPage.propTypes = {
  setToken: PropTypes.func.isRequired
};