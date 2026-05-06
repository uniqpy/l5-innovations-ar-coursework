import React, { useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import faultsData from '../data/faults.json';
import './ArPage.css';

const ArScene = (() => {
  const [textIndex, setTextIndex] = useState(0);
  const texts = ["hello this is a gas leak", "you need to patch this with tape", "but first cut of the pump that supplies the gas"];
  const textRef = useRef(null);
  const boxRef = useRef(null);


  useEffect(() => {
    document.querySelectorAll('canvas').forEach(canvas => {
      canvas.setAttribute('willReadFrequently', 'true');
    });

    const boxEl = boxRef.current;
    if (!boxEl) return;

    const handleClick = () => {
      const nextIndex = (textIndex + 1) % texts.length;
      setTextIndex(nextIndex);
      if (textRef.current) {
        textRef.current.setAttribute('value', texts[nextIndex]);
      }
    };

    boxEl.addEventListener('touchstart', handleClick);

    return () => {
      boxEl.removeEventListener('touchstart', handleClick);
    };
  }, [textIndex, texts]);

  return (
    <a-scene className="ar-scene" embedded xrweb arjs="sourceType: webcam; debugUIEnabled: false;" vr-mode-ui="enabled: false" renderer="logarithmicDepthBuffer: true;">
      <a-marker preset="hiro">
        <a-box 
          ref={boxRef}
          position="0 0.5 0"
          material="color: #FF6b35; opacity: 0.7"
          scale="0.5 0.1 0.5"
        />
        <a-text
          ref = {textRef}
          value = {texts[textIndex]}
          position = "0 0.7 0"
          color = "#000"
          material = "color: #000000; opacity: 0.8"
          align="center"
        />
      </a-marker>
      <a-box
        position="1 0.5 -2"
        material="color: #ff3b5e; opacity: 0.7"
        scale="0.5 0.5 0.5 "
      />
      <a-entity camera></a-entity>
    </a-scene>
  );
});

const ArPage = () => {
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [showReportFaultsModal, setshowReportFaultsModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);


  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/LogInPage");
  };

  const toggleHelpModal = () => {
    setShowHelpModal(!showHelpModal);
  };

  const toggleReportFaultsModal = () => {
    setshowReportFaultsModal(!showReportFaultsModal);
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
      {/* Report Faults Modal */}
    </div>
  );
};

export default ArPage;