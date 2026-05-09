import React from "react";

const HelpModal = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-help">
        <div className="modal-card-header">
          <div className="modal-card-header-main">
            <h3 className="modal-card-title">Help</h3>
            <p className="modal-card-subtitle">AR maintenance operating guidance for field users.</p>
          </div>
        </div>

        <div className="modal-card-body">
          <div className="help-guide-section">
            <h4 className="help-guide-heading">1. Before Scanning</h4>
            <p className="help-description">
              Confirm camera permission is granted, ensure adequate lighting, and keep the marker flat and fully visible.
              Best results come from 20-50 cm distance with minimal glare.
            </p>
          </div>

          <div className="help-guide-section">
            <h4 className="help-guide-heading">2. During Marker Detection</h4>
            <p className="help-description">
              Hold the device steady until the cyan frame locks. When the action button appears, choose the required
              workflow: tool action, fault reporting, or repair guide.
            </p>
          </div>

          <div className="help-guide-section">
            <h4 className="help-guide-heading">3. Tool Check-In / Check-Out</h4>
            <p className="help-description">
              Scan the tool marker, confirm the action, then verify status in <strong>Track Tools</strong>. If a tool is
              already checked out, scan again to check it back in.
            </p>
          </div>

          <div className="help-guide-section">
            <h4 className="help-guide-heading">4. Fault Reporting</h4>
            <p className="help-description">
              Use <strong>Report Fault</strong> after scanning an asset marker. Include urgency and concise notes (symptoms,
              observed behaviour, and location) to support triage quality.
            </p>
          </div>

          <div className="help-guide-section">
            <h4 className="help-guide-heading">5. Repair Guide Workflow</h4>
            <p className="help-description">
              Progress through steps sequentially and only mark a fault as repaired after validation checks are complete.
              Review <strong>Active Faults</strong> to confirm status updates.
            </p>
          </div>

          <div className="help-guide-section">
            <h4 className="help-guide-heading">6. Safety and Session Control</h4>
            <p className="help-description">
              Follow site safety controls before physical intervention. Use <strong>Log Out</strong> when handing over the
              device to maintain audit integrity.
            </p>
          </div>
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

export default HelpModal;
