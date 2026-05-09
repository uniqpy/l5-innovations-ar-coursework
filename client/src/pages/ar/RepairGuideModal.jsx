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
        <div className="modal-card-header">
          <div className="modal-card-header-main">
            <h3 className="modal-card-title">{guideMarker.label} Guide</h3>
            <p className="modal-card-subtitle">
              Step {stepIndex + 1} of {guideMarker.guideSteps.length}
            </p>
          </div>
        </div>

        <div className="modal-card-body">
          <p className="help-description">{guideMarker.guideSteps[stepIndex]}</p>
        </div>

        <div className="modal-card-footer modal-card-footer-split">
          <div className="modal-inline-actions">
            <button className="btn btn-secondary" onClick={onPrevious} aria-label="Previous step">
              <i className="bi bi-arrow-left"></i>
            </button>
            <button className="btn btn-secondary" onClick={onNext} aria-label="Next step">
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>

          <div className="modal-inline-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
            {canMarkRepaired && (
              <button className="btn btn-primary" onClick={onMarkRepaired} disabled={Boolean(isMarkingRepaired)}>
                {isMarkingRepaired ? "Marking..." : "Mark as Repaired"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairGuideModal;
