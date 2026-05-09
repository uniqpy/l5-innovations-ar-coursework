import React from "react";

const RepairGuideModal = ({
  marker,
  ArMarker,
  stepIndex,
  onPrevious,
  onNext,
  onClose,
  onMarkRepaired,
  isMarkingRepaired,
}) => {
  const guideMarker = marker || ArMarker;
  if (!guideMarker || !guideMarker.guideSteps || guideMarker.guideSteps.length === 0) return null;
  const isFinalStep = stepIndex === guideMarker.guideSteps.length - 1;
  const canMarkRepaired = typeof onMarkRepaired === "function" && isFinalStep;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-help">
        <h3 className="help-title">{guideMarker.label} Guide</h3>
        <p className="help-description">{guideMarker.guideSteps[stepIndex]}</p>
        <p className="modal-description">
          Step {stepIndex + 1} of {guideMarker.guideSteps.length}
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
        {canMarkRepaired && (
          <button className="btn btn-success mt-2" onClick={onMarkRepaired} disabled={Boolean(isMarkingRepaired)}>
            {isMarkingRepaired ? "Marking..." : "Mark as Repaired"}
          </button>
        )}
      </div>
    </div>
  );
};

export default RepairGuideModal;
