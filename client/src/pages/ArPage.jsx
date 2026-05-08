import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const ArPage = () => {
  // Declare all our variables used to load modals/other elements.
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [showToolTrackerModal, setShowToolTrackerModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);
  const [checkedOutToolIndexes, setCheckedOutToolIndexes] = useState([]);
  const [scanConfirmation, setScanConfirmation] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideMarkerIndex, setGuideMarkerIndex] = useState(null);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const checkedOutToolIndexesRef = useRef([]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/LogInPage");
  };

  useEffect(() => {
    checkedOutToolIndexesRef.current = checkedOutToolIndexes;
  }, [checkedOutToolIndexes]);

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

    if (marker.type === "tool") {
      setShowGuideModal(false);
      setGuideMarkerIndex(null);
      setScanConfirmation((currentConfirmation) => {
        if (currentConfirmation?.targetIndex === targetIndex) {
          return currentConfirmation;
        }

        const isCheckedOut = checkedOutToolIndexesRef.current.includes(targetIndex);

        return {
          targetIndex,
          toolLabel: marker.label,
          actionLabel: isCheckedOut ? "Check In" : "Check Out",
        };
      });
      return;
    }

    setScanConfirmation(null);
    setGuideMarkerIndex(targetIndex);
    setGuideStepIndex(0);
    setShowGuideModal(true);
  }, []);

  const handleTargetLost = useCallback(() => {
    // No action needed on marker loss for this flow.
  }, []);

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
      <ArScene onTargetFound={handleArTargetFound} onTargetLost={handleTargetLost} />

      <div className="ar-sidebar">
        <button className="btn btn-primary mb-3 w-75 sidebar-button" onClick={toggleFaultsModal}>
          View Active Faults
        </button>
        <button className="btn btn-secondary mb-3 w-75 sidebar-button" onClick={toggleToolTrackerModal}>
          Track Tools
        </button>
        <button className="btn btn-info mb-3 w-75 sidebar-button" onClick={toggleHelpModal}>
          Help
        </button>
        <button className="btn btn-danger w-75 sidebar-button" onClick={handleLogout}>
          Log Out
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
