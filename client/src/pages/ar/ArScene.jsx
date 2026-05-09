import React, { useEffect, useRef } from "react";
import TargetSrc from "../../assets/mind_markers/targets.mind?url";
import { MARKERS } from "./markers";

const BOX_PRIMARY_COLOR = "#1fe4cf";
const LABEL_TEXT_COLOR = "#f8fbff";
const LABEL_BG_COLOR = "#10263b";
const HALF_WIDTH = 0.34;
const HALF_HEIGHT = 0.22;
const CORE_OFFSETS = [-0.006, -0.003, 0, 0.003, 0.006];
const LABEL_SCALE = "1.35 1.35 1.35";
const LABEL_WIDTH = "2.3";

// Main AR scene wrapper that connects MindAR events to React callbacks.
const ArScene = ({ onTargetFound: ArMarkerFound, onTargetLost: ArMarkerLost }) => {
  // Refs used for scene access, tracked marker entities, and stable callback references.
  const sceneRef = useRef(null);
  const targetRefs = useRef([]);
  const ArMarkerFoundRef = useRef(ArMarkerFound);
  const ArMarkerLostRef = useRef(ArMarkerLost);

  // Keep callback refs in sync so listeners always call the latest handlers.
  useEffect(() => {
    ArMarkerFoundRef.current = ArMarkerFound;
    ArMarkerLostRef.current = ArMarkerLost;
  }, [ArMarkerFound, ArMarkerLost]);

  // Register global AR listeners and target found/lost listeners.
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

    const removeARListeners = targetRefs.current.map((AR_El, targetIndex) => {
      if (!AR_El) return () => {};

      const handleFound = () => {
        if (ArMarkerFoundRef.current) ArMarkerFoundRef.current(targetIndex);
      };

      const handleLost = () => {
        if (ArMarkerLostRef.current) ArMarkerLostRef.current(targetIndex);
      };

      AR_El.addEventListener("targetFound", handleFound);
      AR_El.addEventListener("targetLost", handleLost);

      return () => {
        AR_El.removeEventListener("targetFound", handleFound);
        AR_El.removeEventListener("targetLost", handleLost);
      };
    });

    // Cleanup AR listeners.
    return () => {
      sceneEl.removeEventListener("arReady", onArReady);
      sceneEl.removeEventListener("arError", onArError);
      removeARListeners.forEach((removeListener) => removeListener());
      const arSystem = sceneEl.systems["mindar-image-system"];
      if (arSystem) {
        arSystem.stop();
      }
    };
  }, []);

  // MindAR scene.
  return (
    <a-scene
      className="ar-scene"
      ref={sceneRef}
      mindar-image={`imageTargetSrc: ${TargetSrc}; maxTrack: 4; autoStart: true; uiLoading: yes; uiError: yes; uiScanning: no;`}
      color-space="sRGB"
      embedded
      renderer="colorManagement: true; physicallyCorrectLights: true; alpha: true"
      vr-mode-ui="enabled: false"
      xr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
    >
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      {MARKERS.map((marker, index) => (
        // Create one tracked AR entity per marker
        <a-entity
          key={`${marker.label}-${index}`}
          ref={(el) => {
            targetRefs.current[index] = el;
          }}
          mindar-image-target={`targetIndex: ${index}`}
        >
          <a-entity position="0 0 0.08" rotation="0 0 0">
            {CORE_OFFSETS.map((offset) => (
              <React.Fragment key={`core-${offset}`}>
                <a-entity
                  line={`start: ${-HALF_WIDTH} ${HALF_HEIGHT + offset} 0.002; end: ${HALF_WIDTH} ${HALF_HEIGHT + offset} 0.002; color: ${BOX_PRIMARY_COLOR}`}
                ></a-entity>
                <a-entity
                  line={`start: ${-HALF_WIDTH} ${-HALF_HEIGHT + offset} 0.002; end: ${HALF_WIDTH} ${-HALF_HEIGHT + offset} 0.002; color: ${BOX_PRIMARY_COLOR}`}
                ></a-entity>
                <a-entity
                  line={`start: ${HALF_WIDTH + offset} ${HALF_HEIGHT} 0.002; end: ${HALF_WIDTH + offset} ${-HALF_HEIGHT} 0.002; color: ${BOX_PRIMARY_COLOR}`}
                ></a-entity>
                <a-entity
                  line={`start: ${-HALF_WIDTH + offset} ${HALF_HEIGHT} 0.002; end: ${-HALF_WIDTH + offset} ${-HALF_HEIGHT} 0.002; color: ${BOX_PRIMARY_COLOR}`}
                ></a-entity>
              </React.Fragment>
            ))}
          </a-entity>
          <a-plane
            position="0 0.405 0.074"
            width="0.86"
            height="0.16"
            color={LABEL_BG_COLOR}
            opacity="0.78"
          ></a-plane>

          <a-text
            value={marker.label}
            position="0 0.4 0.08"
            align="center"
            color={LABEL_TEXT_COLOR}
            scale={LABEL_SCALE}
            width={LABEL_WIDTH}
            shader="msdf"
          ></a-text>
        </a-entity>
      ))}
    </a-scene>
  );
};

export default ArScene;
