import React, { useEffect, useState } from 'react';
import "aframe";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const ArPage = () => {
  const [CameraPermissions, setCameraPermissions] = useState(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true});
        setCameraPermissions(true);
      } catch (err) {
        console.error("Camera Access Denied", err);
        setCameraPermissions(false);
      }
    };
    checkCamera();
  },[]);

  if (CameraPermissions === null) {
    return <p>Requesting camera permissions</p>;
  }

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      
      {/* Sidebar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "200px",
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.95)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.3)",
          paddingTop: "70px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <button
          className="btn btn-primary mb-3 w-75"
          style={{ height: "50px" }}
        >
          <i className="bi bi-plus-lg"></i>
        </button>
        <button
          className="btn btn-secondary mb-3 w-75"
          style={{ height: "50px" }}
        >
          <i className="bi bi-camera"></i>
        </button>
        <button
          className="btn btn-success mb-3 w-75"
          style={{ height: "50px" }}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* AR Scene only renders if camera allowed */}
      {CameraPermissions === true && (
        <a-scene
          vr-mode-ui="enabled: false"
          embedded
          arjs="sourceType: webcam; debugUIEnabled: false;"
          style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
        >
          <a-marker preset="hiro">
            <a-box position="0 0.5 0" color="red"></a-box>
          </a-marker>
          <a-entity camera></a-entity>
        </a-scene>
      )}

      {/* Message if camera denied */}
      {CameraPermissions === false && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
            zIndex: 10000,
          }}
        >
          <p>Camera access is required for AR functionality.</p>
          <p>You can still use the menu for the sake of testing, though we should probably get rid of this.</p>
        </div>
      )}

      {/* Message if requesting permissions */}
      {CameraPermissions === null && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
            zIndex: 10000,
          }}
        >
          <p>Requesting camera permissions...</p>
        </div>
      )}

    </div>
  );
};

export default ArPage;