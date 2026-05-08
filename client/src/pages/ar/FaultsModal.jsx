import React from "react";

const FaultsModal = ({ faults, selectedFault, onSelectFault, onBackToList, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-faults">
        {!selectedFault ? (
          <>
            <h3 className="modal-title modal-title-center">Active Faults</h3>
            <div className="fault-list-container">
              {faults.map((fault) => (
                <div
                  key={fault.id}
                  className="fault-item"
                  onClick={() => onSelectFault(fault)}
                >
                  <h5 className="fault-title">{fault.title}</h5>
                  <p className="fault-description">{fault.description}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary w-100 modal-close-button" onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <h3 className="modal-title">{selectedFault.title}</h3>
            <p className="modal-description">{selectedFault.description}</p>
            <div className="fault-detail-box">
              <p className="fault-detail-text">{selectedFault.details}</p>
            </div>
            <button className="btn btn-secondary w-100 fault-back-button" onClick={onBackToList}>
              Back to List
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FaultsModal;
