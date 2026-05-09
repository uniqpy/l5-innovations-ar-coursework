import { useEffect, useState } from "react";

const DEFAULT_FAULT_TYPE_OPTION = "Other";

const buildInitialFormState = (faultyPart, location, faultTypeOptions) => ({
  faultyPart: faultyPart || "",
  typeOfFaultOption: faultTypeOptions[0] || DEFAULT_FAULT_TYPE_OPTION,
  customFaultType: "",
  location: location || "",
  urgency: "High",
  notes: "",
});

const FaultReportModal = ({ onClose, onSubmit, initialFaultyPart, initialLocation, faultTypeOptions }) => {
  const [formState, setFormState] = useState(() =>
    buildInitialFormState(initialFaultyPart, initialLocation, faultTypeOptions),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormState(buildInitialFormState(initialFaultyPart, initialLocation, faultTypeOptions));
    setErrorMessage("");
  }, [initialFaultyPart, initialLocation, faultTypeOptions]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const selectedFaultType =
      formState.typeOfFaultOption === DEFAULT_FAULT_TYPE_OPTION
        ? formState.customFaultType.trim()
        : formState.typeOfFaultOption;

    if (!formState.faultyPart.trim() || !selectedFaultType) {
      setErrorMessage("Faulty part and fault type are required.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await onSubmit({
        faultyPart: formState.faultyPart.trim(),
        typeOfFault: selectedFaultType,
        location: formState.location.trim(),
        urgency: formState.urgency,
        notes: formState.notes.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-faults">
        <h3 className="modal-title modal-title-center">Report a Fault</h3>
        <p className="modal-description">
          Capture fault details so the team can inspect and resolve the issue.
        </p>

        <form onSubmit={handleSubmit} className="fault-report-form">
          <div className="mb-2">
            <label className="form-label mb-1" htmlFor="faultyPart">
              Faulty Part
            </label>
            <p id="faultyPart" className="autofill-field">
              {formState.faultyPart || "No scanned part"}
            </p>
          </div>

          <div className="mb-2">
            <label className="form-label mb-1" htmlFor="typeOfFault">
              Fault Type
            </label>
            <select
              id="typeOfFault"
              name="typeOfFaultOption"
              className="form-select"
              value={formState.typeOfFaultOption}
              onChange={handleFieldChange}
            >
              {faultTypeOptions.map((faultType) => (
                <option key={faultType} value={faultType}>
                  {faultType}
                </option>
              ))}
              <option value={DEFAULT_FAULT_TYPE_OPTION}>{DEFAULT_FAULT_TYPE_OPTION}</option>
            </select>
          </div>

          {formState.typeOfFaultOption === DEFAULT_FAULT_TYPE_OPTION && (
            <div className="mb-2">
              <label className="form-label mb-1" htmlFor="customFaultType">
                Custom Fault Type
              </label>
              <input
                id="customFaultType"
                name="customFaultType"
                className="form-control"
                value={formState.customFaultType}
                onChange={handleFieldChange}
                placeholder="Describe the fault type"
                maxLength={120}
                required
              />
            </div>
          )}

          <div className="mb-2">
            <label className="form-label mb-1" htmlFor="location">
              Location
            </label>
            <p id="location" className="autofill-field">
              {formState.location || "No scanned location"}
            </p>
          </div>

          <div className="mb-2">
            <label className="form-label mb-1" htmlFor="urgency">
              Urgency
            </label>
            <select
              id="urgency"
              name="urgency"
              className="form-select"
              value={formState.urgency}
              onChange={handleFieldChange}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="mb-1">
            <label className="form-label mb-1" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              rows="3"
              value={formState.notes}
              onChange={handleFieldChange}
              placeholder="Add symptoms, timing, and anything observed."
              maxLength={600}
            />
          </div>

          {errorMessage && <p className="fault-report-error">{errorMessage}</p>}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit Fault"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FaultReportModal;
