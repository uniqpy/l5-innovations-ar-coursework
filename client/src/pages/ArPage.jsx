import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "aframe";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import faultsData from '../data/faults.json';
import './ArPage.css';

const ArPage = () => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);
  const [cameraReady, setCameraReady] = useState(null);
  const [arLoaded, setArLoaded] = useState(false);
  const sceneRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAR = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraReady(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraReady(false);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.min.js";
      script.async = true;
      script.onload = () => setArLoaded(true);
      document.body.appendChild(script); 
    };
    loadAR();
  }, []);

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

      {/* AR Scene only renders if camera allowed */}
      {cameraReady === null && (
        <p style={{ textAlign: "center", marginTop: "50%" }}>
          Requesting camera permissions...
        </p>
      )}

        {cameraReady === false && (
          <div className="message-box">
            <p>Camera access was denied.</p>
            <p>Please enable camera permissions to use AR.</p>
          </div>
        )}

        {cameraReady === true && !arLoaded && (
          <p style={{ textAlign: "center", marginTop: "50%" }}>
            Loading AR...
          </p>
        )}

      {cameraReady === true && arLoaded && (
        <a-scene
          ref={sceneRef}
          vr-mode-ui="enabled: false"
          embedded
          arjs="sourceType: webcam; debugUIEnabled: false;"
          style={{ width: '100%', height: '100%' }}
        >
          <a-marker preset="hiro">
            <a-box position="0 0.5 0" color="red"></a-box>
          </a-marker>
          <a-entity camera></a-entity>
          </a-scene>
)}

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