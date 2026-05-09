import React from "react";

const ToolTrackerModal = ({ checkedOutTools, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-faults">
        <div className="modal-card-header">
          <div className="modal-card-header-main">
            <h3 className="modal-card-title">Checked Out Tools</h3>
            <p className="modal-card-subtitle">Current tool custody based on recent marker scan actions.</p>
          </div>
        </div>

        <div className="modal-card-body">
          {checkedOutTools.length === 0 ? (
            <p className="fault-description">No tools are currently checked out.</p>
          ) : (
            <div className="fault-list-container">
              {checkedOutTools.map((tool) => (
                <div key={tool.id || tool.markerCode || tool.name} className="fault-item">
                  <h5 className="fault-title">{tool.name}</h5>
                  <p className="fault-description">
                    Checked out{tool.lastCheckedOutByEmail ? ` by ${tool.lastCheckedOutByEmail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-card-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolTrackerModal;
