import React from "react";

const ToolTrackerModal = ({ checkedOutTools, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-faults">
        <h3 className="modal-title modal-title-center">Checked Out Tools</h3>
        <p className="modal-description">
          Scan a tool QR code to check it in or out.
        </p>
        {checkedOutTools.length === 0 ? (
          <p className="fault-description">No tools are currently checked out.</p>
        ) : (
          <div className="fault-list-container">
            {checkedOutTools.map((toolName) => (
              <div key={toolName} className="fault-item">
                <h5 className="fault-title">{toolName}</h5>
                <p className="fault-description">Checked out</p>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-secondary w-100 modal-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ToolTrackerModal;
