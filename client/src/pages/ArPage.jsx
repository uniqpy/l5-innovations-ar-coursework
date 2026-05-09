import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./ArPage.css";
import ArScene from "./ar/ArScene";
import HelpModal from "./ar/HelpModal";
import FaultsModal from "./ar/FaultsModal";
import FaultReportModal from "./ar/FaultReportModal";
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
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFaultsModal, setShowFaultsModal] = useState(false);
  const [showFaultReportModal, setShowFaultReportModal] = useState(false);
  const [showToolTrackerModal, setShowToolTrackerModal] = useState(false);
  const [selectedFault, setSelectedFault] = useState(null);
  const [faults, setFaults] = useState([]);
  const [faultTypes, setFaultTypes] = useState([]);
  const [tools, setTools] = useState([]);
  const [faultReportNotice, setFaultReportNotice] = useState("");
  const [reportMarkerIndex, setReportMarkerIndex] = useState(null);
  const [scanConfirmation, setScanConfirmation] = useState(null);
  const [scanActionPrompt, setScanActionPrompt] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideMarker, setGuideMarker] = useState(null);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [isMarkingRepaired, setIsMarkingRepaired] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const toolsByQrRef = useRef({});
  const showGuideModalRef = useRef(false);
  const scanConfirmationRef = useRef(null);

  const apiRequest = useCallback(async (path, method = "GET", body = null) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawBody = await response.text();
    let data = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch (_parseError) {
        data = { error: rawBody };
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `${response.status} ${response.statusText}` || "Request failed.");
    }
    return data;
  }, []);

  const fetchFaults = useCallback(async () => {
    const responseData = await apiRequest("/api/recievefaults", "POST", {});
    setFaults(Array.isArray(responseData.faults) ? responseData.faults : []);
  }, [apiRequest]);

  const fetchFaultTypes = useCallback(async () => {
    const responseData = await apiRequest("/api/faulttypes", "GET");
    setFaultTypes(Array.isArray(responseData.faultTypes) ? responseData.faultTypes : []);
  }, [apiRequest]);

  const fetchTools = useCallback(async () => {
    const responseData = await apiRequest("/api/tools", "GET");
    setTools(Array.isArray(responseData.tools) ? responseData.tools : []);
  }, [apiRequest]);

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
    const nextByQr = {};
    tools.forEach((tool) => {
      if (tool.qrCode) {
        nextByQr[tool.qrCode] = tool;
      }
    });
    toolsByQrRef.current = nextByQr;
  }, [tools]);

  useEffect(() => {
    showGuideModalRef.current = showGuideModal;
  }, [showGuideModal]);

  useEffect(() => {
    scanConfirmationRef.current = scanConfirmation;
  }, [scanConfirmation]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await Promise.all([fetchFaults(), fetchFaultTypes(), fetchTools()]);
      } catch (error) {
        if (isMounted) {
          setFaultReportNotice(error.message || "Unable to load AR data.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchFaults, fetchFaultTypes, fetchTools]);

  const toggleHelpModal = () => {
    setShowHelpModal((currentState) => !currentState);
  };

  const toggleFaultsModal = () => {
    setShowFaultsModal((currentState) => !currentState);
    setSelectedFault(null);
  };

  const toggleFaultReportModal = () => {
    setShowFaultReportModal((currentState) => {
      const nextState = !currentState;
      if (nextState) {
        setReportMarkerIndex(scanActionPrompt?.mode === "fault" ? scanActionPrompt.targetIndex : null);
      } else {
        setReportMarkerIndex(null);
      }
      return nextState;
    });
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

  const closeGuideModal = () => {
    setShowGuideModal(false);
    setGuideMarker(null);
    setIsMarkingRepaired(false);
  };

  const handleSubmitFaultReport = async (reportInput) => {
    const reportMarker = reportMarkerIndex !== null ? MARKERS[reportMarkerIndex] : null;
    const selectedFaultType = faultTypes.find((faultType) => faultType.name === reportInput.typeOfFault);

    if (!selectedFaultType && !reportMarker?.assetFaultQrCode) {
      throw new Error("Select a known fault type or scan a registered fault QR marker.");
    }

    const notesSegments = [
      reportInput.notes?.trim(),
      reportInput.location?.trim() ? `Location: ${reportInput.location.trim()}` : "",
      reportInput.faultyPart?.trim() ? `Part: ${reportInput.faultyPart.trim()}` : "",
    ].filter(Boolean);

    const responseData = await apiRequest("/api/reportfault", "POST", {
      faultTypeId: selectedFaultType?.id || null,
      faultTypeName: reportInput.typeOfFault,
      assetId: reportMarker?.assetId || null,
      assetLabel: reportInput.location || reportInput.faultyPart || reportMarker?.label || "",
      assetFaultQrCode: reportMarker?.assetFaultQrCode || null,
      urgency: reportInput.urgency,
      notes: notesSegments.join(" | "),
    });

    if (responseData.fault) {
      setFaults((currentFaults) => [responseData.fault, ...currentFaults]);
      setSelectedFault(responseData.fault);
    } else {
      await fetchFaults();
      setSelectedFault(null);
    }

    setShowFaultReportModal(false);
    setReportMarkerIndex(null);
    setShowFaultsModal(true);
    setFaultReportNotice("Fault report submitted.");
  };

  const handleArTargetFound = useCallback((targetIndex) => {
    const marker = MARKERS[targetIndex];
    if (!marker) return;

    if (showGuideModalRef.current || scanConfirmationRef.current) {
      return;
    }

    if (marker.type === "tool") {
      const toolStatus = marker.qrCode ? toolsByQrRef.current[marker.qrCode] : null;
      const isCheckedOut = Boolean(toolStatus?.isCheckedOut);

      setScanActionPrompt({
        targetIndex,
        mode: "tool",
        markerLabel: marker.label,
        buttonLabel: `${isCheckedOut ? "Check In" : "Check Out"} ${marker.label}`,
      });
      return;
    }

    setScanActionPrompt({
      targetIndex,
      mode: "fault",
      markerLabel: marker.label,
      buttonLabel: `Open ${marker.label} Guide`,
    });
  }, []);

  const handleTargetLost = useCallback((targetIndex) => {
    setScanActionPrompt((currentPrompt) => {
      if (!currentPrompt) return currentPrompt;
      if (currentPrompt.targetIndex !== targetIndex) return currentPrompt;
      return null;
    });
  }, []);

  const handleOpenScanAction = async () => {
    if (!scanActionPrompt) return;

    const marker = MARKERS[scanActionPrompt.targetIndex];
    if (!marker) {
      setScanActionPrompt(null);
      return;
    }

    if (scanActionPrompt.mode === "tool") {
      if (!marker.qrCode) {
        setFaultReportNotice("This tool marker has no QR mapping.");
        setScanActionPrompt(null);
        return;
      }

      const currentTool = toolsByQrRef.current[marker.qrCode];
      const isCheckedOut = Boolean(currentTool?.isCheckedOut);
      setShowGuideModal(false);
      setGuideMarker(null);
      setScanConfirmation({
        targetIndex: scanActionPrompt.targetIndex,
        toolLabel: marker.label,
        actionLabel: isCheckedOut ? "Check In" : "Check Out",
        actionEndpoint: isCheckedOut ? "/api/scantoolin" : "/api/scantoolout",
        qrCode: marker.qrCode,
      });
      setScanActionPrompt(null);
      return;
    }

    try {
      const responseData = await apiRequest("/api/fetchstepbystep", "POST", {
        assetFaultQrCode: marker.assetFaultQrCode || null,
      });
      const guideSteps = Array.isArray(responseData.steps) ? responseData.steps : [];

      if (guideSteps.length === 0) {
        setFaultReportNotice("No guide steps configured for this marker yet.");
        setScanActionPrompt(null);
        return;
      }

      setScanConfirmation(null);
      setGuideMarker({
        ...marker,
        guideSteps,
        faultTypeId: responseData.faultTypeId || null,
      });
      setGuideStepIndex(0);
      setIsMarkingRepaired(false);
      setShowGuideModal(true);
      setScanActionPrompt(null);
    } catch (error) {
      setFaultReportNotice(error.message || "Unable to load repair guide.");
      setScanActionPrompt(null);
    }
  };

  const handleMarkGuideFaultRepaired = async () => {
    if (!guideMarker) return;

    try {
      setIsMarkingRepaired(true);
      const responseData = await apiRequest("/api/markfaultrepaired", "POST", {
        assetFaultQrCode: guideMarker.assetFaultQrCode || null,
        faultTypeId: guideMarker.faultTypeId || null,
      });

      if (responseData.fault) {
        setFaults((currentFaults) => {
          const repairedFaultId = String(responseData.fault.id ?? "");
          const existingIndex = currentFaults.findIndex((fault) => String(fault.id ?? "") === repairedFaultId);
          if (existingIndex < 0) {
            return [responseData.fault, ...currentFaults];
          }

          return currentFaults.map((fault, index) => (index === existingIndex ? responseData.fault : fault));
        });
        setSelectedFault((currentFault) => {
          if (!currentFault) return currentFault;
          return String(currentFault.id ?? "") === String(responseData.fault.id ?? "") ? null : currentFault;
        });
      } else {
        await fetchFaults();
      }

      closeGuideModal();
      setFaultReportNotice("Fault marked as repaired.");
    } catch (error) {
      setFaultReportNotice(error.message || "Unable to mark fault as repaired.");
    } finally {
      setIsMarkingRepaired(false);
    }
  };

  const handleConfirmToolAction = async () => {
    if (!scanConfirmation) return;

    try {
      await apiRequest(scanConfirmation.actionEndpoint, "POST", {
        qrCode: scanConfirmation.qrCode,
      });
      await fetchTools();
      setFaultReportNotice(`${scanConfirmation.actionLabel} completed for ${scanConfirmation.toolLabel}.`);
    } catch (error) {
      setFaultReportNotice(error.message || "Unable to update tool status.");
    } finally {
      setScanConfirmation(null);
    }
  };

  const checkedOutTools = tools
    .filter((tool) => tool.isCheckedOut)
    .sort((firstTool, secondTool) => firstTool.name.localeCompare(secondTool.name));
  const activeFaults = faults.filter((fault) => {
    const metadataStatusName = String(fault?.metadata?.statusName || "")
      .trim()
      .toLowerCase();
    const titleStatusMatch = String(fault?.title || "")
      .trim()
      .match(/\[([^\]]+)\]\s*$/);
    const titleStatusName = String(titleStatusMatch?.[1] || "")
      .trim()
      .toLowerCase();
    const statusName = metadataStatusName || titleStatusName;

    return statusName !== "fixed" && statusName !== "resolved" && statusName !== "closed";
  });
  const faultTypeOptions = Array.from(new Set(faultTypes.map((faultType) => faultType.name)));
  const reportMarker = reportMarkerIndex !== null ? MARKERS[reportMarkerIndex] : null;
  const reportMarkerLabel = reportMarker?.label || "";
  const reportLocation = reportMarker?.location || reportMarkerLabel;

  useEffect(() => {
    if (!faultReportNotice) return undefined;

    const timeoutId = setTimeout(() => {
      setFaultReportNotice("");
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [faultReportNotice]);

  const activeGuideMarker = guideMarker;
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
          faults={activeFaults}
          selectedFault={selectedFault}
          onSelectFault={handleSelectFault}
          onBackToList={handleBackToFaultsList}
          onClose={toggleFaultsModal}
        />
      )}

      {showFaultReportModal && (
        <FaultReportModal
          onClose={toggleFaultReportModal}
          onSubmit={handleSubmitFaultReport}
          initialFaultyPart={reportMarkerLabel}
          initialLocation={reportLocation}
          faultTypeOptions={faultTypeOptions}
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
        <div className="floating-actions-stack">
          {scanActionPrompt.mode === "fault" && (
            <div className="report-fault-toast">
              <button className="btn btn-danger floating-action-button report-fault-trigger" onClick={toggleFaultReportModal}>
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>Report Fault</span>
              </button>
              {faultReportNotice && <p className="report-fault-notice">{faultReportNotice}</p>}
            </div>
          )}

          <div className="scan-action-toast">
            <button className="btn btn-success floating-action-button scan-action-trigger" onClick={handleOpenScanAction}>
              {scanActionPrompt.buttonLabel}
            </button>
          </div>
        </div>
      )}

      {!scanActionPrompt?.mode && faultReportNotice && (
        <div className="floating-notice-toast">
          <p className="report-fault-notice">{faultReportNotice}</p>
        </div>
      )}

      {showGuideModal && (
        <RepairGuideModal
          marker={activeGuideMarker}
          stepIndex={guideStepIndex}
          onPrevious={goToPreviousGuideStep}
          onNext={goToNextGuideStep}
          onClose={closeGuideModal}
          onMarkRepaired={handleMarkGuideFaultRepaired}
          isMarkingRepaired={isMarkingRepaired}
        />
      )}

      {isLoadingData && (
        <div className="message-box">
          <p className="mb-0">Syncing faults and tools...</p>
        </div>
      )}
    </div>
  );
};

export default ArPage;

ArPage.propTypes = {
  onLoggedOut: PropTypes.func.isRequired,
};
