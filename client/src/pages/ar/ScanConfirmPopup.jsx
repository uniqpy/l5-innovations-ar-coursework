import React from "react";

const ScanConfirmPopup = ({ confirmation, onConfirm, onCancel }) => {
  if (!confirmation) return null;

  return (
    <div className="message-box scan-confirm-box">
      <h5 className="mb-3">{confirmation.toolLabel}</h5>
      <p className="mb-3">{confirmation.actionLabel} this tool?</p>
      <div className="d-flex justify-content-center gap-2">
        <button className="btn btn-success" onClick={onConfirm}>
          Confirm
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ScanConfirmPopup;
