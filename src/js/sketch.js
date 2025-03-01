// Global variables
let faceTracker;
let particleSystem;
let canvas;
let isDebugMode = false; // Set to true to see face landmarks
let isFaceTrackingAvailable = true; // Flag to track if face tracking is available

// Make functions available globally
window.setupSketch = setupSketch;
window.resetSketch = resetSketch;

// P5.js setup function
function setup() {
    // Create the canvas and place it in the experience section
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('experience');
    
    // Hide canvas initially (will be shown when starting the experience)
    canvas.style('display', 'none');
    
    // Set drawing styles
    colorMode(RGB, 255);
    ellipseMode(CENTER);
    
    // Initialize objects
    particleSystem = new ParticleSystem(600);
    faceTracker = new FaceTracker();
    
    // Create debug toggle for testing
    createDebugToggle();

    // Log ml5 version for debugging
    console.log("ml5 version:", ml5.version || "unknown");
    
    // Check if required ml5 features are available
    checkMl5Features();
}

// Check if required ml5 features are available
function checkMl5Features() {
    if (!ml5) {
        console.error("ml5.js is not loaded correctly");
        isFaceTrackingAvailable = false;
        emitFaceTrackingError("ml5.js is not loaded correctly");
        return;
    }
    
    console.log("Available ml5 functions:", Object.keys(ml5));
    
    // Check for face tracking functionality
    if (!ml5.facemesh && !ml5.FaceMesh && !ml5.face && !ml5.faceApi) {
        console.warn("Face tracking functionality not found in ml5.js");
        console.log("Will run in fallback mode without face tracking");
        isFaceTrackingAvailable = false;
        emitFaceTrackingError("Face tracking functionality not found in ml5.js", true);
    }
}

// Emit a custom event for face tracking errors
function emitFaceTrackingError(message, fallbackActive = false) {
    const event = new CustomEvent('faceTrackingError', {
        detail: {
            message: message,
            fallbackActive: fallbackActive,
            timestamp: new Date().toISOString()
        }
    });
    window.dispatchEvent(event);
}

// P5.js draw loop
function draw() {
    // Clear the background
    background(10, 10, 10, 20); // Low alpha for trail effect
    
    if (isFaceTrackingAvailable) {
        // Only proceed if the face tracker is ready
        if (faceTracker && faceTracker.isTrackerReady()) {
            // Get facial landmarks for particle attraction
            const keypoints = faceTracker.getKeypoints();
            
            // Update particle system with face landmarks
            particleSystem.setAttractors(keypoints);
            particleSystem.update();
            particleSystem.display();
            
            // Debug mode: show video and facial landmarks
            if (isDebugMode) {
                push();
                // Draw mirrored video in corner
                translate(width, 0);
                scale(-1, 1);
                const vw = 160;
                const vh = vw * (faceTracker.getVideo().height / faceTracker.getVideo().width);
                image(faceTracker.getVideo(), 0, 0, vw, vh);
                
                // Draw landmarks
                const landmarks = faceTracker.getLandmarks();
                if (landmarks.length > 0) {
                    // Scale landmarks to fit the debug view
                    const scaleX = vw / faceTracker.getVideo().width;
                    const scaleY = vh / faceTracker.getVideo().height;
                    
                    fill(0, 255, 0);
                    noStroke();
                    for (let i = 0; i < landmarks.length; i++) {
                        const [x, y] = landmarks[i];
                        ellipse(x * scaleX, y * scaleY, 2, 2);
                    }
                }
                pop();
                
                // Draw keypoints used for attraction
                push();
                stroke(255, 0, 0);
                strokeWeight(4);
                noFill();
                for (let point of keypoints) {
                    point(point.x, point.y);
                }
                pop();
            }
        }
    } else {
        // Fallback mode: just show particles with random movement
        runFallbackMode();
    }
}

// Fallback mode when face tracking is not available
function runFallbackMode() {
    // Create some circular attractors in a face-like pattern if no attractors exist
    if (!particleSystem.attractors || particleSystem.attractors.length === 0) {
        const centerX = width / 2;
        const centerY = height / 2;
        const faceSize = min(width, height) * 0.3;
        
        // Create attractors in a face pattern (eyes, nose, mouth)
        const attractors = [];
        
        // Left eye
        attractors.push(createVector(centerX - faceSize * 0.2, centerY - faceSize * 0.2));
        
        // Right eye
        attractors.push(createVector(centerX + faceSize * 0.2, centerY - faceSize * 0.2));
        
        // Nose
        attractors.push(createVector(centerX, centerY));
        
        // Mouth
        attractors.push(createVector(centerX - faceSize * 0.15, centerY + faceSize * 0.2));
        attractors.push(createVector(centerX + faceSize * 0.15, centerY + faceSize * 0.2));
        
        // Face outline
        for (let angle = 0; angle < TWO_PI; angle += PI / 8) {
            const x = centerX + cos(angle) * faceSize * 0.5;
            const y = centerY + sin(angle) * faceSize * 0.5;
            attractors.push(createVector(x, y));
        }
        
        particleSystem.setAttractors(attractors);
    }
    
    // Update and display particles
    particleSystem.update();
    particleSystem.display();
    
    // Slowly move attractors for animation
    if (particleSystem.attractors && particleSystem.attractors.length > 0) {
        for (let attractor of particleSystem.attractors) {
            attractor.x += random(-1, 1);
            attractor.y += random(-1, 1);
        }
    }
}

// Create a debug toggle button (only visible in development)
function createDebugToggle() {
    // Only add in development (comment out in production)
    const debugButton = createButton('Debug Mode');
    debugButton.position(10, 10);
    debugButton.mousePressed(() => {
        isDebugMode = !isDebugMode;
        debugButton.html(isDebugMode ? 'Hide Debug' : 'Debug Mode');
    });
    debugButton.parent('experience');
    debugButton.style('opacity', '0.6');
    debugButton.style('z-index', '100');
}

// Setup function called from app.js
function setupSketch() {
    // Show the canvas
    canvas.style('display', 'block');
    
    // Initialize face tracking if available
    if (isFaceTrackingAvailable) {
        faceTracker.setup().catch(err => {
            console.error('Error setting up face tracker:', err);
            console.log('Switching to fallback mode');
            isFaceTrackingAvailable = false;
            emitFaceTrackingError(err.message, true);
        });
    }
}

// Reset function called from app.js
function resetSketch() {
    // Hide the canvas
    canvas.style('display', 'none');
    
    // Create fresh objects
    particleSystem = new ParticleSystem(600);
    
    if (isFaceTrackingAvailable) {
        faceTracker = new FaceTracker();
    }
}

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// Handle keyboard shortcuts for testing
function keyPressed() {
    // Toggle debug mode with D key
    if (key === 'd' || key === 'D') {
        isDebugMode = !isDebugMode;
    }
} 