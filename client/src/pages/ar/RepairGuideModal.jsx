import React from "react";

const MachineryGuideModal = ({ ArMarker, stepIndex, onPrevious, onNext, onClose }) => {
  if (!ArMarker || !ArMarker.guideSteps || ArMarker.guideSteps.length === 0) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-help">
        <h3 className="help-title">{ArMarker.label} Guide</h3>
        <p className="help-description">{ArMarker.guideSteps[stepIndex]}</p>
        <p className="modal-description">
          Step {stepIndex + 1} of {ArMarker.guideSteps.length}
        </p>
        <div className="d-flex justify-content-center gap-3">
          <button className="btn btn-outline-secondary" onClick={onPrevious}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <button className="btn btn-outline-secondary" onClick={onNext}>
            <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <button className="btn btn-secondary mt-3" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default MachineryGuideModal;
