import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import faultsData from "../data/faults.json";
import "./ArPage.css";
import ArScene from "./ar/ArScene";
import HelpModal from "./ar/HelpModal";
import FaultsModal from "./ar/FaultsModal";
import ToolTrackerModal from "./ar/ToolTrackerModal";
import ScanConfirmPopup from "./ar/ScanConfirmPopup";
import RepairGuideModal from "./ar/RepairGuideModal";
import { MARKERS } from "./ar/markers";
import { API_BASE_URL } from "../config/api";

const FeatherIcon = ({ name }) => {
  const sharedProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "alert-triangle") {
    return (
      <svg className="taskbar-icon" viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  }

  if (name === "tool") {
    return (
      <svg className="taskbar-icon" viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2 2 0 1 1-2.83-2.83l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
  }

  if (name === "help-circle") {
    return (
      <svg className="taskbar-icon" viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  }

  if (name === "log-out") {
    return (
      <svg className="taskbar-icon" viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    );
  }

  return null;
};

const ArPage = ({ onLoggedOut }) => {
  // Declare all our variables used to load modals/other elements.
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [showToolTrackerModal, setShowToolTrackerModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);
  const [checkedOutToolIndexes, setCheckedOutToolIndexes] = useState([]);
  const [scanConfirmation, setScanConfirmation] = useState(null);
  const [scanActionPrompt, setScanActionPrompt] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideMarkerIndex, setGuideMarkerIndex] = useState(null);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const checkedOutToolIndexesRef = useRef([]);
  const showGuideModalRef = useRef(false);
  const scanConfirmationRef = useRef(null);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      onLoggedOut();
      navigate("/LogInPage", { replace: true });
    }
  };

  useEffect(() => {
    checkedOutToolIndexesRef.current = checkedOutToolIndexes;
  }, [checkedOutToolIndexes]);

  useEffect(() => {
    showGuideModalRef.current = showGuideModal;
  }, [showGuideModal]);

  useEffect(() => {
    scanConfirmationRef.current = scanConfirmation;
  }, [scanConfirmation]);

  const toggleHelpModal = () => {
    setShowHelpModal((currentState) => !currentState);
  };

  const toggleFaultsModal = () => {
    setShowFaultsModal((currentState) => !currentState);
    setSelectedFault(null);
  };

  const toggleToolTrackerModal = () => {
    setShowToolTrackerModal((currentState) => !currentState);
  };

  const handleSelectFault = (fault) => {
    setSelectedFault(fault);
  };

  const handleBackToFaultsList = () => {
    setSelectedFault(null);
  };

  const handleArTargetFound = useCallback((targetIndex) => {
    const marker = MARKERS[targetIndex];
    if (!marker) return;

    if (showGuideModalRef.current || scanConfirmationRef.current) {
      return;
    }

    if (marker.type === "tool") {
      setScanActionPrompt((currentPrompt) => {
        if (currentPrompt?.targetIndex === targetIndex && currentPrompt.mode === "tool") {
          return currentPrompt;
        }

        const isCheckedOut = checkedOutToolIndexesRef.current.includes(targetIndex);

        return {
          targetIndex,
          mode: "tool",
          markerLabel: marker.label,
          buttonLabel: `${isCheckedOut ? "Check In" : "Check Out"} ${marker.label}`,
        };
      });
      return;
    }

    setScanActionPrompt((currentPrompt) => {
      if (currentPrompt?.targetIndex === targetIndex && currentPrompt.mode === "guide") {
        return currentPrompt;
      }

      return {
        targetIndex,
        mode: "guide",
        markerLabel: marker.label,
        buttonLabel: `Open ${marker.label} Guide`,
      };
    });
  }, []);

  const handleTargetLost = useCallback((targetIndex) => {
    setScanActionPrompt((currentPrompt) => {
      if (!currentPrompt) return currentPrompt;
      if (currentPrompt.targetIndex !== targetIndex) return currentPrompt;
      return null;
    });
  }, []);

  const handleOpenScanAction = () => {
    if (!scanActionPrompt) return;

    const marker = MARKERS[scanActionPrompt.targetIndex];
    if (!marker) {
      setScanActionPrompt(null);
      return;
    }

    if (scanActionPrompt.mode === "tool") {
      const isCheckedOut = checkedOutToolIndexesRef.current.includes(scanActionPrompt.targetIndex);
      setShowGuideModal(false);
      setGuideMarkerIndex(null);
      setScanConfirmation({
        targetIndex: scanActionPrompt.targetIndex,
        toolLabel: marker.label,
        actionLabel: isCheckedOut ? "Check In" : "Check Out",
      });
      setScanActionPrompt(null);
      return;
    }

    setScanConfirmation(null);
    setGuideMarkerIndex(scanActionPrompt.targetIndex);
    setGuideStepIndex(0);
    setShowGuideModal(true);
    setScanActionPrompt(null);
  };

  //check to make sure user meant to scan that tool, if so add to list of tools that are tracked.
  const handleConfirmToolAction = () => {
    if (!scanConfirmation) return;
    const { targetIndex } = scanConfirmation;

    setCheckedOutToolIndexes((currentCheckedOut) => {
      if (currentCheckedOut.includes(targetIndex)) {
        return currentCheckedOut.filter((index) => index !== targetIndex);
      }
      return [...currentCheckedOut, targetIndex];
    });

    setScanConfirmation(null);
  };

  const checkedOutTools = checkedOutToolIndexes
    .map((index) => MARKERS[index]?.label || `Marker ${index}`)
    .sort((a, b) => a.localeCompare(b));

  //repair guide logic.
  const activeGuideMarker = guideMarkerIndex !== null ? MARKERS[guideMarkerIndex] : null;
  const guideSteps = activeGuideMarker?.guideSteps || [];

  const goToPreviousGuideStep = () => {
    if (guideSteps.length === 0) return;
    setGuideStepIndex((currentStep) => (currentStep - 1 + guideSteps.length) % guideSteps.length);
  };

  const goToNextGuideStep = () => {
    if (guideSteps.length === 0) return;
    setGuideStepIndex((currentStep) => (currentStep + 1) % guideSteps.length);
  };

  return (
    <div className="ar-page-container" style={{ display: "flex", height: "100vh" }}>
      <div className="card ar-scene-card border-0 shadow-lg">
        <ArScene onTargetFound={handleArTargetFound} onTargetLost={handleTargetLost} />
      </div>

      <div className="ar-taskbar" role="toolbar" aria-label="AR actions">
        <button className="btn btn-primary taskbar-button" onClick={toggleFaultsModal}>
          <FeatherIcon name="alert-triangle" />
          <span className="taskbar-label">Active Faults</span>
        </button>
        <button className="btn btn-secondary taskbar-button" onClick={toggleToolTrackerModal}>
          <FeatherIcon name="tool" />
          <span className="taskbar-label">Track Tools</span>
        </button>
        <button className="btn btn-info taskbar-button" onClick={toggleHelpModal}>
          <FeatherIcon name="help-circle" />
          <span className="taskbar-label">Help</span>
        </button>
        <button className="btn btn-danger taskbar-button" onClick={handleLogout}>
          <FeatherIcon name="log-out" />
          <span className="taskbar-label">Log Out</span>
        </button>
      </div>

      {showHelpModal && <HelpModal onClose={toggleHelpModal} />}

      {showFaultsModal && (
        <FaultsModal
          faults={faultsData.faults}
          selectedFault={selectedFault}
          onSelectFault={handleSelectFault}
          onBackToList={handleBackToFaultsList}
          onClose={toggleFaultsModal}
        />
      )}

      {showToolTrackerModal && (
        <ToolTrackerModal checkedOutTools={checkedOutTools} onClose={toggleToolTrackerModal} />
      )}

      <ScanConfirmPopup
        confirmation={scanConfirmation}
        onConfirm={handleConfirmToolAction}
        onCancel={() => setScanConfirmation(null)}
      />

      {scanActionPrompt && (
        <div className="scan-action-toast">
          <button className="btn btn-dark scan-action-trigger" onClick={handleOpenScanAction}>
            {scanActionPrompt.buttonLabel}
          </button>
        </div>
      )}

      {showGuideModal && (
        <RepairGuideModal
          marker={activeGuideMarker}
          stepIndex={guideStepIndex}
          onPrevious={goToPreviousGuideStep}
          onNext={goToNextGuideStep}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
};

export default ArPage;

ArPage.propTypes = {
  onLoggedOut: PropTypes.func.isRequired,
};
