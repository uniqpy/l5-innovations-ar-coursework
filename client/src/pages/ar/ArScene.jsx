import React, { useEffect, useRef } from "react";
import TargetSrc from "../../assets/mind_markers/targets.mind?url";
import { MARKERS } from "./markers";

const ArScene = ({ onTargetFound, onTargetLost }) => {
  const sceneRef = useRef(null);
  const targetRefs = useRef([]);
  const onTargetFoundRef = useRef(onTargetFound);
  const onTargetLostRef = useRef(onTargetLost);

  useEffect(() => {
    onTargetFoundRef.current = onTargetFound;
    onTargetLostRef.current = onTargetLost;
  }, [onTargetFound, onTargetLost]);

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

    const removeTargetListeners = targetRefs.current.map((targetEl, targetIndex) => {
      if (!targetEl) return () => {};

      const handleFound = () => {
        if (onTargetFoundRef.current) onTargetFoundRef.current(targetIndex);
      };

      const handleLost = () => {
        if (onTargetLostRef.current) onTargetLostRef.current(targetIndex);
      };

      targetEl.addEventListener("targetFound", handleFound);
      targetEl.addEventListener("targetLost", handleLost);

      return () => {
        targetEl.removeEventListener("targetFound", handleFound);
        targetEl.removeEventListener("targetLost", handleLost);
      };
    });

    return () => {
      sceneEl.removeEventListener("arReady", onArReady);
      sceneEl.removeEventListener("arError", onArError);
      removeTargetListeners.forEach((removeListener) => removeListener());
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
      mindar-image={`imageTargetSrc: ${TargetSrc}; maxTrack: 4; autoStart: true; uiLoading: yes; uiError: yes; uiScanning: no;`}
      color-space="sRGB"
      embedded
      renderer="colorManagement: true, physicallyCorrectLights"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
    >
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      {MARKERS.map((marker, index) => (
        <a-entity
          key={`${marker.label}-${index}`}
          ref={(el) => {
            targetRefs.current[index] = el;
          }}
          mindar-image-target={`targetIndex: ${index}`}
        >
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
            value={marker.label}
            position="0 0.32 0.08"
            align="center"
            color="#ffd166"
            width="1.6"
            shader="msdf"
          ></a-text>
        </a-entity>
      ))}
    </a-scene>
  );
};

export default ArScene;
