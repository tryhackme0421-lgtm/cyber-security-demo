(() => {
  const form = document.getElementById('participation-form');
  const roleInputs = Array.from(document.querySelectorAll('input[name="role"]'));
  const studentFields = document.getElementById('student-fields');

  const videoEl = document.getElementById('video');
  const captureCanvas = document.getElementById('captureCanvas');

  const warningModal = document.getElementById('warningModal');
  const photoModal = document.getElementById('photoModal');
  const continueToPhotoBtn = document.getElementById('continueToPhoto');
  const closePhotoModalBtn = document.getElementById('closePhotoModal');
  const closePhotoBtnBtn = document.getElementById('closePhotoBtn');
  const capturedPhoto = document.getElementById('capturedPhoto');
  const downloadPhotoBtn = document.getElementById('downloadPhoto');

  let mediaStream = null;
  let capturedImageData = null;
  let alertAudio = null;
  let sirenAudio = null;
  let continuousSiren = null;
  let audioContext = null;

  // Create mixed dangerous sounds - police siren + alert beeps
  const createMixedDangerousSounds = () => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create intense police siren
      const createIntenseSiren = () => {
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        const gain2 = audioContext.createGain();
        const masterGain = audioContext.createGain();
        const distortion = audioContext.createWaveShaper();
        
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(distortion);
        gain2.connect(distortion);
        distortion.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        const makeDistortionCurve = (amount) => {
          const samples = 44100;
          const curve = new Float32Array(samples);
          for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x));
          }
          return curve;
        };
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
        
        const currentTime = audioContext.currentTime;
        
        osc1.frequency.setValueAtTime(300, currentTime);
        osc1.frequency.linearRampToValueAtTime(800, currentTime + 0.8);
        osc1.frequency.linearRampToValueAtTime(300, currentTime + 1.6);
        osc1.type = 'sawtooth';
        
        osc2.frequency.setValueAtTime(600, currentTime);
        osc2.frequency.linearRampToValueAtTime(1400, currentTime + 0.8);
        osc2.frequency.linearRampToValueAtTime(600, currentTime + 1.6);
        osc2.type = 'square';
        
        gain1.gain.setValueAtTime(0, currentTime);
        gain1.gain.linearRampToValueAtTime(0.2, currentTime + 0.05);
        gain1.gain.setValueAtTime(0.2, currentTime + 1.55);
        gain1.gain.linearRampToValueAtTime(0, currentTime + 1.6);
        
        gain2.gain.setValueAtTime(0, currentTime);
        gain2.gain.linearRampToValueAtTime(0.15, currentTime + 0.05);
        gain2.gain.setValueAtTime(0.15, currentTime + 1.55);
        gain2.gain.linearRampToValueAtTime(0, currentTime + 1.6);
        
        masterGain.gain.setValueAtTime(0.5, currentTime);
        masterGain.gain.linearRampToValueAtTime(0.7, currentTime + 0.4);
        masterGain.gain.linearRampToValueAtTime(0.5, currentTime + 0.8);
        masterGain.gain.linearRampToValueAtTime(0.7, currentTime + 1.2);
        masterGain.gain.linearRampToValueAtTime(0.5, currentTime + 1.6);
        
        osc1.start(currentTime);
        osc2.start(currentTime);
        osc1.stop(currentTime + 1.6);
        osc2.stop(currentTime + 1.6);
      };
      
      // Create rapid alert beeps
      const createAlertBeeps = () => {
        const frequencies = [1000, 1200, 800, 1400, 900, 1100, 750, 1300];
        let beepCount = 0;
        
        const createBeep = () => {
          if (continuousSiren && beepCount < 6) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequencies[beepCount % 8], audioContext.currentTime);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.12);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.12);
            
            beepCount++;
            setTimeout(createBeep, 250);
          }
        };
        
        createBeep();
      };
      
      // Create warning siren
      const createWarningSiren = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();
        
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(900, audioContext.currentTime + 0.5);
        oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 1);
        
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1500, audioContext.currentTime);
        filterNode.Q.setValueAtTime(2, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime + 0.9);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
        
        oscillator.type = 'triangle';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
      };
      
      // Start mixed sound loop
      const startMixedSoundLoop = () => {
        if (continuousSiren) {
          // Start police siren
          createIntenseSiren();
          
          // Start alert beeps after 200ms
          setTimeout(() => {
            if (continuousSiren) createAlertBeeps();
          }, 200);
          
          // Start warning siren after 600ms
          setTimeout(() => {
            if (continuousSiren) createWarningSiren();
          }, 600);
          
          // Schedule next mixed cycle
          continuousSiren = setTimeout(startMixedSoundLoop, 1800);
        }
      };
      
      continuousSiren = true;
      startMixedSoundLoop();
      
    } catch (error) {
      console.log('Mixed dangerous sounds failed:', error);
    }
  };

  // Stop the continuous dangerous siren
  const stopContinuousSiren = () => {
    if (continuousSiren) {
      clearTimeout(continuousSiren);
      continuousSiren = null;
    }
    if (audioContext) {
      try {
        audioContext.close();
        audioContext = null;
      } catch (error) {
        console.log('Audio context close failed:', error);
      }
    }
  };

  // Conditional fields
  const setStudentVisibility = () => {
    const role = roleInputs.find(r => r.checked)?.value;
    if (role === 'student') {
      studentFields.classList.remove('hidden');
      studentFields.querySelectorAll('input').forEach(i => i.required = true);
    } else {
      studentFields.classList.add('hidden');
      studentFields.querySelectorAll('input').forEach(i => {
        i.required = false; i.value = '';
      });
    }
  };
  roleInputs.forEach(r => r.addEventListener('change', setStudentVisibility));

  // Camera handling
  const stopStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  };

  // Direct camera access for educational demonstration
  const requestCamera = async () => {
    try {
      stopStream();
      
      // Request camera access immediately for educational demo
      const constraints = {
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }, 
        audio: false 
      };
      
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = mediaStream;
      
      // Wait for video to be ready
      return new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play();
          resolve(true);
        };
        // Fallback timeout
        setTimeout(() => resolve(true), 1000);
      });
      
    } catch (err) {
      console.error('Camera access failed:', err);
      return false;
    }
  };

  // Generate multiple dangerous fake AI manipulations
  const generateFakeAIManipulation = () => {
    try {
      // Create canvas for AI manipulation simulation
      const manipulationCanvas = document.createElement('canvas');
      const ctx = manipulationCanvas.getContext('2d');
      
      // Create image from captured data
      const img = new Image();
      img.onload = () => {
        // Set canvas size
        manipulationCanvas.width = img.width + 100; // Extra space for criminal poster
        manipulationCanvas.height = img.height + 150;
        
        // Choose random manipulation type
        const manipulationType = Math.floor(Math.random() * 3);
        
        switch(manipulationType) {
          case 0:
            createCriminalPoster(ctx, img, manipulationCanvas.width, manipulationCanvas.height);
            break;
          case 1:
            createWantedPoster(ctx, img, manipulationCanvas.width, manipulationCanvas.height);
            break;
          case 2:
            createFraudAlert(ctx, img, manipulationCanvas.width, manipulationCanvas.height);
            break;
        }
        
        // Store manipulated image
        window.manipulatedImageData = manipulationCanvas.toDataURL('image/jpeg', 0.8);
        
        console.log('🤖 DANGEROUS AI MANIPULATION GENERATED!');
      };
      img.src = capturedImageData;
      
    } catch (error) {
      console.error('AI manipulation generation failed:', error);
    }
  };
  
  // Generate fake selfie video using captured image
  const generateFakeSelfieVideo = () => {
    console.log('Starting video generation...');
    try {
      // Create video canvas
      const videoCanvas = document.createElement('canvas');
      const ctx = videoCanvas.getContext('2d');
      videoCanvas.width = 640;
      videoCanvas.height = 480;
      
      // Update status immediately
      const videoStatus = document.getElementById('videoStatus');
      if (videoStatus) {
        videoStatus.innerHTML = '<span style="color: #ffaa00;">🎥 Starting video generation...</span>';
      }
      
      // Check MediaRecorder support
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        console.log('WebM not supported, trying MP4...');
        if (!MediaRecorder.isTypeSupported('video/mp4')) {
          console.log('No video recording support, showing fallback');
          if (videoStatus) {
            videoStatus.innerHTML = '<span style="color: #ffaa00;">🎥 Video simulation (browser compatibility mode)</span>';
          }
          
          // Show fallback instead
          const fallback = document.getElementById('videoFallback');
          if (fallback) {
            fallback.style.display = 'block';
          }
          return;
        }
      }
      
      // Create MediaRecorder for video generation
      const stream = videoCanvas.captureStream(15); // Reduced to 15 FPS for compatibility
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/mp4';
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('Data chunk added:', event.data.size);
        }
      };
      
      recorder.onstop = () => {
        console.log('Recording stopped, creating blob...');
        const blob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        window.generatedVideoUrl = videoUrl;
        
        console.log('Video generated:', videoUrl);
        
        // Update video player immediately
        const videoElement = document.getElementById('generatedVideo');
        const videoStatus = document.getElementById('videoStatus');
        
        if (videoElement && videoStatus) {
          videoElement.src = videoUrl;
          videoElement.style.display = 'block';
          videoElement.load(); // Force reload
          videoStatus.innerHTML = '<span style="color: #00ff00;">✅ Dangerous deepfake video ready! Click play to see how you could be framed</span>';
          
          // Auto-play after a short delay
          setTimeout(() => {
            videoElement.play().catch(e => {
              console.log('Autoplay blocked:', e);
              videoStatus.innerHTML += '<br><span style="color: #00ff00;">👆 Click the play button above to watch</span>';
            });
          }, 500);
        }
        
        console.log('🎥 FAKE SELFIE VIDEO GENERATED!');
      };
      
      recorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        if (videoStatus) {
          videoStatus.innerHTML = '<span style="color: #ff0000;">❌ Video generation failed</span>';
        }
      };
      
      // Load captured image
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded, starting animation...');
        let frame = 0;
        const totalFrames = 15 * 15; // 15 seconds at 15fps for faster generation
        
        // Start recording
        recorder.start();
        
        if (videoStatus) {
          videoStatus.innerHTML = '<span style="color: #ffaa00;">🎬 Recording deepfake video... ' + Math.round((frame/totalFrames)*100) + '%</span>';
        }
        
        // Animation function
        const animate = () => {
          if (frame >= totalFrames) {
            console.log('Animation complete, stopping recorder...');
            recorder.stop();
            return;
          }
          
          // Update progress
          if (frame % 30 === 0 && videoStatus) { // Update every 2 seconds
            const progress = Math.round((frame/totalFrames)*100);
            videoStatus.innerHTML = '<span style="color: #ffaa00;">🎬 Recording deepfake video... ' + progress + '%</span>';
          }
          
          // Clear canvas
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
          
          // Create selfie simulation
          createSelfieFrame(ctx, img, frame, totalFrames);
          
          frame++;
          setTimeout(animate, 1000/15); // 15 FPS
        };
        
        animate();
      };
      
      img.onerror = () => {
        console.error('Failed to load captured image');
        if (videoStatus) {
          videoStatus.innerHTML = '<span style="color: #ff0000;">❌ Failed to load photo for video</span>';
        }
      };
      
      img.src = capturedImageData;
      
    } catch (error) {
      console.error('Video generation failed:', error);
      const videoStatus = document.getElementById('videoStatus');
      if (videoStatus) {
        videoStatus.innerHTML = '<span style="color: #ff0000;">❌ Video generation error: ' + error.message + '</span>';
      }
    }
  };
  
  // Create individual frame for selfie video
  const createSelfieFrame = (ctx, userImage, frame, totalFrames) => {
    const progress = frame / totalFrames;
    
    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 640, 480);
    
    // Simulate phone interface
    ctx.fillStyle = '#000';
    ctx.fillRect(50, 50, 540, 380);
    
    // Phone camera viewfinder
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, 500, 340);
    
    // Simulate person taking selfie (animated stick figure)
    const centerX = 320;
    const centerY = 240;
    
    // Animate stick figure
    const armAngle = Math.sin(progress * Math.PI * 4) * 0.2; // Slight movement
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    
    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50, 30, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 80);
    ctx.stroke();
    
    // Arms (one holding phone)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - 40 + Math.sin(armAngle) * 5, centerY - 30);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + 60, centerY - 40 + Math.sin(armAngle) * 3);
    ctx.stroke();
    
    // Phone in hand
    ctx.fillStyle = '#333';
    ctx.fillRect(centerX + 55, centerY - 50 + Math.sin(armAngle) * 3, 20, 35);
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 80);
    ctx.lineTo(centerX - 30, centerY + 140);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 80);
    ctx.lineTo(centerX + 30, centerY + 140);
    ctx.stroke();
    
    // Show countdown in last 3 seconds
    if (progress > 0.9) {
      const countdown = Math.ceil((1 - progress) * 10);
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(countdown.toString(), centerX, 100);
    }
    
    // At the very end, show the captured image
    if (progress > 0.95) {
      const imageSize = (progress - 0.95) * 20 * 200; // Scale up
      const imageX = centerX - imageSize / 2;
      const imageY = centerY - imageSize / 2;
      
      ctx.drawImage(userImage, imageX, imageY, imageSize, imageSize);
      
      // Flash effect
      if (progress > 0.98) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, 640, 480);
      }
    }
    
    // Add "LIVE" indicator
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🔴 LIVE', 80, 90);
    
    // Add timestamp
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    const time = new Date().toLocaleTimeString();
    ctx.fillText(time, 80, 420);
  };
  
  // Create criminal poster manipulation
  const createCriminalPoster = (ctx, userImage, width, height) => {
    // Red background
    ctx.fillStyle = '#990000';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CRIMINAL RECORD', width/2, 40);
    
    // Draw user image with criminal effects
    const imageY = 60;
    const imageSize = Math.min(userImage.width, userImage.height);
    ctx.drawImage(userImage, (width - imageSize)/2, imageY, imageSize, imageSize);
    
    // Add criminal ID number
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('ID: CR-' + Math.floor(Math.random() * 999999), width/2, imageY + imageSize + 30);
    
    // Add charges
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    const charges = ['FRAUD', 'IDENTITY THEFT', 'CYBERCRIME', 'SCAM'];
    const selectedCharge = charges[Math.floor(Math.random() * charges.length)];
    ctx.fillText('CHARGE: ' + selectedCharge, width/2, imageY + imageSize + 60);
    
    // Add danger warning
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('⚠️ DANGEROUS - DO NOT APPROACH ⚠️', width/2, imageY + imageSize + 90);
    
    // Add fake AI watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('AI GENERATED EVIDENCE', width - 10, height - 10);
  };
  
  // Create wanted poster manipulation
  const createWantedPoster = (ctx, userImage, width, height) => {
    // Wanted poster background
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, width-10, height-10);
    
    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WANTED', width/2, 45);
    
    // Draw user image
    const imageY = 60;
    const imageSize = Math.min(userImage.width, userImage.height);
    ctx.drawImage(userImage, (width - imageSize)/2, imageY, imageSize, imageSize);
    
    // Add reward
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('REWARD: $10,000', width/2, imageY + imageSize + 35);
    
    // Add crime
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('FOR CYBER TERRORISM', width/2, imageY + imageSize + 60);
    ctx.fillText('ARMED AND DANGEROUS', width/2, imageY + imageSize + 80);
    
    // Add contact info
    ctx.font = '14px Arial';
    ctx.fillText('Contact FBI: 1-800-FAKE-TIP', width/2, imageY + imageSize + 110);
    
    // AI Generated stamp
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('AI FABRICATED', 10, height - 15);
  };
  
  // Create fraud alert manipulation
  const createFraudAlert = (ctx, userImage, width, height) => {
    // Alert background
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(0, 0, width, height);
    
    // Warning stripes
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < width; i += 40) {
      ctx.fillRect(i, 0, 20, height);
    }
    
    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ FRAUD ALERT ⚠️', width/2, 40);
    
    // Draw user image with warning overlay
    const imageY = 60;
    const imageSize = Math.min(userImage.width, userImage.height);
    ctx.drawImage(userImage, (width - imageSize)/2, imageY, imageSize, imageSize);
    
    // Add warning overlay on image
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect((width - imageSize)/2, imageY, imageSize, imageSize);
    
    // Add fraud details
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('IDENTITY THIEF', width/2, imageY + imageSize + 30);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText('STOLEN: $50,000+', width/2, imageY + imageSize + 55);
    ctx.fillText('VICTIMS: 100+', width/2, imageY + imageSize + 75);
    
    // Warning message
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('DO NOT TRUST THIS PERSON', width/2, imageY + imageSize + 100);
    
    // AI stamp
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('DEEPFAKE ALERT', width - 10, height - 10);
  };
  const addDeepfakeEffects = (ctx, width, height) => {
    // Add glitch effect
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Create digital glitch patterns
    for (let i = 0; i < data.length; i += 4) {
      // Random digital noise
      if (Math.random() < 0.02) {
        data[i] = Math.random() * 255;     // Red
        data[i + 1] = Math.random() * 255; // Green
        data[i + 2] = Math.random() * 255; // Blue
      }
      
      // Color shift for AI manipulation look
      if (Math.random() < 0.1) {
        data[i] = Math.min(255, data[i] * 1.2);     // Boost red
        data[i + 2] = Math.min(255, data[i + 2] * 0.8); // Reduce blue
      }
    }
    
    // Apply manipulated image data
    ctx.putImageData(imageData, 0, 0);
    
    // Add "DEEPFAKE" watermark
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('DEEPFAKE', 10, 30);
    
    // Add "AI GENERATED" stamp
    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('AI GENERATED', width - 150, height - 10);
    
    // Add scan lines for digital effect
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Add red border
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);
  };
  const captureFrame = () => {
    if (!videoEl || !mediaStream) {
      console.log('No video element or stream available');
      return null;
    }
    
    // Ensure video is playing and has dimensions
    if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      console.log('Video not ready, using default dimensions');
      captureCanvas.width = 640;
      captureCanvas.height = 480;
    } else {
      captureCanvas.width = videoEl.videoWidth;
      captureCanvas.height = videoEl.videoHeight;
    }
    
    const ctx = captureCanvas.getContext('2d');
    
    try {
      ctx.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.8);
      console.log('Photo captured successfully');
      return dataUrl;
    } catch (err) {
      console.error('Failed to capture frame:', err);
      return null;
    }
  };

  // Modal helpers with only dangerous police siren
  const openWarningModal = async () => {
    warningModal.classList.remove('hidden');
    
    // Start very dangerous mixed sounds (police siren + beeps)
    createMixedDangerousSounds();
    
    // NO camera access here - only when user clicks button
  };
  
  const closeWarningModal = () => {
    warningModal.classList.add('hidden');
    // Stop siren if modal is closed
    stopContinuousSiren();
  };
  
  const openPhotoModal = () => {
    photoModal.classList.remove('hidden');
  };
  
  const closePhotoModal = () => {
    photoModal.classList.add('hidden');
    stopStream(); // Stop camera when closing
  };

  // Event listeners for modals with camera access on button click
  continueToPhotoBtn.addEventListener('click', async () => {
    // STOP the continuous police siren when button is clicked
    stopContinuousSiren();
    
    // Show loading state
    continueToPhotoBtn.textContent = 'Initiating Attack...';
    continueToPhotoBtn.disabled = true;
    
    // NOW trigger camera access when user clicks
    try {
      console.log('🎥 USER CLICKED - INITIATING STEALTH CAPTURE...');
      const cameraSuccess = await requestCamera();
      
      if (cameraSuccess) {
        // Wait for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Capture photo
        capturedImageData = captureFrame();
        console.log('📸 PHOTO CAPTURED!');
        
        // Auto-generate fake AI manipulation and video
        if (capturedImageData) {
          generateFakeAIManipulation();
          
          // Add delay before video generation to ensure image is ready
          setTimeout(() => {
            generateFakeSelfieVideo();
          }, 1000);
        }
        
        // Stop camera
        stopStream();
        
        // Show captured photo
        if (capturedImageData) {
          capturedPhoto.src = capturedImageData;
        }
      } else {
        // Even if camera fails, show educational content
        console.log('Camera access denied, showing demo content');
      }
    } catch (error) {
      console.error('Camera capture failed:', error);
    }
    
    // Close warning modal and open photo modal
    closeWarningModal();
    
    // Set both original and manipulated images
    if (capturedImageData) {
      document.getElementById('capturedPhoto').src = capturedImageData;
    }
    
    // Wait for AI manipulation and video, then show them
    setTimeout(() => {
      if (window.manipulatedImageData) {
        document.getElementById('manipulatedPhoto').src = window.manipulatedImageData;
      }
      
      // Check for generated video
      if (window.generatedVideoUrl) {
        const videoElement = document.getElementById('generatedVideo');
        const videoStatus = document.getElementById('videoStatus');
        
        if (videoElement && videoStatus) {
          videoElement.src = window.generatedVideoUrl;
          videoElement.style.display = 'block';
          videoStatus.innerHTML = '<span style="color: #00ff00;">✅ Dangerous deepfake video ready! Click play to see how you could be framed</span>';
        }
      } else {
        // Video still generating
        const videoStatus = document.getElementById('videoStatus');
        if (videoStatus) {
          videoStatus.innerHTML = '<span style="color: #ffaa00;">🎥 Still generating deepfake video... Almost ready!</span>';
        }
      }
    }, 2000); // Wait longer for video generation
    
    openPhotoModal();
  });

  closePhotoModalBtn.addEventListener('click', closePhotoModal);
  closePhotoBtnBtn.addEventListener('click', closePhotoModal);
  
  photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal) closePhotoModal();
  });

  // Download photo
  downloadPhotoBtn.addEventListener('click', () => {
    if (capturedImageData) {
      const link = document.createElement('a');
      link.download = 'captured-photo.jpg';
      link.href = capturedImageData;
      link.click();
    }
  });

  // Form submit - show scary alert first, then capture
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate basic required fields
    if (!form.reportValidity()) {
      alert('Please fill in all required fields.');
      return;
    }

    // Show innocent loading message
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    // Simulate form processing delay
    setTimeout(() => {
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      
      // Show scary warning modal first
      openWarningModal();
    }, 1000);
  });

  // Cleanup on page hide
  window.addEventListener('beforeunload', () => {
    stopStream();
    stopContinuousSiren();
  });
})();


