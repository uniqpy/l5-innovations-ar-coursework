import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import faultsData from '../data/faults.json';
import './ArPage.css';
import TargetSrc from '../assets/mind_markers/qr_code_markers.mind?url';


const ArScene = (() => {
  const sceneRef = useRef(null);

  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return undefined;

    const onArReady = () => {
      console.info("MindAR ready");
    };

    const onArError = (event) => {
      console.error("MindAR error", event?.detail);
    };

    sceneEl.addEventListener("arReady", onArReady);
    sceneEl.addEventListener("arError", onArError);

    return () => {
      sceneEl.removeEventListener("arReady", onArReady);
      sceneEl.removeEventListener("arError", onArError);
      const arSystem = sceneEl.systems["mindar-image-system"];
      if (arSystem) {
        arSystem.stop();
      }
    };
  }, []);

  return (
    <a-scene
      className="ar-scene"
      ref={sceneRef}
      mindar-image={`imageTargetSrc: ${TargetSrc}; maxTrack: 3; autoStart: true; uiLoading: yes; uiError: yes; uiScanning: no;`}
      color-space="sRGB"
      embedded
      renderer="colorManagement: true, physicallyCorrectLights"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
    >
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      <a-entity mindar-image-target="targetIndex: 0">
        <a-box
          position="0 0 0.08"
          rotation="0 0 0"
          width="0.55"
          height="0.35"
          depth="0.12"
          color="#17c3b2"
          material="metalness: 0.2; roughness: 0.5; opacity: 0.9; transparent: true"
        ></a-box>
        <a-text
          value="Spanner"
          position="0 0.32 0.08"
          align="center"
          color="#ffd166"
          width="1.6"
          shader="msdf"
        ></a-text>
      </a-entity>

      <a-entity mindar-image-target="targetIndex: 1">
        <a-box
          position="0 0 0.08"
          rotation="0 0 0"
          width="0.55"
          height="0.35"
          depth="0.12"
          color="#17c3b2"
          material="metalness: 0.2; roughness: 0.5; opacity: 0.9; transparent: true"
        ></a-box>
        <a-text
          value="Screwdriver "
          position="0 0.32 0.08"
          align="center"
          color="#ffd166"
          width="1.6"
          shader="msdf"
        ></a-text>
      </a-entity>

      <a-entity mindar-image-target="targetIndex: 2">
        <a-box
          position="0 0 0.08"
          rotation="0 0 0"
          width="0.55"
          height="0.35"
          depth="0.12"
          color="#17c3b2"
          material="metalness: 0.2; roughness: 0.5; opacity: 0.9; transparent: true"
        ></a-box>
        <a-text
          value="Electric Box"
          position="0 0.32 0.08"
          align="center"
          color="#ffd166"
          width="1.6"
          shader="msdf"
        ></a-text>
      </a-entity>
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
