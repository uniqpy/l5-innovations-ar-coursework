import React, { useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import faultsData from '../data/faults.json';
import './ArPage.css';

const ArScene = memo(() => {
  useEffect(() => {
    // Set willReadFrequently on all canvases to address performance warning
    document.querySelectorAll('canvas').forEach(canvas => {
      canvas.setAttribute('willReadFrequently', 'true');
    });
  }, []);

  return (
    <a-scene className="ar-scene" arjs="sourceType: webcam; debugUIEnabled: false;" vr-mode-ui="enabled: false" renderer="logarithmicDepthBuffer: true;">
      <a-marker preset="hiro">
        <a-box 
          position="0 0.5 0"
          material="color: #FF6b35; opacity: 0.7"
          scale="0.5 0.1 0.5"
        />
      </a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  );
});

const ArPage = () => {
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);


  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/LogInPage");
  };

  const toggleHelpModal = () => {
    setShowHelpModal(!showHelpModal);
  };

  const toggleFaultsModal = () => {
    setShowFaultsModal(!showFaultsModal);
    setSelectedFault(null); // Reset selected fault when closing
  };

  const handleSelectFault = (fault) => {
    setSelectedFault(fault);
  };

  const handleBackToFaultsList = () => {
    setSelectedFault(null);
  };

  return (
    <div className="ar-page-container" style = {{display: 'flex', height: '100vh'}}>

      <ArScene />


      {/* Sidebar */}
      <div className="ar-sidebar">
        <button
          className="btn btn-primary mb-3 w-75 sidebar-button"
          onClick={toggleFaultsModal}
        >
          View All Active Faults
        </button>
        <button
          className="btn btn-secondary mb-3 w-75 sidebar-button"
        >
          Tool Checker Mode
        </button>
        <button
          className="btn btn-info mb-3 w-75 sidebar-button"
          onClick={toggleHelpModal}
        >
          Help
        </button>
        <button
          className="btn btn-danger w-75 sidebar-button"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>


      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-help">
            <h3 className="help-title">Help</h3>
            <p className="help-description">example test, if you need help there are many sources that you can go to something something</p>
            <button
              className="btn btn-primary"
              onClick={toggleHelpModal}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Faults Modal */}
      {showFaultsModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-faults">
            {!selectedFault ? (
              <>
                <h3 className="modal-title modal-title-center">Active Faults</h3>
                <div className="fault-list-container">
                  {faultsData.faults.map((fault) => (
                    <div
                      key={fault.id}
                      className="fault-item"
                      onClick={() => handleSelectFault(fault)}
                    >
                      <h5 className="fault-title">{fault.title}</h5>
                      <p className="fault-description">{fault.description}</p>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-secondary w-100 modal-close-button"
                  onClick={toggleFaultsModal}
                >
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
                <button
                  className="btn btn-secondary w-100 fault-back-button"
                  onClick={handleBackToFaultsList}
                >
                  Back to List
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ArPage;