// Global variables
let faceTracker;
let particleSystem;
let canvas;
let isDebugMode = false; // Set to true to see face landmarks

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
}

// P5.js draw loop
function draw() {
    // Clear the background
    background(10, 10, 10, 20); // Low alpha for trail effect
    
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
    
    // Initialize face tracking
    faceTracker.setup().catch(err => {
        console.error('Error setting up face tracker:', err);
    });
}

// Reset function called from app.js
function resetSketch() {
    // Hide the canvas
    canvas.style('display', 'none');
    
    // Create fresh objects
    particleSystem = new ParticleSystem(600);
    faceTracker = new FaceTracker();
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