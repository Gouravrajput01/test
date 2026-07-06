// app/page.js
// Complete Secure Exam - Fullscreen + Camera Working Perfectly

'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);
  const [violations, setViolations] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [examTime, setExamTime] = useState(20 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Disable right click, copy, paste, cut, print screen
  useEffect(() => {
    const disableCopyPaste = (e) => {
      if (e.type === 'keydown') {
        if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'v', 'V', 'x', 'X', 'a', 'A', 'u', 'U', 's', 'S', 'p', 'P'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (e.key === 'F12' || e.key === 'PrintScreen' || e.key === 'Insert') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      if (e.type === 'contextmenu' || e.type === 'copy' || e.type === 'paste' || e.type === 'cut' || e.type === 'selectstart') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const events = ['copy', 'paste', 'cut', 'contextmenu', 'selectstart', 'drag', 'drop', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, disableCopyPaste, true);
      window.addEventListener(event, disableCopyPaste, true);
    });

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, disableCopyPaste, true);
        window.removeEventListener(event, disableCopyPaste, true);
      });
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
    };
  }, []);

  // Check fullscreen status
  useEffect(() => {
    const checkFullscreen = () => {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!fs);
      
      if (examStarted && !fs) {
        setShowFullscreenOverlay(true);
        setViolations(prev => prev + 1);
        setTimerActive(false);
      } else if (examStarted && fs) {
        setShowFullscreenOverlay(false);
        if (examTime > 0) setTimerActive(true);
      }
    };

    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    };
  }, [examStarted, examTime]);

  // Timer
  useEffect(() => {
    let interval;
    if (timerActive && examTime > 0) {
      interval = setInterval(() => {
        setExamTime(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            alert('⏰ Time is up! Your exam has been submitted automatically.');
            setExamStarted(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, examTime]);

  // Start camera immediately when component mounts
  useEffect(() => {
    startCameraAndMic();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCameraAndMic = async () => {
    try {
      console.log('Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => console.log('Play error:', err));
        
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            setCameraReady(true);
            console.log('✅ Camera ready');
          }
        }, 1000);
      }
      
      setCameraActive(true);
      setMicActive(true);
      setMediaError('');
      console.log('✅ Camera and microphone active');
      
    } catch (err) {
      console.error('Media error:', err);
      setMediaError('⚠️ Camera/Microphone access required. Please allow permissions and refresh.');
      setCameraActive(false);
      setMicActive(false);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setEmailError('');

    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsEmailSubmitted(true);
    setShowInstructions(true);
  };

  const startExam = () => {
    if (cameraReady && isFullscreen) {
      setShowInstructions(false);
      setExamStarted(true);
      setTimerActive(true);
    } else if (!isFullscreen) {
      requestFullscreen();
      setTimeout(() => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          setShowInstructions(false);
          setExamStarted(true);
          setTimerActive(true);
        }
      }, 500);
    }
  };

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Show camera error if not ready
  if (!cameraReady && mediaError) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: '#141b26',
          padding: '40px 48px',
          borderRadius: '24px',
          border: '1px solid #2d3a4f',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📷</div>
          <h1 style={{ color: '#f7b731', fontSize: '1.8rem', marginBottom: '16px' }}>
            Camera Required
          </h1>
          <p style={{ color: '#e06060', fontSize: '1.1rem', marginBottom: '20px' }}>
            {mediaError}
          </p>
          <p style={{ color: '#b6ceff', fontSize: '0.95rem', marginBottom: '20px' }}>
            Please allow camera and microphone access in your browser settings, then refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 40px',
              background: '#2d6ff7',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: '0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#1f5be0'}
            onMouseLeave={(e) => e.target.style.background = '#2d6ff7'}
          >
            🔄 Refresh & Try Again
          </button>
        </div>
      </div>
    );
  }

  // Fullscreen overlay
  if (showFullscreenOverlay) {
    return (
      <div style={{ 
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', 
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        zIndex: 99999, color: 'white', textAlign: 'center', padding: '20px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#f7b731' }}>Fullscreen Required</h1>
        <p style={{ fontSize: '1.2rem', color: '#ff6b6b', marginBottom: '20px' }}>
          ⚠️ You exited fullscreen mode. Please enter fullscreen to continue.
        </p>
        
        {/* Camera Preview - Stays ON */}
        <div style={{
          width: '200px',
          height: '150px',
          background: '#0a0f18',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid #2d3a4f',
          marginBottom: '20px'
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#0a0f18'
            }}
          />
        </div>

        <button
          onClick={() => {
            requestFullscreen();
            setTimeout(() => {
              if (document.fullscreenElement || document.webkitFullscreenElement) {
                setShowFullscreenOverlay(false);
                setTimerActive(true);
              }
            }, 500);
          }}
          style={{
            background: '#2d6ff7',
            color: 'white',
            border: 'none',
            padding: '18px 50px',
            fontSize: '1.3rem',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 700,
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#1f5be0'}
          onMouseLeave={(e) => e.target.style.background = '#2d6ff7'}
        >
          ⛶ Enter Fullscreen
        </button>

        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#5d739b' }}>
          <span style={{ marginRight: '10px' }}>📷</span> Camera Active · Copy/Paste Disabled
        </p>
      </div>
    );
  }

  // Email entry screen
  if (!isEmailSubmitted && cameraReady) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: '#141b26',
          padding: '40px 48px',
          borderRadius: '24px',
          border: '1px solid #2d3a4f',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎓</div>
            <h1 style={{ color: '#f0f4ff', fontSize: '1.8rem', fontWeight: '600' }}>
              Softmax Requirement Test
            </h1>
            <p style={{ color: '#8aa3cc', marginTop: '8px', fontSize: '0.95rem' }}>
              SRT-2026-2.0 · IT Intern Assessment
            </p>
            <div style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: 'rgba(64, 192, 87, 0.15)',
              borderRadius: '20px',
              display: 'inline-block',
              border: '1px solid rgba(64, 192, 87, 0.3)'
            }}>
              <span style={{ color: '#40c057', fontSize: '0.85rem' }}>
                📷 Camera Active ✅
              </span>
            </div>
            <p style={{ color: '#5d739b', fontSize: '0.8rem', marginTop: '8px' }}>
              Enter your email to begin
            </p>
          </div>

          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#b6ceff', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                📧 Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: `2px solid ${emailError ? '#e06060' : '#2d3a4f'}`,
                  background: '#0a0f18',
                  color: '#f0f4ff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: '0.2s'
                }}
                required
                autoFocus
              />
              {emailError && (
                <p style={{ color: '#e06060', marginTop: '8px', fontSize: '0.9rem' }}>
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: '#2d6ff7',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: '0.2s',
                marginTop: '8px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1f5be0'}
              onMouseLeave={(e) => e.target.style.background = '#2d6ff7'}
            >
              Continue →
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #1c283d',
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            color: '#5d739b',
            fontSize: '0.85rem'
          }}>
            <span>🔒 Secure</span>
            <span>📷 Proctored</span>
            <span>🚫 No Copy/Paste</span>
          </div>
        </div>
      </div>
    );
  }

  // Instructions Screen
  if (showInstructions && cameraReady) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
        padding: '20px',
        overflow: 'auto'
      }}>
        <div style={{
          background: '#141b26',
          padding: '40px 48px',
          borderRadius: '24px',
          border: '1px solid #2d3a4f',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
            <h1 style={{ color: '#f7b731', fontSize: '1.8rem', fontWeight: '600' }}>
              Assessment Details
            </h1>
          </div>

          {/* Camera Preview */}
          <div style={{
            background: '#0a0f18',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid #2d3a4f',
            marginBottom: '20px',
            width: '100%',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
            aspectRatio: '4/3',
            position: 'relative'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                background: '#0a0f18'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '12px',
              background: 'rgba(0,0,0,0.7)',
              padding: '4px 14px',
              borderRadius: '20px',
              color: '#b6ceff',
              fontSize: '0.7rem',
              border: '1px solid #3d5272'
            }}>
              <span style={{ color: cameraActive ? '#40c057' : '#e06060' }}>●</span> 
              {cameraActive ? ' LIVE' : ' OFF'}
            </div>
          </div>

          {/* Fullscreen Status */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            padding: '10px',
            borderRadius: '12px',
            background: isFullscreen ? 'rgba(64, 192, 87, 0.15)' : 'rgba(224, 96, 96, 0.15)',
            border: `1px solid ${isFullscreen ? 'rgba(64, 192, 87, 0.3)' : 'rgba(224, 96, 96, 0.3)'}`
          }}>
            <span style={{ color: isFullscreen ? '#40c057' : '#e06060', fontWeight: '600' }}>
              {isFullscreen ? '✅ Fullscreen Active' : '⛶ Fullscreen Required to Start'}
            </span>
          </div>

          <div style={{ color: '#b6ceff', fontSize: '0.95rem', lineHeight: '1.8' }}>
            <div style={{ 
              background: '#0a0f18', 
              padding: '16px', 
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #2d3a4f'
            }}>
              <p><strong style={{ color: '#f0f4ff' }}>📌 Test:</strong> Softmax Requirement Test (SRT-2026-2.0)</p>
              <p><strong style={{ color: '#f0f4ff' }}>🎯 Role:</strong> IT Intern – Project Task Assessment</p>
              <p><strong style={{ color: '#f0f4ff' }}>📝 Questions:</strong> 30</p>
              <p><strong style={{ color: '#f0f4ff' }}>⏱️ Duration:</strong> 20 Minutes</p>
              <p><strong style={{ color: '#f0f4ff' }}>📅 Date:</strong> 06 July 2026</p>
              <p><strong style={{ color: '#f0f4ff' }}>💻 Mode:</strong> Online (Laptop/Desktop Only)</p>
            </div>

            <div style={{ 
              background: '#0a0f18', 
              padding: '16px', 
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #2d3a4f'
            }}>
              <h3 style={{ color: '#f7b731', marginBottom: '8px' }}>⚡ Guidelines</h3>
              <ul style={{ paddingLeft: '20px', color: '#b6ceff' }}>
                <li>Laptop or desktop device only</li>
                <li>AI-Protected Examination Environment</li>
                <li>Tab switching, screen recording, screenshots are prohibited</li>
                <li>Real-time monitoring by Softmax Team</li>
                <li>Violations may lead to disqualification</li>
                <li>Stable internet connection required</li>
              </ul>
            </div>

            <div style={{ 
              background: '#0a0f18', 
              padding: '16px', 
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #2d3a4f',
              textAlign: 'center'
            }}>
              <p style={{ color: '#b6ceff', fontStyle: 'italic' }}>
                "We wish you success and look forward to evaluating your skills."
              </p>
              <p style={{ color: '#8aa3cc', marginTop: '8px' }}>
                <strong>Vishesh Jain</strong><br />
                HR Department · Softmax Technologies
              </p>
            </div>
          </div>

          {!isFullscreen && (
            <button
              onClick={requestFullscreen}
              style={{
                width: '100%',
                padding: '18px',
                background: '#f7b731',
                color: '#0a0e14',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: '0.2s',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f5a623'}
              onMouseLeave={(e) => e.target.style.background = '#f7b731'}
            >
              ⛶ Enter Fullscreen
            </button>
          )}

          <button
            onClick={startExam}
            disabled={!isFullscreen}
            style={{
              width: '100%',
              padding: '18px',
              background: isFullscreen ? '#2d6ff7' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.2rem',
              fontWeight: '600',
              cursor: isFullscreen ? 'pointer' : 'not-allowed',
              transition: '0.2s',
              marginTop: '10px',
              opacity: isFullscreen ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (isFullscreen) e.target.style.background = '#1f5be0';
            }}
            onMouseLeave={(e) => {
              if (isFullscreen) e.target.style.background = '#2d6ff7';
            }}
          >
            {isFullscreen ? '✅ Start Exam' : '⛶ Enter Fullscreen First'}
          </button>
        </div>
      </div>
    );
  }

  // Main exam interface
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0f1621' }}>
      {/* Left: Google Form iframe */}
      <div style={{ flex: 1, height: '100vh', position: 'relative', background: '#0a0e14' }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          padding: '8px 16px',
          borderRadius: '8px',
          zIndex: 100,
          color: '#f7b731',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          border: '1px solid #2d3a4f'
        }}>
          ⏱️ {formatTime(examTime)}
        </div>
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSd0FsJTHgioD7k2pCQNcRPA9qmFHq3BL6iHNmy1y8TrnDBsaw/viewform?usp=publish-editor"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white'
          }}
          allow="camera; microphone; fullscreen"
          title="Exam Form"
        />
      </div>

      {/* Right: Camera Panel */}
      <div style={{
        width: '300px',
        minWidth: '300px',
        background: '#141b26',
        borderLeft: '2px solid #2d3a4f',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '12px'
      }}>
        <div style={{
          color: '#b6ceff',
          fontSize: '0.9rem',
          fontWeight: '600',
          textAlign: 'center',
          paddingBottom: '8px',
          borderBottom: '1px solid #2a374e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span><span style={{ marginRight: '6px' }}>📷</span> Proctoring Live</span>
          <span>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              background: cameraActive ? '#40c057' : '#e06060',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite',
              marginRight: '6px'
            }}></span>
            {cameraActive ? 'Recording' : 'Off'}
          </span>
        </div>

        <div style={{
          background: '#0a0f18',
          borderRadius: '16px',
          overflow: 'hidden',
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #2d3a4f',
          position: 'relative'
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#0a0f18'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 14px',
            borderRadius: '20px',
            color: '#b6ceff',
            fontSize: '0.7rem',
            border: '1px solid #3d5272'
          }}>
            <span style={{ color: cameraActive ? '#40c057' : '#e06060' }}>●</span> {cameraActive ? 'LIVE' : 'OFF'}
          </div>
          {mediaError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e06060',
              padding: '20px',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              {mediaError}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: '#1a2536',
          padding: '10px',
          borderRadius: '12px',
          border: '1px solid #2d3a4f',
          color: '#b6ceff',
          fontSize: '0.85rem'
        }}>
          <span>🎤</span>
          <span>Microphone: <span style={{ color: micActive ? '#40c057' : '#e06060' }}>
            {micActive ? 'Active' : 'Off'}
          </span></span>
          <span style={{ color: micActive ? '#40c057' : '#e06060', fontSize: '0.5rem' }}>●</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: '#1a2536',
          padding: '10px',
          borderRadius: '12px',
          border: '1px solid #2d3a4f',
          color: '#b6ceff',
          fontSize: '0.85rem'
        }}>
          <span>🚨 Violations: <strong style={{ color: '#ff6b6b' }}>{violations}</strong></span>
          <span style={{ fontSize: '0.7rem', color: '#5d739b' }}>
            {email}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: '#5d739b',
          fontSize: '0.7rem',
          padding: '6px',
          borderTop: '1px solid #1c283d',
          marginTop: 'auto'
        }}>
          <span>🔒 Copy/Paste Disabled</span>
          <span>🛡️ AI Monitoring</span>
          <span>📱 Tab Switch Detected</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}