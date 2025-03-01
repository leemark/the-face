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
                // Draw debug panel background
                push();
                fill(0, 0, 0, 180);
                noStroke();
                rect(0, 0, 250, height);
                pop();
                
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
                        // Handle different landmark formats
                        let x, y;
                        if (Array.isArray(landmarks[i])) {
                            [x, y] = landmarks[i];
                        } else if (landmarks[i] && typeof landmarks[i] === 'object') {
                            x = landmarks[i].x;
                            y = landmarks[i].y;
                        } else {
                            continue;
                        }
                        ellipse(x * scaleX, y * scaleY, 2, 2);
                    }
                }
                pop();
                
                // Draw text information about face tracking
                push();
                fill(255);
                textSize(14);
                textAlign(LEFT, TOP);
                text(`ml5.js version: ${ml5.version || "unknown"}`, 10, vh + 10);
                text(`Face tracking method: ${getFaceTrackingMethod()}`, 10, vh + 30);
                text(`Landmarks detected: ${landmarks ? landmarks.length : 0}`, 10, vh + 50);
                text(`Keypoints for particles: ${keypoints ? keypoints.length : 0}`, 10, vh + 70);
                pop();
                
                // Draw facial feature indicators on main canvas
                drawFacialFeatureIndicators(keypoints);
            }
        }
    } else {
        // Fallback mode: just show particles with random movement
        runFallbackMode();
        
        // Debug mode: show fallback info
        if (isDebugMode) {
            push();
            fill(255);
            textSize(16);
            textAlign(LEFT, TOP);
            text("Running in fallback mode - no face tracking available", 10, 50);
            text("Using simulated face landmarks", 10, 70);
            pop();
        }
    }
}

// Helper function to get current face tracking method
function getFaceTrackingMethod() {
    if (!faceTracker) return "None";
    
    if (faceTracker.useFaceMeshApi) return "FaceMesh";
    if (faceTracker.usePoseNetApi) return "PoseNet";
    if (faceTracker.useFaceApiApi) return "FaceAPI";
    if (faceTracker.useImageClassifier) return "ImageClassifier (fallback)";
    
    return "Unknown";
}

// Draw indicators for different facial features
function drawFacialFeatureIndicators(keypoints) {
    if (!keypoints || keypoints.length === 0) return;
    
    // Group keypoints by facial feature (approximately)
    const features = categorizeFacialKeypoints(keypoints);
    
    push();
    textAlign(CENTER, CENTER);
    textSize(12);
    
    // Draw eye indicators
    if (features.leftEye.length > 0) {
        drawFeatureIndicator(features.leftEye, color(0, 255, 255), "Left Eye");
    }
    
    if (features.rightEye.length > 0) {
        drawFeatureIndicator(features.rightEye, color(0, 255, 255), "Right Eye");
    }
    
    // Draw mouth indicator
    if (features.mouth.length > 0) {
        drawFeatureIndicator(features.mouth, color(255, 0, 255), "Mouth");
    }
    
    // Draw nose indicator
    if (features.nose.length > 0) {
        drawFeatureIndicator(features.nose, color(255, 255, 0), "Nose");
    }
    
    // Draw face contour indicator
    if (features.faceContour.length > 0) {
        drawFeatureIndicator(features.faceContour, color(0, 255, 0), "Face");
    }
    
    // Draw eyebrow indicators
    if (features.leftEyebrow.length > 0) {
        drawFeatureIndicator(features.leftEyebrow, color(255, 128, 0), "L. Brow");
    }
    
    if (features.rightEyebrow.length > 0) {
        drawFeatureIndicator(features.rightEyebrow, color(255, 128, 0), "R. Brow");
    }
    
    // Draw other keypoints
    if (features.other.length > 0) {
        drawFeatureIndicator(features.other, color(128, 128, 128), "Other");
    }
    
    pop();
}

// Draw indicator for a specific facial feature
function drawFeatureIndicator(points, featureColor, label) {
    if (!points || points.length === 0) return;
    
    // Calculate center of feature
    let centerX = 0;
    let centerY = 0;
    for (const point of points) {
        centerX += point.x;
        centerY += point.y;
    }
    centerX /= points.length;
    centerY /= points.length;
    
    // Draw points
    noFill();
    stroke(featureColor);
    strokeWeight(2);
    
    // Connect points if more than one
    if (points.length > 1) {
        beginShape();
        for (const point of points) {
            vertex(point.x, point.y);
        }
        if (points.length > 2) {
            endShape(CLOSE); // Close the shape if 3+ points
        } else {
            endShape(); // Don't close with just 2 points
        }
    }
    
    // Draw individual points
    for (const point of points) {
        push();
        fill(featureColor);
        noStroke();
        ellipse(point.x, point.y, 5, 5);
        pop();
    }
    
    // Draw label
    fill(featureColor);
    stroke(0);
    strokeWeight(3);
    text(label, centerX, centerY - 15);
}

// Categorize keypoints into facial features
function categorizeFacialKeypoints(keypoints) {
    // Initialize feature categories
    const features = {
        leftEye: [],
        rightEye: [],
        nose: [],
        mouth: [],
        leftEyebrow: [],
        rightEyebrow: [],
        faceContour: [],
        other: []
    };
    
    if (!keypoints || keypoints.length === 0) return features;
    
    // If few keypoints, use position-based categorization
    if (keypoints.length < 20) {
        return categorizeByPosition(keypoints);
    }
    
    // For more keypoints, try to use known patterns
    
    // Calculate face center and bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let centerX = 0, centerY = 0;
    
    for (const point of keypoints) {
        centerX += point.x;
        centerY += point.y;
        minX = min(minX, point.x);
        maxX = max(maxX, point.x);
        minY = min(minY, point.y);
        maxY = max(maxY, point.y);
    }
    
    centerX /= keypoints.length;
    centerY /= keypoints.length;
    
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    
    // Categorize each keypoint based on its position relative to the face center
    for (const point of keypoints) {
        // Normalize position relative to face center
        const relX = (point.x - centerX) / faceWidth;
        const relY = (point.y - centerY) / faceHeight;
        
        // Left eye: upper left quadrant
        if (relX < -0.15 && relY < -0.1 && relY > -0.4) {
            features.leftEye.push(point);
        }
        // Right eye: upper right quadrant
        else if (relX > 0.15 && relY < -0.1 && relY > -0.4) {
            features.rightEye.push(point);
        }
        // Nose: center
        else if (abs(relX) < 0.15 && abs(relY) < 0.15) {
            features.nose.push(point);
        }
        // Mouth: lower center
        else if (abs(relX) < 0.25 && relY > 0.15 && relY < 0.4) {
            features.mouth.push(point);
        }
        // Left eyebrow: far upper left
        else if (relX < -0.15 && relY < -0.3) {
            features.leftEyebrow.push(point);
        }
        // Right eyebrow: far upper right
        else if (relX > 0.15 && relY < -0.3) {
            features.rightEyebrow.push(point);
        }
        // Face contour: outer points
        else if (abs(relX) > 0.35 || abs(relY) > 0.4) {
            features.faceContour.push(point);
        }
        // Other: anything not categorized
        else {
            features.other.push(point);
        }
    }
    
    return features;
}

// Categorize keypoints based on position when we have few points
function categorizeByPosition(keypoints) {
    // Initialize feature categories
    const features = {
        leftEye: [],
        rightEye: [],
        nose: [],
        mouth: [],
        leftEyebrow: [],
        rightEyebrow: [],
        faceContour: [],
        other: []
    };
    
    // For fallback or limited points, use simpler categorization
    // Calculate center and dimensions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let centerX = 0, centerY = 0;
    
    for (const point of keypoints) {
        centerX += point.x;
        centerY += point.y;
        minX = min(minX, point.x);
        maxX = max(maxX, point.x);
        minY = min(minY, point.y);
        maxY = max(maxY, point.y);
    }
    
    centerX /= keypoints.length;
    centerY /= keypoints.length;
    
    // Sort points by distance from center
    const sortedByDistance = [...keypoints].sort((a, b) => {
        const distA = dist(a.x, a.y, centerX, centerY);
        const distB = dist(b.x, b.y, centerX, centerY);
        return distA - distB;
    });
    
    // Center point is nose
    if (sortedByDistance.length > 0) {
        features.nose.push(sortedByDistance[0]);
    }
    
    // Find eyes by looking for points in upper quadrants
    for (const point of keypoints) {
        const relX = point.x - centerX;
        const relY = point.y - centerY;
        
        // Left eye
        if (relX < 0 && relY < 0) {
            features.leftEye.push(point);
        }
        // Right eye
        else if (relX > 0 && relY < 0) {
            features.rightEye.push(point);
        }
        // Mouth
        else if (abs(relX) < (maxX - minX) * 0.3 && relY > 0) {
            features.mouth.push(point);
        }
        // Face contour - outermost points
        else if (point.x === minX || point.x === maxX || point.y === minY || point.y === maxY) {
            features.faceContour.push(point);
        }
    }
    
    return features;
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
    
    // Clean up existing resources
    if (faceTracker) {
        // Properly dispose of face tracker resources to prevent tensor errors
        faceTracker.dispose();
    }
    
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