// app/page.js
// ULTIMATE EXAM SYSTEM - FINAL WITH ALL FIXES + CLARITY

'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

export default function Home() {
  // State Management
  const [examState, setExamState] = useState({
    isFullscreen: false,
    showForm: false,
    examLocked: false,
    violationCount: 0,
    cameraActive: false,
    cameraError: false,
    examStarted: false,
    showInstructions: true,
    lockReason: '',
    warningMessage: '',
    showWarning: false,
    videoInitialized: false,
    fullscreenAttempted: false
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const GOOGLE_FORM_URL = "https://forms.gle/UZvyrVXQxDVbPnBV8";

  // Load from localStorage with validation
  useEffect(() => {
    const loadExamData = () => {
      try {
        const savedViolations = localStorage.getItem('exam_violations');
        const savedLocked = localStorage.getItem('exam_locked');
        const savedReason = localStorage.getItem('exam_lock_reason');

        let violations = savedViolations ? parseInt(savedViolations) : 0;

        // Validate data
        if (isNaN(violations) || violations < 0) violations = 0;

        setExamState(prev => ({
          ...prev,
          violationCount: violations
        }));

        // Check if exam should be locked
        if (savedLocked === 'true' || violations >= 3) {
          setExamState(prev => ({
            ...prev,
            examLocked: true,
            showForm: false,
            showInstructions: false,
            lockReason: savedReason || 'Maximum violations (3)'
          }));
          localStorage.setItem('exam_locked', 'true');
        }

        console.log('📊 Loaded exam data:', { violations, locked: savedLocked });
      } catch (error) {
        console.error('Error loading exam data:', error);
      }
    };

    loadExamData();
  }, []);

  // Start Camera
  const startCamera = async () => {
    try {
      console.log('📹 Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              console.log('✅ Video playing successfully');
              setExamState(prev => ({ 
                ...prev, 
                cameraActive: true,
                videoInitialized: true 
              }));
            })
            .catch(err => {
              console.error('❌ Video play error:', err);
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play()
                    .then(() => {
                      setExamState(prev => ({ 
                        ...prev, 
                        cameraActive: true,
                        videoInitialized: true 
                      }));
                    })
                    .catch(e => console.error('❌ Second play attempt failed:', e));
                }
              }, 500);
            });
        };

        videoRef.current.load();
        console.log('✅ Camera started successfully');
      }
    } catch (err) {
      console.error('❌ Camera error:', err);
      setExamState(prev => ({ ...prev, cameraError: true }));
      showWarning('⚠️ Camera access required! Please allow camera permissions.');
    }
  };

  // Show Warning with Auto-Dismiss
  const showWarning = (message, duration = 4000) => {
    setExamState(prev => ({
      ...prev,
      warningMessage: message,
      showWarning: true
    }));

    setTimeout(() => {
      setExamState(prev => ({
        ...prev,
        showWarning: false,
        warningMessage: ''
      }));
    }, duration);
  };

  // Increment Violation
  const incrementViolation = (reason) => {
    if (examState.examLocked) {
      console.log('🔒 Exam already locked, ignoring violation');
      return;
    }

    const newCount = examState.violationCount + 1;
    console.log(`🚨 Violation detected: ${reason}, Count: ${newCount}/3`);

    setExamState(prev => ({
      ...prev,
      violationCount: newCount
    }));

    localStorage.setItem('exam_violations', newCount.toString());

    showWarning(`⚠️ VIOLATION ${newCount}/3: ${reason}`, 3000);

    if (newCount >= 3) {
      lockExam('Maximum violations (3)');
    }
  };

  // Lock Exam
  const lockExam = (reason) => {
    console.log(`🔒 Locking exam: ${reason}`);
    
    setExamState(prev => ({
      ...prev,
      examLocked: true,
      showForm: false,
      showInstructions: false,
      lockReason: reason,
      examStarted: false
    }));

    localStorage.setItem('exam_locked', 'true');
    localStorage.setItem('exam_lock_reason', reason);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setExamState(prev => ({ ...prev, cameraActive: false }));
    }

    showWarning(`🔒 EXAM LOCKED! Reason: ${reason}`, 5000);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Enter Fullscreen
  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => {
          console.log('⛶ Fullscreen entered successfully');
          setExamState(prev => ({ ...prev, isFullscreen: true, fullscreenAttempted: true }));
        })
        .catch(err => {
          console.log('❌ Fullscreen error:', err);
          showWarning('⚠️ Please allow fullscreen access');
        });
    }
  };

  // Start Exam - ONLY IF FULLSCREEN IS ACTIVE
  const startExam = () => {
    console.log('🚀 Starting exam...');

    // Check if already locked
    if (examState.violationCount >= 3 || examState.examLocked) {
      lockExam('Exam already locked');
      return;
    }

    if (!examState.cameraActive) {
      showWarning('⚠️ Camera not active! Please allow camera access.');
      return;
    }

    // Check if fullscreen is active
    if (!examState.isFullscreen) {
      showWarning('⚠️ Please enter FULLSCREEN first! Click the "Enter Fullscreen" button.', 4000);
      return;
    }

    // All conditions met - start exam
    setExamState(prev => ({
      ...prev,
      examStarted: true,
      showInstructions: false,
      showForm: true
    }));

    // Start monitoring
    startMonitoring();
    
    console.log('✅ Exam started successfully!');
  };

  // Start Monitoring
  const startMonitoring = () => {
    console.log('👁️ Starting exam monitoring...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (examState.examLocked || !examState.examStarted) {
        return;
      }

      const isFull = document.fullscreenElement !== null;
      
      if (!isFull) {
        console.log('🚨 Interval: Fullscreen violation detected');
        incrementViolation('Fullscreen exited');
        // Page reload on fullscreen exit
        if (examState.examStarted && !examState.examLocked) {
          console.log('🔄 Reloading page due to fullscreen exit');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }

      if (!examState.cameraActive && !examState.examLocked) {
        console.log('🚨 Interval: Camera turned off');
        incrementViolation('Camera turned off');
      }
    }, 300);
  };

  // Event Handlers
  const handleFullscreenChange = () => {
    const isFull = document.fullscreenElement !== null;
    setExamState(prev => ({ ...prev, isFullscreen: isFull }));

    if (!isFull && examState.examStarted && !examState.examLocked) {
      console.log('🚨 Fullscreen change: Exited fullscreen');
      incrementViolation('Fullscreen exited');
      
      console.log('🔄 Reloading page due to fullscreen exit');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden && examState.examStarted && !examState.examLocked) {
      console.log('🚨 Tab switch detected');
      incrementViolation('Tab switched');
    }
  };

  const handleBlur = () => {
    if (examState.examStarted && !examState.examLocked) {
      console.log('🚨 Window blurred (tab switch)');
      incrementViolation('Window blurred');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      console.log('🚨 F11 key pressed');
      if (examState.examStarted && !examState.examLocked) {
        incrementViolation('F11 key pressed (fullscreen attempt)');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }

    if (examState.examStarted && !examState.examLocked) {
      if (e.key === 'F12') {
        e.preventDefault();
        incrementViolation('DevTools attempted');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        incrementViolation('DevTools attempted');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        incrementViolation('DevTools attempted');
      }
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        incrementViolation('View source attempted');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        incrementViolation('DevTools attempted');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        incrementViolation('ESC key pressed');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  };

  const handleContextMenu = (e) => {
    if (examState.examStarted && !examState.examLocked) {
      e.preventDefault();
      incrementViolation('Right click detected');
    }
  };

  const handleResize = () => {
    if (examState.examStarted && !examState.examLocked) {
      const isFull = document.fullscreenElement !== null;
      if (!isFull) {
        console.log('🚨 Resize: Fullscreen violation');
        incrementViolation('Fullscreen exited');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  };

  // Setup Event Listeners
  useEffect(() => {
    console.log('📌 Setting up event listeners...');
    
    startCamera();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    document.addEventListener('pageshow', () => {
      if (examState.examStarted && !examState.examLocked) {
        const isFull = document.fullscreenElement !== null;
        if (!isFull) {
          console.log('🚨 Page show: Fullscreen violation');
          incrementViolation('Fullscreen exited');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    });

    return () => {
      console.log('🧹 Cleaning up event listeners...');
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update monitoring when exam state changes
  useEffect(() => {
    if (examState.examStarted && !examState.examLocked) {
      startMonitoring();
    }
  }, [examState.examStarted, examState.examLocked]);

  // ==================== RENDER COMPONENTS ====================

  // Exam Locked Screen
  if (examState.examLocked) {
    return (
      <>
        {/* Clarity Script for Lock Screen */}
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "y4pia34m1q");
            `
          }}
        />
        <div style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle at center, rgba(220,38,38,0.1) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          
          <div style={{
            background: 'rgba(20, 27, 38, 0.95)',
            padding: '60px 48px',
            borderRadius: '24px',
            border: '2px solid #dc2626',
            maxWidth: '550px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.2)',
            position: 'relative',
            zIndex: 1,
            animation: 'slideIn 0.5s ease'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px', animation: 'shake 0.5s ease' }}>🔒</div>
            <h1 style={{ 
              color: '#dc2626', 
              fontSize: '2.8rem', 
              fontWeight: '800', 
              marginBottom: '16px',
              textShadow: '0 0 20px rgba(220,38,38,0.3)'
            }}>
              EXAM LOCKED
            </h1>
            <p style={{ 
              color: '#fbbf24', 
              fontSize: '1.2rem', 
              marginBottom: '24px',
              fontWeight: '600'
            }}>
              ⛔ This exam has been permanently locked
            </p>
            
            <div style={{
              background: '#0a0f18',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #2d3a4f',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ color: '#b6ceff', fontSize: '1rem' }}>
                  <strong style={{ color: '#f0f4ff' }}>🔴 Lock Reason:</strong>
                </p>
                <p style={{ 
                  color: '#dc2626', 
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'rgba(220,38,38,0.1)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginTop: '4px'
                }}>
                  {examState.lockReason || 'Violation detected'}
                </p>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #2d3a4f'
              }}>
                <div>
                  <p style={{ color: '#5d739b', fontSize: '0.8rem' }}>Violations</p>
                  <p style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {examState.violationCount}/3
                  </p>
                </div>
                <div>
                  <p style={{ color: '#5d739b', fontSize: '0.8rem' }}>Status</p>
                  <p style={{ color: '#dc2626', fontSize: '1rem', fontWeight: 'bold' }}>
                    🔴 LOCKED
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{
              background: 'rgba(220,38,38,0.1)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(220,38,38,0.3)'
            }}>
              <p style={{ color: '#b6ceff', fontSize: '0.9rem' }}>
                ⚠️ This exam has been permanently locked due to policy violations.
              </p>
              <p style={{ color: '#5d739b', fontSize: '0.85rem', marginTop: '8px' }}>
                Please contact the administrator for assistance.
              </p>
            </div>
            
            <div style={{
              marginTop: '24px',
              padding: '12px',
              color: '#5d739b',
              fontSize: '0.75rem',
              borderTop: '1px solid #1a2536'
            }}>
              🔒 Exam permanently locked • {new Date().toLocaleString()}
            </div>
          </div>

          <style jsx>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            @keyframes slideIn {
              from {
                transform: translateY(-50px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            @keyframes shake {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-10deg); }
              75% { transform: rotate(10deg); }
            }
          `}</style>
        </div>
      </>
    );
  }

  // Instructions Screen
  if (examState.showInstructions) {
    return (
      <>
        {/* Clarity Script for Instructions Screen */}
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "y4pia34m1q");
            `
          }}
        />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(20, 27, 38, 0.95)',
            padding: '48px',
            borderRadius: '24px',
            border: '1px solid #2d3a4f',
            maxWidth: '700px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{
                color: '#f7b731',
                fontSize: '2.2rem',
                fontWeight: '700',
                marginBottom: '8px'
              }}>
                📝 Softmax BDE
              </h1>
              <h2 style={{
                color: '#b6ceff',
                fontSize: '1.2rem',
                fontWeight: '400'
              }}>
                Requirement Test
              </h2>
            </div>

            {/* WARNING MESSAGE - BEFORE START */}
            <div style={{
              background: 'rgba(251,191,36,0.15)',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '2px solid #fbbf24',
              animation: 'pulseWarning 2s infinite'
            }}>
              <p style={{
                color: '#fbbf24',
                fontSize: '1rem',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                ⚠️ IMPORTANT: You must enter FULLSCREEN before starting the exam!
              </p>
              <p style={{
                color: '#b6ceff',
                fontSize: '0.85rem',
                textAlign: 'center',
                marginTop: '6px'
              }}>
                Click the "Enter Fullscreen" button below first, then click "Start Exam"
              </p>
            </div>

            {/* Camera Preview */}
            <div style={{
              background: '#0a0f18',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid #2d3a4f'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ color: '#b6ceff', fontSize: '0.9rem', fontWeight: '600' }}>
                  📹 Camera Preview
                </span>
                {examState.cameraActive ? (
                  <span style={{ 
                    color: '#4ade80', 
                    fontSize: '0.85rem',
                    background: 'rgba(74,222,128,0.1)',
                    padding: '4px 12px',
                    borderRadius: '12px'
                  }}>
                    ✅ Connected
                  </span>
                ) : (
                  <span style={{ 
                    color: '#dc2626', 
                    fontSize: '0.85rem',
                    background: 'rgba(220,38,38,0.1)',
                    padding: '4px 12px',
                    borderRadius: '12px'
                  }}>
                    {examState.cameraError ? '❌ Access Denied' : '⏳ Loading...'}
                  </span>
                )}
              </div>
              <div style={{
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                {!examState.cameraActive && !examState.cameraError && (
                  <div style={{
                    color: '#5d739b',
                    position: 'absolute',
                    fontSize: '0.9rem',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '10px 20px',
                    borderRadius: '8px'
                  }}>
                    ⏳ Loading camera...
                  </div>
                )}
                {examState.cameraError && (
                  <div style={{
                    color: '#dc2626',
                    position: 'absolute',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    padding: '20px',
                    background: 'rgba(0,0,0,0.9)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚫</div>
                    <div>⚠️ Camera access required</div>
                    <div style={{ fontSize: '0.8rem', color: '#b6ceff', marginTop: '8px' }}>
                      Please allow camera and microphone permissions
                    </div>
                  </div>
                )}
                {examState.cameraActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#4ade80',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    ● LIVE
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen Button - Must click first */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <button
                onClick={enterFullscreen}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: examState.isFullscreen 
                    ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                    : 'linear-gradient(135deg, #f7b731, #f59e0b)',
                  color: examState.isFullscreen ? '#0a0e14' : '#0a0e14',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: examState.isFullscreen 
                    ? '0 4px 20px rgba(74,222,128,0.3)'
                    : '0 4px 20px rgba(247,183,49,0.3)'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {examState.isFullscreen ? '✅ Fullscreen Active' : '⛶ Enter Fullscreen (Required)'}
              </button>
            </div>

            {/* Start Exam Button - Only works if fullscreen is active */}
            <button
              onClick={startExam}
              disabled={!examState.cameraActive || examState.cameraError || !examState.isFullscreen}
              style={{
                width: '100%',
                padding: '18px',
                background: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
                  ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
                  : '#2d3a4f',
                color: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
                  ? '#0a0e14' 
                  : '#5d739b',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
                  ? 'pointer' 
                  : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: (examState.cameraActive && !examState.cameraError && examState.isFullscreen)
                  ? '0 4px 20px rgba(74,222,128,0.3)'
                  : 'none',
                opacity: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (examState.cameraActive && !examState.cameraError && examState.isFullscreen) {
                  e.target.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              {!examState.isFullscreen ? '⚠️ Enter Fullscreen First' :
               examState.cameraActive && !examState.cameraError 
                ? '✅ Start Exam' 
                : examState.cameraError 
                  ? '⚠️ Camera Required' 
                  : '⏳ Loading Camera...'}
            </button>

            {/* Status Message */}
            {!examState.isFullscreen && (
              <p style={{
                color: '#fbbf24',
                fontSize: '0.9rem',
                textAlign: 'center',
                marginTop: '12px',
                fontWeight: '600'
              }}>
                ⚠️ Click "Enter Fullscreen" button above first!
              </p>
            )}
            
            {examState.isFullscreen && examState.cameraActive && (
              <p style={{
                color: '#4ade80',
                fontSize: '0.9rem',
                textAlign: 'center',
                marginTop: '12px',
                fontWeight: '600'
              }}>
                ✅ Ready to start! Click "Start Exam" to begin.
              </p>
            )}
            
            {examState.cameraError && (
              <p style={{
                color: '#dc2626',
                fontSize: '0.85rem',
                textAlign: 'center',
                marginTop: '12px'
              }}>
                Please allow camera access in your browser settings and refresh the page.
              </p>
            )}

            {/* Rules */}
            <div style={{
              background: '#0a0f18',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid #2d3a4f',
              marginTop: '20px'
            }}>
              <h3 style={{ 
                color: '#f7b731', 
                fontSize: '1rem', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ <span>Important Rules</span>
              </h3>
              <ul style={{
                color: '#b6ceff',
                fontSize: '0.9rem',
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                <li style={{ 
                  padding: '10px 0', 
                  borderBottom: '1px solid #1a2536',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🖥️</span>
                  <span><strong>Fullscreen Required</strong> - Must stay in fullscreen mode</span>
                </li>
                <li style={{ 
                  padding: '10px 0', 
                  borderBottom: '1px solid #1a2536',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>📹</span>
                  <span><strong>Camera ON</strong> - Video must remain active</span>
                </li>
                <li style={{ 
                  padding: '10px 0', 
                  borderBottom: '1px solid #1a2536',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🚫</span>
                  <span><strong>No Tab Switching</strong> - 3 violations = Locked</span>
                </li>
                <li style={{ 
                  padding: '10px 0', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                  <span><strong>No Exiting Fullscreen</strong> - 3 violations = Locked</span>
                </li>
              </ul>
            </div>

            {/* Violation Warning */}
            {examState.violationCount > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.1)',
                padding: '12px',
                borderRadius: '12px',
                marginTop: '16px',
                border: '1px solid #fbbf24'
              }}>
                <p style={{
                  color: '#fbbf24',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  ⚠️ Previous Violations: {examState.violationCount}/3
                  {examState.violationCount >= 2 && ' ⚠️ DANGER: 3 violations will lock exam!'}
                </p>
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes pulseWarning {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      </>
    );
  }

  // Main Exam Screen
  return (
    <>
      {/* Clarity Script for Main Exam Screen */}
      <Script
        id="clarity-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "y4pia34m1q");
          `
        }}
      />
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0e14',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Warning Banner */}
        {examState.showWarning && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: examState.violationCount >= 2 
              ? 'rgba(220, 38, 38, 0.98)' 
              : 'rgba(251, 191, 36, 0.98)',
            color: examState.violationCount >= 2 ? 'white' : '#0a0e14',
            padding: '16px 20px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            animation: 'slideDown 0.3s ease',
            boxShadow: '0 4px 30px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)'
          }}>
            {examState.warningMessage}
            <br />
            <span style={{ 
              fontSize: '0.8rem', 
              opacity: 0.9,
              display: 'block',
              marginTop: '4px'
            }}>
              ⚠️ Violations: {examState.violationCount}/3
              {examState.violationCount >= 2 && ' ⚠️ ONE MORE VIOLATION WILL LOCK THE EXAM!'}
            </span>
          </div>
        )}

        {/* Status Bar */}
        <div style={{
          background: 'rgba(20, 27, 38, 0.95)',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #2d3a4f',
          flexShrink: 0,
          zIndex: 10,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ 
              color: '#b6ceff', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>📹</span>
              <span style={{ 
                color: examState.cameraActive ? '#4ade80' : '#dc2626',
                fontWeight: '600'
              }}>
                {examState.cameraActive ? '● ON' : '● OFF'}
              </span>
            </div>
            <div style={{ 
              color: '#b6ceff', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🎤</span>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>● ON</span>
            </div>
            <div style={{ 
              color: '#b6ceff', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠️</span>
              <span style={{ 
                color: examState.violationCount >= 2 ? '#dc2626' : '#fbbf24',
                fontWeight: '700'
              }}>
                Violations: {examState.violationCount}/3
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {!examState.isFullscreen ? (
              <button
                onClick={enterFullscreen}
                style={{
                  background: 'linear-gradient(135deg, #f7b731, #f59e0b)',
                  color: '#0a0e14',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                ⛶ Enter Fullscreen
              </button>
            ) : (
              <span style={{ 
                color: '#4ade80', 
                fontSize: '0.85rem',
                fontWeight: '600',
                background: 'rgba(74,222,128,0.1)',
                padding: '6px 16px',
                borderRadius: '20px'
              }}>
                ✅ Fullscreen
              </span>
            )}
            <span style={{ color: '#5d739b', fontSize: '0.75rem' }}>
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Live Video Box */}
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '280px',
          height: '210px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid rgba(45, 58, 79, 0.8)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
          zIndex: 100,
          background: '#000',
          transition: 'all 0.3s ease'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
          {!examState.cameraActive && (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5d739b',
              fontSize: '0.9rem',
              background: '#0a0f18',
              position: 'absolute',
              top: 0,
              left: 0
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📹</div>
                Camera Off
              </div>
            </div>
          )}
          {examState.cameraActive && (
            <>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0,0,0,0.8)',
                color: '#4ade80',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'blink 1s infinite'
                }} />
                LIVE
              </div>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.8)',
                color: '#fbbf24',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.6rem',
                fontWeight: '600'
              }}>
                {new Date().toLocaleTimeString()}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.8)',
                color: '#b6ceff',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.6rem',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                👤 You
              </div>
            </>
          )}
        </div>

        {/* Google Form */}
        {examState.showForm && !examState.examLocked && (
          <iframe
            src={GOOGLE_FORM_URL}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              background: 'white'
            }}
            allow="camera; microphone; fullscreen"
            allowFullScreen
            title="Softmax BDE Requirement Test"
          />
        )}

        {/* Fullscreen Warning Overlay */}
        {!examState.isFullscreen && examState.examStarted && !examState.examLocked && !examState.showWarning && (
          <div style={{
            position: 'fixed',
            bottom: '260px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(247, 183, 49, 0.95)',
            color: '#0a0e14',
            padding: '16px 32px',
            borderRadius: '16px',
            fontWeight: '700',
            fontSize: '1rem',
            zIndex: 999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            animation: 'bounce 2s infinite'
          }}>
            ⚠️ FULLSCREEN REQUIRED! Click the button above.
          </div>
        )}

        <style jsx>{`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
            }
            to {
              transform: translateY(0);
            }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
        `}</style>
      </div>
    </>
  );
}


















// // app/page.js
// // ULTIMATE EXAM SYSTEM - FINAL WITH ALL FIXES

// 'use client';

// import { useEffect, useState, useRef } from 'react';

// export default function Home() {
//   // State Management
//   const [examState, setExamState] = useState({
//     isFullscreen: false,
//     showForm: false,
//     examLocked: false,
//     violationCount: 0,
//     cameraActive: false,
//     cameraError: false,
//     examStarted: false,
//     showInstructions: true,
//     lockReason: '',
//     warningMessage: '',
//     showWarning: false,
//     videoInitialized: false,
//     fullscreenAttempted: false
//   });

//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const intervalRef = useRef(null);
//   const GOOGLE_FORM_URL = "https://forms.gle/UZvyrVXQxDVbPnBV8";

//   // Load from localStorage with validation
//   useEffect(() => {
//     const loadExamData = () => {
//       try {
//         const savedViolations = localStorage.getItem('exam_violations');
//         const savedLocked = localStorage.getItem('exam_locked');
//         const savedReason = localStorage.getItem('exam_lock_reason');

//         let violations = savedViolations ? parseInt(savedViolations) : 0;

//         // Validate data
//         if (isNaN(violations) || violations < 0) violations = 0;

//         setExamState(prev => ({
//           ...prev,
//           violationCount: violations
//         }));

//         // Check if exam should be locked
//         if (savedLocked === 'true' || violations >= 3) {
//           setExamState(prev => ({
//             ...prev,
//             examLocked: true,
//             showForm: false,
//             showInstructions: false,
//             lockReason: savedReason || 'Maximum violations (3)'
//           }));
//           localStorage.setItem('exam_locked', 'true');
//         }

//         console.log('📊 Loaded exam data:', { violations, locked: savedLocked });
//       } catch (error) {
//         console.error('Error loading exam data:', error);
//       }
//     };

//     loadExamData();
//   }, []);

//   // Start Camera
//   const startCamera = async () => {
//     try {
//       console.log('📹 Starting camera...');
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           facingMode: 'user'
//         },
//         audio: true
//       });

//       streamRef.current = stream;
      
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
        
//         videoRef.current.onloadedmetadata = () => {
//           videoRef.current.play()
//             .then(() => {
//               console.log('✅ Video playing successfully');
//               setExamState(prev => ({ 
//                 ...prev, 
//                 cameraActive: true,
//                 videoInitialized: true 
//               }));
//             })
//             .catch(err => {
//               console.error('❌ Video play error:', err);
//               setTimeout(() => {
//                 if (videoRef.current) {
//                   videoRef.current.play()
//                     .then(() => {
//                       setExamState(prev => ({ 
//                         ...prev, 
//                         cameraActive: true,
//                         videoInitialized: true 
//                       }));
//                     })
//                     .catch(e => console.error('❌ Second play attempt failed:', e));
//                 }
//               }, 500);
//             });
//         };

//         videoRef.current.load();
//         console.log('✅ Camera started successfully');
//       }
//     } catch (err) {
//       console.error('❌ Camera error:', err);
//       setExamState(prev => ({ ...prev, cameraError: true }));
//       showWarning('⚠️ Camera access required! Please allow camera permissions.');
//     }
//   };

//   // Show Warning with Auto-Dismiss
//   const showWarning = (message, duration = 4000) => {
//     setExamState(prev => ({
//       ...prev,
//       warningMessage: message,
//       showWarning: true
//     }));

//     setTimeout(() => {
//       setExamState(prev => ({
//         ...prev,
//         showWarning: false,
//         warningMessage: ''
//       }));
//     }, duration);
//   };

//   // Increment Violation
//   const incrementViolation = (reason) => {
//     if (examState.examLocked) {
//       console.log('🔒 Exam already locked, ignoring violation');
//       return;
//     }

//     const newCount = examState.violationCount + 1;
//     console.log(`🚨 Violation detected: ${reason}, Count: ${newCount}/3`);

//     setExamState(prev => ({
//       ...prev,
//       violationCount: newCount
//     }));

//     localStorage.setItem('exam_violations', newCount.toString());

//     showWarning(`⚠️ VIOLATION ${newCount}/3: ${reason}`, 3000);

//     if (newCount >= 3) {
//       lockExam('Maximum violations (3)');
//     }
//   };

//   // Lock Exam
//   const lockExam = (reason) => {
//     console.log(`🔒 Locking exam: ${reason}`);
    
//     setExamState(prev => ({
//       ...prev,
//       examLocked: true,
//       showForm: false,
//       showInstructions: false,
//       lockReason: reason,
//       examStarted: false
//     }));

//     localStorage.setItem('exam_locked', 'true');
//     localStorage.setItem('exam_lock_reason', reason);

//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//       setExamState(prev => ({ ...prev, cameraActive: false }));
//     }

//     showWarning(`🔒 EXAM LOCKED! Reason: ${reason}`, 5000);

//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   // Enter Fullscreen
//   const enterFullscreen = () => {
//     if (document.documentElement.requestFullscreen) {
//       document.documentElement.requestFullscreen()
//         .then(() => {
//           console.log('⛶ Fullscreen entered successfully');
//           setExamState(prev => ({ ...prev, isFullscreen: true, fullscreenAttempted: true }));
//         })
//         .catch(err => {
//           console.log('❌ Fullscreen error:', err);
//           showWarning('⚠️ Please allow fullscreen access');
//         });
//     }
//   };

//   // Start Exam - ONLY IF FULLSCREEN IS ACTIVE
//   const startExam = () => {
//     console.log('🚀 Starting exam...');

//     // Check if already locked
//     if (examState.violationCount >= 3 || examState.examLocked) {
//       lockExam('Exam already locked');
//       return;
//     }

//     if (!examState.cameraActive) {
//       showWarning('⚠️ Camera not active! Please allow camera access.');
//       return;
//     }

//     // Check if fullscreen is active
//     if (!examState.isFullscreen) {
//       showWarning('⚠️ Please enter FULLSCREEN first! Click the "Enter Fullscreen" button.', 4000);
//       return;
//     }

//     // All conditions met - start exam
//     setExamState(prev => ({
//       ...prev,
//       examStarted: true,
//       showInstructions: false,
//       showForm: true
//     }));

//     // Start monitoring
//     startMonitoring();
    
//     console.log('✅ Exam started successfully!');
//   };

//   // Start Monitoring
//   const startMonitoring = () => {
//     console.log('👁️ Starting exam monitoring...');

//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//     }

//     intervalRef.current = setInterval(() => {
//       if (examState.examLocked || !examState.examStarted) {
//         return;
//       }

//       const isFull = document.fullscreenElement !== null;
      
//       if (!isFull) {
//         console.log('🚨 Interval: Fullscreen violation detected');
//         incrementViolation('Fullscreen exited');
//         // Page reload on fullscreen exit
//         if (examState.examStarted && !examState.examLocked) {
//           console.log('🔄 Reloading page due to fullscreen exit');
//           setTimeout(() => {
//             window.location.reload();
//           }, 100);
//         }
//       }

//       if (!examState.cameraActive && !examState.examLocked) {
//         console.log('🚨 Interval: Camera turned off');
//         incrementViolation('Camera turned off');
//       }
//     }, 300);
//   };

//   // Event Handlers
//   const handleFullscreenChange = () => {
//     const isFull = document.fullscreenElement !== null;
//     setExamState(prev => ({ ...prev, isFullscreen: isFull }));

//     if (!isFull && examState.examStarted && !examState.examLocked) {
//       console.log('🚨 Fullscreen change: Exited fullscreen');
//       incrementViolation('Fullscreen exited');
      
//       console.log('🔄 Reloading page due to fullscreen exit');
//       setTimeout(() => {
//         window.location.reload();
//       }, 100);
//     }
//   };

//   const handleVisibilityChange = () => {
//     if (document.hidden && examState.examStarted && !examState.examLocked) {
//       console.log('🚨 Tab switch detected');
//       incrementViolation('Tab switched');
//     }
//   };

//   const handleBlur = () => {
//     if (examState.examStarted && !examState.examLocked) {
//       console.log('🚨 Window blurred (tab switch)');
//       incrementViolation('Window blurred');
//     }
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === 'F11') {
//       e.preventDefault();
//       console.log('🚨 F11 key pressed');
//       if (examState.examStarted && !examState.examLocked) {
//         incrementViolation('F11 key pressed (fullscreen attempt)');
//         setTimeout(() => {
//           window.location.reload();
//         }, 100);
//       }
//     }

//     if (examState.examStarted && !examState.examLocked) {
//       if (e.key === 'F12') {
//         e.preventDefault();
//         incrementViolation('DevTools attempted');
//       }
//       if (e.ctrlKey && e.shiftKey && e.key === 'I') {
//         e.preventDefault();
//         incrementViolation('DevTools attempted');
//       }
//       if (e.ctrlKey && e.shiftKey && e.key === 'C') {
//         e.preventDefault();
//         incrementViolation('DevTools attempted');
//       }
//       if (e.ctrlKey && e.key === 'u') {
//         e.preventDefault();
//         incrementViolation('View source attempted');
//       }
//       if (e.ctrlKey && e.shiftKey && e.key === 'J') {
//         e.preventDefault();
//         incrementViolation('DevTools attempted');
//       }
//       if (e.key === 'Escape') {
//         e.preventDefault();
//         incrementViolation('ESC key pressed');
//         setTimeout(() => {
//           window.location.reload();
//         }, 100);
//       }
//     }
//   };

//   const handleContextMenu = (e) => {
//     if (examState.examStarted && !examState.examLocked) {
//       e.preventDefault();
//       incrementViolation('Right click detected');
//     }
//   };

//   const handleResize = () => {
//     if (examState.examStarted && !examState.examLocked) {
//       const isFull = document.fullscreenElement !== null;
//       if (!isFull) {
//         console.log('🚨 Resize: Fullscreen violation');
//         incrementViolation('Fullscreen exited');
//         setTimeout(() => {
//           window.location.reload();
//         }, 100);
//       }
//     }
//   };

//   // Setup Event Listeners
//   useEffect(() => {
//     console.log('📌 Setting up event listeners...');
    
//     startCamera();

//     document.addEventListener('fullscreenchange', handleFullscreenChange);
//     document.addEventListener('visibilitychange', handleVisibilityChange);
//     window.addEventListener('blur', handleBlur);
//     window.addEventListener('resize', handleResize);
//     document.addEventListener('keydown', handleKeyDown);
//     document.addEventListener('contextmenu', handleContextMenu);

//     document.addEventListener('pageshow', () => {
//       if (examState.examStarted && !examState.examLocked) {
//         const isFull = document.fullscreenElement !== null;
//         if (!isFull) {
//           console.log('🚨 Page show: Fullscreen violation');
//           incrementViolation('Fullscreen exited');
//           setTimeout(() => {
//             window.location.reload();
//           }, 100);
//         }
//       }
//     });

//     return () => {
//       console.log('🧹 Cleaning up event listeners...');
//       document.removeEventListener('fullscreenchange', handleFullscreenChange);
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//       window.removeEventListener('blur', handleBlur);
//       window.removeEventListener('resize', handleResize);
//       document.removeEventListener('keydown', handleKeyDown);
//       document.removeEventListener('contextmenu', handleContextMenu);
      
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
      
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);

//   // Update monitoring when exam state changes
//   useEffect(() => {
//     if (examState.examStarted && !examState.examLocked) {
//       startMonitoring();
//     }
//   }, [examState.examStarted, examState.examLocked]);

//   // ==================== RENDER COMPONENTS ====================

//   // Exam Locked Screen
//   if (examState.examLocked) {
//     return (
//       <div style={{
//         height: '100vh',
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
//         padding: '20px',
//         position: 'relative',
//         overflow: 'hidden'
//       }}>
//         <div style={{
//           position: 'absolute',
//           top: '-50%',
//           left: '-50%',
//           width: '200%',
//           height: '200%',
//           background: 'radial-gradient(circle at center, rgba(220,38,38,0.1) 0%, transparent 70%)',
//           animation: 'pulse 2s ease-in-out infinite'
//         }} />
        
//         <div style={{
//           background: 'rgba(20, 27, 38, 0.95)',
//           padding: '60px 48px',
//           borderRadius: '24px',
//           border: '2px solid #dc2626',
//           maxWidth: '550px',
//           width: '100%',
//           textAlign: 'center',
//           boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.2)',
//           position: 'relative',
//           zIndex: 1,
//           animation: 'slideIn 0.5s ease'
//         }}>
//           <div style={{ fontSize: '5rem', marginBottom: '20px', animation: 'shake 0.5s ease' }}>🔒</div>
//           <h1 style={{ 
//             color: '#dc2626', 
//             fontSize: '2.8rem', 
//             fontWeight: '800', 
//             marginBottom: '16px',
//             textShadow: '0 0 20px rgba(220,38,38,0.3)'
//           }}>
//             EXAM LOCKED
//           </h1>
//           <p style={{ 
//             color: '#fbbf24', 
//             fontSize: '1.2rem', 
//             marginBottom: '24px',
//             fontWeight: '600'
//           }}>
//             ⛔ This exam has been permanently locked
//           </p>
          
//           <div style={{
//             background: '#0a0f18',
//             padding: '24px',
//             borderRadius: '16px',
//             border: '1px solid #2d3a4f',
//             marginBottom: '24px'
//           }}>
//             <div style={{ marginBottom: '12px' }}>
//               <p style={{ color: '#b6ceff', fontSize: '1rem' }}>
//                 <strong style={{ color: '#f0f4ff' }}>🔴 Lock Reason:</strong>
//               </p>
//               <p style={{ 
//                 color: '#dc2626', 
//                 fontSize: '1.1rem',
//                 fontWeight: 'bold',
//                 background: 'rgba(220,38,38,0.1)',
//                 padding: '8px',
//                 borderRadius: '8px',
//                 marginTop: '4px'
//               }}>
//                 {examState.lockReason || 'Violation detected'}
//               </p>
//             </div>
            
//             <div style={{ 
//               display: 'grid', 
//               gridTemplateColumns: '1fr 1fr',
//               gap: '12px',
//               marginTop: '16px',
//               paddingTop: '16px',
//               borderTop: '1px solid #2d3a4f'
//             }}>
//               <div>
//                 <p style={{ color: '#5d739b', fontSize: '0.8rem' }}>Violations</p>
//                 <p style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: 'bold' }}>
//                   {examState.violationCount}/3
//                 </p>
//               </div>
//               <div>
//                 <p style={{ color: '#5d739b', fontSize: '0.8rem' }}>Status</p>
//                 <p style={{ color: '#dc2626', fontSize: '1rem', fontWeight: 'bold' }}>
//                   🔴 LOCKED
//                 </p>
//               </div>
//             </div>
//           </div>
          
//           <div style={{
//             background: 'rgba(220,38,38,0.1)',
//             padding: '16px',
//             borderRadius: '12px',
//             border: '1px solid rgba(220,38,38,0.3)'
//           }}>
//             <p style={{ color: '#b6ceff', fontSize: '0.9rem' }}>
//               ⚠️ This exam has been permanently locked due to policy violations.
//             </p>
//             <p style={{ color: '#5d739b', fontSize: '0.85rem', marginTop: '8px' }}>
//               Please contact the administrator for assistance.
//             </p>
//           </div>
          
//           <div style={{
//             marginTop: '24px',
//             padding: '12px',
//             color: '#5d739b',
//             fontSize: '0.75rem',
//             borderTop: '1px solid #1a2536'
//           }}>
//             🔒 Exam permanently locked • {new Date().toLocaleString()}
//           </div>
//         </div>

//         <style jsx>{`
//           @keyframes pulse {
//             0%, 100% { transform: scale(1); opacity: 0.5; }
//             50% { transform: scale(1.1); opacity: 1; }
//           }
//           @keyframes slideIn {
//             from {
//               transform: translateY(-50px);
//               opacity: 0;
//             }
//             to {
//               transform: translateY(0);
//               opacity: 1;
//             }
//           }
//           @keyframes shake {
//             0%, 100% { transform: rotate(0deg); }
//             25% { transform: rotate(-10deg); }
//             75% { transform: rotate(10deg); }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   // Instructions Screen
//   if (examState.showInstructions) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
//         padding: '20px'
//       }}>
//         <div style={{
//           background: 'rgba(20, 27, 38, 0.95)',
//           padding: '48px',
//           borderRadius: '24px',
//           border: '1px solid #2d3a4f',
//           maxWidth: '700px',
//           width: '100%',
//           boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
//           animation: 'fadeIn 0.5s ease'
//         }}>
//           <div style={{ textAlign: 'center', marginBottom: '30px' }}>
//             <h1 style={{
//               color: '#f7b731',
//               fontSize: '2.2rem',
//               fontWeight: '700',
//               marginBottom: '8px'
//             }}>
//               📝 Softmax BDE
//             </h1>
//             <h2 style={{
//               color: '#b6ceff',
//               fontSize: '1.2rem',
//               fontWeight: '400'
//             }}>
//               Requirement Test
//             </h2>
//           </div>

//           {/* WARNING MESSAGE - BEFORE START */}
//           <div style={{
//             background: 'rgba(251,191,36,0.15)',
//             padding: '16px 20px',
//             borderRadius: '12px',
//             marginBottom: '20px',
//             border: '2px solid #fbbf24',
//             animation: 'pulseWarning 2s infinite'
//           }}>
//             <p style={{
//               color: '#fbbf24',
//               fontSize: '1rem',
//               fontWeight: '700',
//               textAlign: 'center'
//             }}>
//               ⚠️ IMPORTANT: You must enter FULLSCREEN before starting the exam!
//             </p>
//             <p style={{
//               color: '#b6ceff',
//               fontSize: '0.85rem',
//               textAlign: 'center',
//               marginTop: '6px'
//             }}>
//               Click the "Enter Fullscreen" button below first, then click "Start Exam"
//             </p>
//           </div>

//           {/* Camera Preview */}
//           <div style={{
//             background: '#0a0f18',
//             borderRadius: '16px',
//             padding: '16px',
//             marginBottom: '24px',
//             border: '1px solid #2d3a4f'
//           }}>
//             <div style={{
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               marginBottom: '12px'
//             }}>
//               <span style={{ color: '#b6ceff', fontSize: '0.9rem', fontWeight: '600' }}>
//                 📹 Camera Preview
//               </span>
//               {examState.cameraActive ? (
//                 <span style={{ 
//                   color: '#4ade80', 
//                   fontSize: '0.85rem',
//                   background: 'rgba(74,222,128,0.1)',
//                   padding: '4px 12px',
//                   borderRadius: '12px'
//                 }}>
//                   ✅ Connected
//                 </span>
//               ) : (
//                 <span style={{ 
//                   color: '#dc2626', 
//                   fontSize: '0.85rem',
//                   background: 'rgba(220,38,38,0.1)',
//                   padding: '4px 12px',
//                   borderRadius: '12px'
//                 }}>
//                   {examState.cameraError ? '❌ Access Denied' : '⏳ Loading...'}
//                 </span>
//               )}
//             </div>
//             <div style={{
//               background: '#000',
//               borderRadius: '12px',
//               overflow: 'hidden',
//               aspectRatio: '4/3',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               position: 'relative'
//             }}>
//               <video
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted
//                 style={{
//                   width: '100%',
//                   height: '100%',
//                   objectFit: 'cover',
//                   display: 'block'
//                 }}
//               />
//               {!examState.cameraActive && !examState.cameraError && (
//                 <div style={{
//                   color: '#5d739b',
//                   position: 'absolute',
//                   fontSize: '0.9rem',
//                   background: 'rgba(0,0,0,0.7)',
//                   padding: '10px 20px',
//                   borderRadius: '8px'
//                 }}>
//                   ⏳ Loading camera...
//                 </div>
//               )}
//               {examState.cameraError && (
//                 <div style={{
//                   color: '#dc2626',
//                   position: 'absolute',
//                   fontSize: '0.9rem',
//                   textAlign: 'center',
//                   padding: '20px',
//                   background: 'rgba(0,0,0,0.9)',
//                   width: '100%',
//                   height: '100%',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center'
//                 }}>
//                   <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚫</div>
//                   <div>⚠️ Camera access required</div>
//                   <div style={{ fontSize: '0.8rem', color: '#b6ceff', marginTop: '8px' }}>
//                     Please allow camera and microphone permissions
//                   </div>
//                 </div>
//               )}
//               {examState.cameraActive && (
//                 <div style={{
//                   position: 'absolute',
//                   bottom: '8px',
//                   right: '8px',
//                   background: 'rgba(0,0,0,0.7)',
//                   color: '#4ade80',
//                   padding: '2px 10px',
//                   borderRadius: '4px',
//                   fontSize: '0.7rem',
//                   fontWeight: 'bold'
//                 }}>
//                   ● LIVE
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Fullscreen Button - Must click first */}
//           <div style={{
//             display: 'flex',
//             gap: '12px',
//             marginBottom: '16px'
//           }}>
//             <button
//               onClick={enterFullscreen}
//               style={{
//                 flex: 1,
//                 padding: '16px',
//                 background: examState.isFullscreen 
//                   ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
//                   : 'linear-gradient(135deg, #f7b731, #f59e0b)',
//                 color: examState.isFullscreen ? '#0a0e14' : '#0a0e14',
//                 border: 'none',
//                 borderRadius: '14px',
//                 fontSize: '1rem',
//                 fontWeight: '700',
//                 cursor: 'pointer',
//                 transition: 'all 0.3s ease',
//                 boxShadow: examState.isFullscreen 
//                   ? '0 4px 20px rgba(74,222,128,0.3)'
//                   : '0 4px 20px rgba(247,183,49,0.3)'
//               }}
//               onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
//               onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
//             >
//               {examState.isFullscreen ? '✅ Fullscreen Active' : '⛶ Enter Fullscreen (Required)'}
//             </button>
//           </div>

//           {/* Start Exam Button - Only works if fullscreen is active */}
//           <button
//             onClick={startExam}
//             disabled={!examState.cameraActive || examState.cameraError || !examState.isFullscreen}
//             style={{
//               width: '100%',
//               padding: '18px',
//               background: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
//                 ? 'linear-gradient(135deg, #4ade80, #22c55e)' 
//                 : '#2d3a4f',
//               color: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
//                 ? '#0a0e14' 
//                 : '#5d739b',
//               border: 'none',
//               borderRadius: '14px',
//               fontSize: '1.1rem',
//               fontWeight: '700',
//               cursor: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) 
//                 ? 'pointer' 
//                 : 'not-allowed',
//               transition: 'all 0.3s ease',
//               boxShadow: (examState.cameraActive && !examState.cameraError && examState.isFullscreen)
//                 ? '0 4px 20px rgba(74,222,128,0.3)'
//                 : 'none',
//               opacity: (examState.cameraActive && !examState.cameraError && examState.isFullscreen) ? 1 : 0.6
//             }}
//             onMouseEnter={(e) => {
//               if (examState.cameraActive && !examState.cameraError && examState.isFullscreen) {
//                 e.target.style.transform = 'scale(1.02)';
//               }
//             }}
//             onMouseLeave={(e) => {
//               e.target.style.transform = 'scale(1)';
//             }}
//           >
//             {!examState.isFullscreen ? '⚠️ Enter Fullscreen First' :
//              examState.cameraActive && !examState.cameraError 
//               ? '✅ Start Exam' 
//               : examState.cameraError 
//                 ? '⚠️ Camera Required' 
//                 : '⏳ Loading Camera...'}
//           </button>

//           {/* Status Message */}
//           {!examState.isFullscreen && (
//             <p style={{
//               color: '#fbbf24',
//               fontSize: '0.9rem',
//               textAlign: 'center',
//               marginTop: '12px',
//               fontWeight: '600'
//             }}>
//               ⚠️ Click "Enter Fullscreen" button above first!
//             </p>
//           )}
          
//           {examState.isFullscreen && examState.cameraActive && (
//             <p style={{
//               color: '#4ade80',
//               fontSize: '0.9rem',
//               textAlign: 'center',
//               marginTop: '12px',
//               fontWeight: '600'
//             }}>
//               ✅ Ready to start! Click "Start Exam" to begin.
//             </p>
//           )}
          
//           {examState.cameraError && (
//             <p style={{
//               color: '#dc2626',
//               fontSize: '0.85rem',
//               textAlign: 'center',
//               marginTop: '12px'
//             }}>
//               Please allow camera access in your browser settings and refresh the page.
//             </p>
//           )}

//           {/* Rules */}
//           <div style={{
//             background: '#0a0f18',
//             padding: '20px',
//             borderRadius: '16px',
//             border: '1px solid #2d3a4f',
//             marginTop: '20px'
//           }}>
//             <h3 style={{ 
//               color: '#f7b731', 
//               fontSize: '1rem', 
//               marginBottom: '16px',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '8px'
//             }}>
//               ⚠️ <span>Important Rules</span>
//             </h3>
//             <ul style={{
//               color: '#b6ceff',
//               fontSize: '0.9rem',
//               listStyle: 'none',
//               padding: 0,
//               margin: 0
//             }}>
//               <li style={{ 
//                 padding: '10px 0', 
//                 borderBottom: '1px solid #1a2536',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '12px'
//               }}>
//                 <span style={{ fontSize: '1.2rem' }}>🖥️</span>
//                 <span><strong>Fullscreen Required</strong> - Must stay in fullscreen mode</span>
//               </li>
//               <li style={{ 
//                 padding: '10px 0', 
//                 borderBottom: '1px solid #1a2536',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '12px'
//               }}>
//                 <span style={{ fontSize: '1.2rem' }}>📹</span>
//                 <span><strong>Camera ON</strong> - Video must remain active</span>
//               </li>
//               <li style={{ 
//                 padding: '10px 0', 
//                 borderBottom: '1px solid #1a2536',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '12px'
//               }}>
//                 <span style={{ fontSize: '1.2rem' }}>🚫</span>
//                 <span><strong>No Tab Switching</strong> - 3 violations = Locked</span>
//               </li>
//               <li style={{ 
//                 padding: '10px 0', 
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '12px'
//               }}>
//                 <span style={{ fontSize: '1.2rem' }}>🔒</span>
//                 <span><strong>No Exiting Fullscreen</strong> - 3 violations = Locked</span>
//               </li>
//             </ul>
//           </div>

//           {/* Violation Warning */}
//           {examState.violationCount > 0 && (
//             <div style={{
//               background: 'rgba(251,191,36,0.1)',
//               padding: '12px',
//               borderRadius: '12px',
//               marginTop: '16px',
//               border: '1px solid #fbbf24'
//             }}>
//               <p style={{
//                 color: '#fbbf24',
//                 fontSize: '0.9rem',
//                 textAlign: 'center',
//                 fontWeight: '600'
//               }}>
//                 ⚠️ Previous Violations: {examState.violationCount}/3
//                 {examState.violationCount >= 2 && ' ⚠️ DANGER: 3 violations will lock exam!'}
//               </p>
//             </div>
//           )}
//         </div>

//         <style jsx>{`
//           @keyframes fadeIn {
//             from {
//               opacity: 0;
//               transform: translateY(20px);
//             }
//             to {
//               opacity: 1;
//               transform: translateY(0);
//             }
//           }
//           @keyframes pulseWarning {
//             0%, 100% { opacity: 1; }
//             50% { opacity: 0.7; }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   // Main Exam Screen
//   return (
//     <div style={{
//       height: '100vh',
//       display: 'flex',
//       flexDirection: 'column',
//       background: '#0a0e14',
//       margin: 0,
//       padding: 0,
//       overflow: 'hidden',
//       position: 'relative'
//     }}>
//       {/* Warning Banner */}
//       {examState.showWarning && (
//         <div style={{
//           position: 'fixed',
//           top: 0,
//           left: 0,
//           right: 0,
//           zIndex: 9999,
//           background: examState.violationCount >= 2 
//             ? 'rgba(220, 38, 38, 0.98)' 
//             : 'rgba(251, 191, 36, 0.98)',
//           color: examState.violationCount >= 2 ? 'white' : '#0a0e14',
//           padding: '16px 20px',
//           textAlign: 'center',
//           fontWeight: 'bold',
//           fontSize: '1.1rem',
//           animation: 'slideDown 0.3s ease',
//           boxShadow: '0 4px 30px rgba(0,0,0,0.8)',
//           backdropFilter: 'blur(10px)'
//         }}>
//           {examState.warningMessage}
//           <br />
//           <span style={{ 
//             fontSize: '0.8rem', 
//             opacity: 0.9,
//             display: 'block',
//             marginTop: '4px'
//           }}>
//             ⚠️ Violations: {examState.violationCount}/3
//             {examState.violationCount >= 2 && ' ⚠️ ONE MORE VIOLATION WILL LOCK THE EXAM!'}
//           </span>
//         </div>
//       )}

//       {/* Status Bar */}
//       <div style={{
//         background: 'rgba(20, 27, 38, 0.95)',
//         padding: '10px 24px',
//         display: 'flex',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         borderBottom: '2px solid #2d3a4f',
//         flexShrink: 0,
//         zIndex: 10,
//         backdropFilter: 'blur(10px)'
//       }}>
//         <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
//           <div style={{ 
//             color: '#b6ceff', 
//             fontSize: '0.85rem',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '6px'
//           }}>
//             <span>📹</span>
//             <span style={{ 
//               color: examState.cameraActive ? '#4ade80' : '#dc2626',
//               fontWeight: '600'
//             }}>
//               {examState.cameraActive ? '● ON' : '● OFF'}
//             </span>
//           </div>
//           <div style={{ 
//             color: '#b6ceff', 
//             fontSize: '0.85rem',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '6px'
//           }}>
//             <span>🎤</span>
//             <span style={{ color: '#4ade80', fontWeight: '600' }}>● ON</span>
//           </div>
//           <div style={{ 
//             color: '#b6ceff', 
//             fontSize: '0.85rem',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '6px'
//           }}>
//             <span>⚠️</span>
//             <span style={{ 
//               color: examState.violationCount >= 2 ? '#dc2626' : '#fbbf24',
//               fontWeight: '700'
//             }}>
//               Violations: {examState.violationCount}/3
//             </span>
//           </div>
//         </div>
//         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
//           {!examState.isFullscreen ? (
//             <button
//               onClick={enterFullscreen}
//               style={{
//                 background: 'linear-gradient(135deg, #f7b731, #f59e0b)',
//                 color: '#0a0e14',
//                 border: 'none',
//                 padding: '8px 20px',
//                 borderRadius: '8px',
//                 cursor: 'pointer',
//                 fontWeight: '700',
//                 fontSize: '0.85rem',
//                 transition: 'all 0.3s ease'
//               }}
//               onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
//               onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
//             >
//               ⛶ Enter Fullscreen
//             </button>
//           ) : (
//             <span style={{ 
//               color: '#4ade80', 
//               fontSize: '0.85rem',
//               fontWeight: '600',
//               background: 'rgba(74,222,128,0.1)',
//               padding: '6px 16px',
//               borderRadius: '20px'
//             }}>
//               ✅ Fullscreen
//             </span>
//           )}
//           <span style={{ color: '#5d739b', fontSize: '0.75rem' }}>
//             {new Date().toLocaleTimeString()}
//           </span>
//         </div>
//       </div>

//       {/* Live Video Box */}
//       <div style={{
//         position: 'fixed',
//         bottom: '24px',
//         right: '24px',
//         width: '280px',
//         height: '210px',
//         borderRadius: '16px',
//         overflow: 'hidden',
//         border: '2px solid rgba(45, 58, 79, 0.8)',
//         boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
//         zIndex: 100,
//         background: '#000',
//         transition: 'all 0.3s ease'
//       }}>
//         <video
//           ref={videoRef}
//           autoPlay
//           playsInline
//           muted
//           style={{
//             width: '100%',
//             height: '100%',
//             objectFit: 'cover',
//             display: 'block'
//           }}
//         />
//         {!examState.cameraActive && (
//           <div style={{
//             width: '100%',
//             height: '100%',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             color: '#5d739b',
//             fontSize: '0.9rem',
//             background: '#0a0f18',
//             position: 'absolute',
//             top: 0,
//             left: 0
//           }}>
//             <div style={{ textAlign: 'center' }}>
//               <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📹</div>
//               Camera Off
//             </div>
//           </div>
//         )}
//         {examState.cameraActive && (
//           <>
//             <div style={{
//               position: 'absolute',
//               top: '12px',
//               left: '12px',
//               background: 'rgba(0,0,0,0.8)',
//               color: '#4ade80',
//               padding: '4px 14px',
//               borderRadius: '20px',
//               fontSize: '0.7rem',
//               fontWeight: '700',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '6px'
//             }}>
//               <span style={{
//                 width: '8px',
//                 height: '8px',
//                 background: '#4ade80',
//                 borderRadius: '50%',
//                 display: 'inline-block',
//                 animation: 'blink 1s infinite'
//               }} />
//               LIVE
//             </div>
//             <div style={{
//               position: 'absolute',
//               top: '12px',
//               right: '12px',
//               background: 'rgba(0,0,0,0.8)',
//               color: '#fbbf24',
//               padding: '4px 12px',
//               borderRadius: '20px',
//               fontSize: '0.6rem',
//               fontWeight: '600'
//             }}>
//               {new Date().toLocaleTimeString()}
//             </div>
//             <div style={{
//               position: 'absolute',
//               bottom: '12px',
//               left: '12px',
//               right: '12px',
//               background: 'rgba(0,0,0,0.8)',
//               color: '#b6ceff',
//               padding: '4px 12px',
//               borderRadius: '12px',
//               fontSize: '0.6rem',
//               textAlign: 'center',
//               fontWeight: '600'
//             }}>
//               👤 You
//             </div>
//           </>
//         )}
//       </div>

//       {/* Google Form */}
//       {examState.showForm && !examState.examLocked && (
//         <iframe
//           src={GOOGLE_FORM_URL}
//           style={{
//             flex: 1,
//             width: '100%',
//             border: 'none',
//             background: 'white'
//           }}
//           allow="camera; microphone; fullscreen"
//           allowFullScreen
//           title="Softmax BDE Requirement Test"
//         />
//       )}

//       {/* Fullscreen Warning Overlay */}
//       {!examState.isFullscreen && examState.examStarted && !examState.examLocked && !examState.showWarning && (
//         <div style={{
//           position: 'fixed',
//           bottom: '260px',
//           left: '50%',
//           transform: 'translateX(-50%)',
//           background: 'rgba(247, 183, 49, 0.95)',
//           color: '#0a0e14',
//           padding: '16px 32px',
//           borderRadius: '16px',
//           fontWeight: '700',
//           fontSize: '1rem',
//           zIndex: 999,
//           boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
//           backdropFilter: 'blur(10px)',
//           animation: 'bounce 2s infinite'
//         }}>
//           ⚠️ FULLSCREEN REQUIRED! Click the button above.
//         </div>
//       )}

//       <style jsx>{`
//         @keyframes slideDown {
//           from {
//             transform: translateY(-100%);
//           }
//           to {
//             transform: translateY(0);
//           }
//         }
//         @keyframes blink {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0; }
//         }
//         @keyframes bounce {
//           0%, 100% { transform: translateX(-50%) scale(1); }
//           50% { transform: translateX(-50%) scale(1.05); }
//         }
//         * {
//           margin: 0;
//           padding: 0;
//           box-sizing: border-box;
//         }
//       `}</style>
//     </div>
//   );
// }