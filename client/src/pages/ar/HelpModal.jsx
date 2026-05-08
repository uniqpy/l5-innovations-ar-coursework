import React from "react";

const HelpModal = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-help">
        <h3 className="help-title">Help</h3>
        <p className="help-description">
          example test, if you need help there are many sources that you can go to something something
        </p>
        <button className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default HelpModal;
