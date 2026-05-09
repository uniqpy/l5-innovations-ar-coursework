import React from "react";

const ScanConfirmPopup = ({ confirmation, onConfirm, onCancel }) => {
  if (!confirmation) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-confirm">
        <div className="modal-card-header">
          <div className="modal-card-header-main">
            <h3 className="modal-card-title">Tool Scan Confirmation</h3>
            <p className="modal-card-subtitle">{confirmation.toolLabel}</p>
          </div>
        </div>

        <div className="modal-card-body">
          <p className="modal-description">{confirmation.actionLabel} this tool?</p>
        </div>

        <div className="modal-card-footer">
          <button className="btn btn-primary" onClick={onCancel}>
            Close
          </button>
          <button className="btn btn-secondary" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanConfirmPopup;
