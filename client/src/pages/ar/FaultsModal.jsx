import React from "react";

const FaultsModal = ({ faults, selectedFault, onSelectFault, onBackToList, onClose }) => {
  const isListView = !selectedFault;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-faults">
        <div className="modal-card-header">
          <div className="modal-card-header-main">
            <h3 className="modal-card-title">{isListView ? "Active Faults" : selectedFault.title}</h3>
            <p className="modal-card-subtitle">
              {isListView
                ? "Current reported issues requiring attention."
                : "Detailed fault context for field action."}
            </p>
          </div>
        </div>

        <div className="modal-card-body">
          {isListView ? (
            faults.length === 0 ? (
              <p className="fault-description">No active faults yet.</p>
            ) : (
              <div className="fault-list-container">
                {faults.map((fault) => (
                  <div key={fault.id} className="fault-item" onClick={() => onSelectFault(fault)}>
                    <h5 className="fault-title">{fault.title}</h5>
                    <p className="fault-description">{fault.description}</p>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              <p className="modal-description">{selectedFault.description}</p>
              <div className="fault-detail-box">
                <p className="fault-detail-text">{selectedFault.details}</p>
              </div>
            </>
          )}
        </div>

        <div className="modal-card-footer">
          {isListView ? (
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onBackToList}>
                Back to List
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaultsModal;
