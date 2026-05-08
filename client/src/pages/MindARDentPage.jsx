import React, { useEffect, useRef, useState } from 'react';
import './MindARDentPage.css';

const SAMPLE_MIND_TARGET =
  'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind';
const SAMPLE_IMAGE_PREVIEW =
  'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png';
const LOCAL_TARGET_IMAGE = '/targets/normal-n.svg';
const PRECOMPILED_TARGET = '/targets/normal-n.mind';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function loadScriptOnce(scriptId, src) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(scriptId);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function exists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function isUsableMindFile(url) {
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return false;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength > 1024;
  } catch (_error) {
    return false;
  }
}

export default function MindARDentPage() {
  const containerRef = useRef(null);
  const compiledMindSrcRef = useRef('');
  const compiledMindBlobUrlRef = useRef(null);
  const [isFound, setIsFound] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Starting camera...');
  const [hasError, setHasError] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [restartNonce, setRestartNonce] = useState(0);
  const [usingLocalTarget, setUsingLocalTarget] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('Sample fallback target');
  const [targetMode, setTargetMode] = useState('sample');

  useEffect(
    () => () => {
      if (compiledMindBlobUrlRef.current) {
        URL.revokeObjectURL(compiledMindBlobUrlRef.current);
        compiledMindBlobUrlRef.current = null;
        compiledMindSrcRef.current = '';
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCameras = async () => {
      try {
        // Prompt once so device labels are available.
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tempStream.getTracks().forEach((track) => track.stop());
      } catch (_error) {
        // Continue even if initial prompt fails; browser may already have permission.
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((device) => device.kind === 'videoinput');
      if (cancelled) return;

      setCameraDevices(videos);
      setSelectedCameraId((prev) => {
        if (prev) return prev;
        const obsDevice = videos.find((device) => /obs|virtual/i.test(device.label));
        return obsDevice?.deviceId || videos[0]?.deviceId || '';
      });
    };

    loadCameras();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mindarThree;
    let restoreGetUserMedia = null;
    let didStartMindAR = false;

    const init = async () => {
      const container = containerRef.current;
      const THREE = window?.THREE;
      const MindARThree = window?.MINDAR?.IMAGE?.MindARThree;
      let MindARCompiler = window?.MINDAR?.Compiler;

      if (!container) {
        setHasError(true);
        setStatusMessage('AR container missing.');
        return;
      }
      if (!THREE || !MindARThree) {
        setHasError(true);
        setStatusMessage('MindAR/Three scripts not available.');
        return;
      }

      if (selectedCameraId && navigator?.mediaDevices?.getUserMedia) {
        try {
          const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          const patchedGetUserMedia = async (constraints = {}) => {
            const sourceConstraints = constraints?.video;
            const videoConstraints =
              sourceConstraints && typeof sourceConstraints === 'object'
                ? { ...sourceConstraints, deviceId: { exact: selectedCameraId } }
                : { deviceId: { exact: selectedCameraId } };

            try {
              return await originalGetUserMedia({ ...constraints, video: videoConstraints });
            } catch (_err) {
              // Fallback to original constraints if specific camera id fails.
              return originalGetUserMedia(constraints);
            }
          };

          navigator.mediaDevices.getUserMedia = patchedGetUserMedia;
          restoreGetUserMedia = () => {
            try {
              navigator.mediaDevices.getUserMedia = originalGetUserMedia;
            } catch (_restoreError) {
              // no-op
            }
          };
        } catch (_patchError) {
          setStatusMessage('Camera override unavailable; using browser default camera.');
        }
      }

      setStatusMessage('Loading tracker...');
      setHasError(false);
      setIsFound(false);
      setUsingLocalTarget(false);
      setSourceLabel('Sample fallback target');

      let imageTargetSrc = SAMPLE_MIND_TARGET;
      const hasPrecompiledMind = targetMode === 'local' ? await exists(PRECOMPILED_TARGET) : false;
      const shouldUseCachedCompile = targetMode === 'local' && Boolean(compiledMindSrcRef.current);

      if (targetMode === 'sample') {
        imageTargetSrc = SAMPLE_MIND_TARGET;
        setUsingLocalTarget(false);
        setSourceLabel('Sample fallback target');
        setStatusMessage('Using sample marker.');
      } else if (shouldUseCachedCompile) {
        imageTargetSrc = compiledMindSrcRef.current;
        setUsingLocalTarget(true);
        setSourceLabel('Runtime-compiled N target (cached)');
        setStatusMessage('Using runtime-compiled normal N target.');
      } else {
        if (!MindARCompiler) {
          try {
            await loadScriptOnce('mindar-core-compiler-script', '/vendor/mindar-image-1.1.4.prod.js');
            MindARCompiler = window?.MINDAR?.Compiler;
          } catch (_scriptError) {
            MindARCompiler = null;
          }
        }

        if (MindARCompiler) {
          try {
            setStatusMessage('Compiling normal N target...');
            const compiler = new MindARCompiler();
            const targetImage = await loadImage(LOCAL_TARGET_IMAGE);
            await compiler.compileImageTargets([targetImage], (progress) => {
              if (cancelled) return;
              const percentage = Math.round(progress * 100);
              setStatusMessage(`Compiling normal N target... ${percentage}%`);
            });
            const compiledBuffer = await compiler.exportData();
            const blob = new Blob([compiledBuffer], { type: 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            if (compiledMindBlobUrlRef.current) {
              URL.revokeObjectURL(compiledMindBlobUrlRef.current);
            }
            compiledMindBlobUrlRef.current = blobUrl;
            compiledMindSrcRef.current = blobUrl;
            imageTargetSrc = blobUrl;
            setUsingLocalTarget(true);
            setSourceLabel('Runtime-compiled N target');
            setStatusMessage('Using runtime-compiled normal N target.');
          } catch (compileError) {
            const compileErrorMessage =
              compileError instanceof Error ? compileError.message : 'Unknown compile error';
            if (hasPrecompiledMind) {
              const usableMind = await isUsableMindFile(PRECOMPILED_TARGET);
              if (usableMind) {
                imageTargetSrc = PRECOMPILED_TARGET;
                setUsingLocalTarget(true);
                setSourceLabel('Precompiled normal N target (.mind fallback)');
                setStatusMessage(
                  `Compile failed (${compileErrorMessage}); using precompiled normal N target.`,
                );
              } else {
                imageTargetSrc = SAMPLE_MIND_TARGET;
                setUsingLocalTarget(false);
                setSourceLabel('Sample fallback target');
                setStatusMessage(
                  `Compile failed (${compileErrorMessage}) and .mind invalid. Using sample marker.`,
                );
              }
            } else {
              imageTargetSrc = SAMPLE_MIND_TARGET;
              setUsingLocalTarget(false);
              setSourceLabel('Sample fallback target');
              setStatusMessage(
                `Normal N compile failed (${compileErrorMessage}). Using sample marker.`,
              );
            }
          }
        } else if (hasPrecompiledMind) {
          const usableMind = await isUsableMindFile(PRECOMPILED_TARGET);
          if (usableMind) {
            imageTargetSrc = PRECOMPILED_TARGET;
            setUsingLocalTarget(true);
            setSourceLabel('Precompiled normal N target (.mind fallback)');
            setStatusMessage('Compiler unavailable; using precompiled normal N target.');
          } else {
            imageTargetSrc = SAMPLE_MIND_TARGET;
            setUsingLocalTarget(false);
            setSourceLabel('Sample fallback target');
            setStatusMessage('Compiler unavailable and .mind invalid. Using sample marker.');
          }
        } else {
          imageTargetSrc = SAMPLE_MIND_TARGET;
          setUsingLocalTarget(false);
          setSourceLabel('Sample fallback target');
          setStatusMessage('Normal N compiler unavailable. Using sample marker.');
        }
      }

      mindarThree = new MindARThree({
        container,
        imageTargetSrc,
        uiLoading: 'yes',
        uiScanning: 'yes',
      });

      const { renderer, scene, camera } = mindarThree;
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2);
      scene.add(light);

      const anchor = mindarThree.addAnchor(0);

      const squarePoints = [
        new THREE.Vector3(-0.5, 0.5, 0),
        new THREE.Vector3(0.5, 0.5, 0),
        new THREE.Vector3(0.5, -0.5, 0),
        new THREE.Vector3(-0.5, -0.5, 0),
      ];
      const squareGeometry = new THREE.BufferGeometry().setFromPoints(squarePoints);
      const squareMaterial = new THREE.LineBasicMaterial({ color: 0x19f9ff });
      const square = new THREE.LineLoop(squareGeometry, squareMaterial);
      anchor.group.add(square);

      const textCanvas = document.createElement('canvas');
      textCanvas.width = 512;
      textCanvas.height = 256;
      const textContext = textCanvas.getContext('2d');
      if (textContext) {
        textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
        textContext.fillStyle = '#19f9ff';
        textContext.font = 'bold 110px Arial';
        textContext.textAlign = 'center';
        textContext.textBaseline = 'middle';
        textContext.fillText('signj', textCanvas.width / 2, textCanvas.height / 2);
      }

      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        transparent: true,
      });
      const textSprite = new THREE.Sprite(textMaterial);
      textSprite.scale.set(1.05, 0.5, 1);
      textSprite.position.set(0, 0.72, 0);
      anchor.group.add(textSprite);

      anchor.onTargetFound = () => {
        if (cancelled) return;
        setIsFound(true);
        setStatusMessage('Target found: signj');
      };
      anchor.onTargetLost = () => {
        if (cancelled) return;
        setIsFound(false);
        setStatusMessage('Target lost. Scanning...');
      };

      try {
        await mindarThree.start();
        didStartMindAR = true;
      } catch (_error) {
        if (cancelled) return;
        setHasError(true);
        setStatusMessage('Camera blocked or tracker failed to start.');
        return;
      }

      const videoEl = container.querySelector('video');
      if (videoEl) {
        Object.assign(videoEl.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: '1',
          display: 'block',
          visibility: 'visible',
          opacity: '1',
        });
      }
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((canvas, index) => {
        Object.assign(canvas.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: index === 0 ? '2' : '3',
        });
      });

      setStatusMessage('Scanning for target...');
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
    };

    init();

    return () => {
      cancelled = true;
      if (mindarThree?.renderer) {
        try {
          mindarThree.renderer.setAnimationLoop(null);
        } catch (_rendererCleanupError) {
          // no-op
        }
      }
      if (mindarThree && didStartMindAR) {
        try {
          mindarThree.stop();
        } catch (_stopError) {
          // Avoid unmount crash if MindAR is partially initialized.
        }
      }
      if (restoreGetUserMedia) {
        restoreGetUserMedia();
      }
    };
  }, [selectedCameraId, restartNonce, targetMode]);

  return (
    <div className="dent-demo-page">
      <div className="dent-demo-overlay">
        <h2>MindAR + Three Demo</h2>
        <p>
          Tracking {targetMode === 'sample' ? 'sample marker' : 'normal N marker'} and drawing a
          square labeled <strong>signj</strong>.
        </p>
        <p>
          Marker source:{' '}
          <strong>{sourceLabel}</strong>
        </p>
        <label className="camera-label" htmlFor="targetModeSelect">
          Target Mode
        </label>
        <select
          id="targetModeSelect"
          className="camera-select"
          value={targetMode}
          onChange={(event) => setTargetMode(event.target.value)}
        >
          <option value="local">Local normal N target</option>
          <option value="sample">Sample marker</option>
        </select>
        <p>
          Sample marker:
          <a href={SAMPLE_IMAGE_PREVIEW} target="_blank" rel="noreferrer">
            {' '}
            open sample image
          </a>
        </p>
        <p>
          Local marker:
          <a href={LOCAL_TARGET_IMAGE} target="_blank" rel="noreferrer">
            {' '}
            open normal N target
          </a>
        </p>
        <p>
          Status: <strong>{isFound ? 'Target Found' : statusMessage}</strong>
        </p>
        <label className="camera-label" htmlFor="cameraSelect">
          Camera
        </label>
        <select
          id="cameraSelect"
          className="camera-select"
          value={selectedCameraId}
          onChange={(event) => setSelectedCameraId(event.target.value)}
        >
          {cameraDevices.length === 0 && <option value="">No camera devices found</option>}
          {cameraDevices.map((device, index) => (
            <option key={device.deviceId || `${device.label}-${index}`} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="camera-button"
          onClick={() => setRestartNonce((value) => value + 1)}
        >
          Restart Camera
        </button>
        {hasError && <p>Allow camera, then refresh. If still failing, tell me the new status text.</p>}
      </div>

      <div className="dent-mindar-container" ref={containerRef} />
    </div>
  );
}
