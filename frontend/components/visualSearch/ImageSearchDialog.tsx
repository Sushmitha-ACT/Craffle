import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, X, AlertCircle, Sparkles, RefreshCw,
  CheckCircle2, ArrowRight, ShieldAlert, Video, FlipHorizontal
} from 'lucide-react';
import { VisualSearchResultItem } from './VisualProductCard';

interface ImageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchResults: (
    results: VisualSearchResultItem[],
    previewUrl: string,
    modelInfo: { model: string; version: string }
  ) => void;
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageSearchDialog({
  isOpen,
  onClose,
  onSearchResults
}: ImageSearchDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Analyzing image features...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up preview URL and camera on unmount or close
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleClose = () => {
    stopCameraStream();
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setLoading(false);
    onClose();
  };

  // Switch to camera tab and request permission
  const handleStartCamera = async (mode: 'user' | 'environment' = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser. Please upload an image instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Could not access camera. Please allow camera permissions or upload a photo from your gallery.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. You can enable camera access in your browser settings, or simply choose "Upload from Gallery" below.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const handleCaptureFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        validateAndSetFile(file);
        stopCameraStream();
      }
    }, 'image/jpeg', 0.95);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage(`Unsupported format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`);
      return false;
    }

    // Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Image is too large (${sizeMb} MB). Maximum allowed size is 8 MB.`);
      return false;
    }

    // Set file & preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return true;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger Visual Search API
  const handleSearch = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setErrorMessage(null);
    setLoadingStatus('Uploading & validating image...');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Simulate diagnostic step updates
      const stepTimer1 = setTimeout(() => {
        setLoadingStatus('Extracting visual embeddings with MobileNetV2...');
      }, 500);

      const stepTimer2 = setTimeout(() => {
        setLoadingStatus('Matching against Craffle product catalog vectors...');
      }, 1200);

      const response = await fetch('/api/v1/visual-search', {
        method: 'POST',
        body: formData
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await response.json();

      if (!response.ok || data.success === false || data.error) {
        throw new Error(data.error || data.message || 'Visual search failed. Please try again.');
      }

      // Use query image preview data URL returned from server or local preview
      const previewDataUrl = data.queryImagePreview || previewUrl || '';
      onSearchResults(
        data.results || [],
        previewDataUrl,
        data.meta?.model ? { model: data.meta.model, version: data.meta.modelVersion } : { model: 'MobileNetV2', version: 'mobilenet-v2-imagenet-v1' }
      );
      handleClose();

    } catch (err: any) {
      console.error('Visual search request error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during visual search.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B35]/15 text-[#FF6B35] flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Search by Photo or Image</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Find visually similar handmade items in our catalog
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        {!selectedFile && (
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-secondary)]/30 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setActiveTab('upload');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'bg-[var(--panel)] text-[#FF6B35] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Gallery</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                handleStartCamera();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'camera'
                  ? 'bg-[var(--panel)] text-[#FF6B35] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Take a Photo</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">

          {/* Error Notice */}
          {errorMessage && (
            <div className="w-full mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* STATE 1: PREVIEW SELECTED IMAGE */}
          {selectedFile && previewUrl ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-[var(--border)] shadow-inner bg-black/5 group">
                <img
                  src={previewUrl}
                  alt="Search query preview"
                  className="w-full h-full object-contain"
                />

                {/* Laser Scanning Animation when loading */}
                {loading && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF6B35]/25 to-transparent border-b-2 border-[#FF6B35] animate-pulse pointer-events-none" />
                )}

                {!loading && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* File Info */}
              <div className="mt-3 text-center">
                <p className="text-xs font-bold text-[var(--text)] truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {(selectedFile.size / 1024).toFixed(0)} KB • {selectedFile.type}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-xs font-bold transition-colors text-[var(--text-secondary)]"
                >
                  Change Image
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSearch}
                  className="flex-[2] py-3 px-5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingStatus}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Find Similar Products</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === 'upload' ? (
            /* STATE 2: UPLOAD FROM GALLERY */
            <div className="w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-12 px-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#FF6B35] bg-orange-500/10 scale-99'
                    : 'border-[var(--border)] hover:border-[#FF6B35] hover:bg-[var(--bg-secondary)]/50'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-sm text-[var(--text)] mb-1">
                  Drag and drop your image here
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-4 text-center">
                  or click to browse from your device
                </p>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-[11px] font-semibold text-[var(--muted)] border border-[var(--border)]">
                  Supports JPG, PNG, WebP (Max 8 MB)
                </span>
              </div>
            </div>
          ) : (
            /* STATE 3: TAKE A PHOTO (WebRTC or native mobile capture) */
            <div className="w-full flex flex-col items-center">
              {/* Native mobile capture input with capture="environment" */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {cameraActive ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Camera switch button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(newMode);
                        handleStartCamera(newMode);
                      }}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                      title="Flip camera"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCaptureFromStream}
                      className="px-6 py-2.5 rounded-full bg-[#FF6B35] hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Device Camera App
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center py-6 text-center">
                  {cameraError ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs mb-4 max-w-xs">
                      <p className="font-semibold mb-1">Camera Permission Required</p>
                      <p className="opacity-90">{cameraError}</p>
                    </div>
                  ) : null}

                  <div className="w-16 h-16 rounded-2xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8" />
                  </div>

                  <h4 className="font-extrabold text-sm mb-1">Take a Photo of any Item</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-5">
                    Capture a clear picture of a cake, artwork, craft, or homemade product to discover matches.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => handleStartCamera()}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FF6B35] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Open Live Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text)] flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Use Phone Camera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[var(--bg-secondary)]/50 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex items-center justify-between">
          <span>Real-time visual inference via Craffle AI</span>
          <span>Max 8MB (JPEG, PNG, WebP)</span>
        </div>

      </div>
    </div>
  );
}
