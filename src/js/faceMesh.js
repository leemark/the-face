// FaceTracker class for handling facial recognition
class FaceTracker {
    constructor() {
        this.video = null;
        this.faceMesh = null;
        this.landmarks = [];
        this.keypoints = [];
        this.isReady = false;
        this.options = {
            flipHorizontal: true,  // Flip camera horizontally for selfie view
            maxFaces: 1            // Track only one face for performance
        };
        this.isProcessing = false; // Flag to prevent concurrent processing
        this.tensorCleanupEnabled = true; // Enable tensor cleanup (can be disabled for debugging)
        this.detectionInterval = 100; // Detection interval in ms
    }

    // Initialize the face tracker
    async setup() {
        // Create video element for webcam feed
        this.video = createCapture(VIDEO);
        this.video.size(640, 480);
        this.video.hide(); // Hide the video element
        
        console.log("ml5 version:", ml5.version);
        
        // First, check documented API names based on ml5.js documentation
        if (ml5.version) {
            console.log("Using ml5.js version:", ml5.version);
            
            // Version-specific adjustments
            if (ml5.version === "0.12.2") {
                // In 0.12.2, we need to be careful with tensor cleanup
                console.log("Applying specific optimizations for ml5.js 0.12.2");
                this.detectionInterval = 150; // Slower detection rate to avoid tensor issues
            }
        }
        
        // Try different possible facemesh API names based on ml5 versions
        // Based on official ml5.js documentation categories
        
        // 1. First try the documented facemesh API
        if (ml5.facemesh) {
            console.log("Using ml5.facemesh API");
            this.faceMesh = ml5.facemesh;
            this.useFaceMeshApi = true;
        } 
        // 2. Try capitalized version which might be used in newer versions
        else if (ml5.FaceMesh) {
            console.log("Using ml5.FaceMesh API");
            this.faceMesh = ml5.FaceMesh;
            this.useFaceMeshApi = true;
        }
        // 3. Check if it's in the "poseNet" family which includes face tracking
        else if (ml5.poseNet) {
            console.log("Using ml5.poseNet for face tracking");
            this.faceMesh = ml5.poseNet;
            this.usePoseNetApi = true;
            this.options.detectionType = 'single'; // PoseNet specific option
        }
        // 4. Check for FaceApi which is another face detection model in ml5
        else if (ml5.faceApi) {
            console.log("Using ml5.faceApi as fallback");
            this.faceMesh = ml5.faceApi;
            this.useFaceApiApi = true;
            this.options.withLandmarks = true; // FaceApi specific option
        }
        // 5. Check generic 'face' API
        else if (ml5.face) {
            console.log("Using generic ml5.face API");
            this.faceMesh = ml5.face;
        }
        // 6. As last resort, check imageClassifier with a face model
        else if (ml5.imageClassifier) {
            console.log("Trying ml5.imageClassifier as last resort");
            this.useImageClassifier = true;
            this.faceMesh = ml5.imageClassifier;
            // We'll handle this special case in the code below
        }
        else {
            console.error("No face detection API found in ml5 library");
            throw new Error("Could not find face detection functionality in ml5 library");
        }
        
        console.log("Creating face detector with options:", this.options);
        
        // Create a new instance with the current API
        try {
            // Special case for imageClassifier
            if (this.useImageClassifier) {
                this.faceMeshInstance = await this.faceMesh('MobileNet', this.video, () => {
                    console.log('Using MobileNet as a basic detector');
                    this.isReady = true;
                    // Start detection loop for this special case
                    this.detectWithClassifier();
                });
            } else {
                // Standard case for facemesh and similar APIs
                this.faceMeshInstance = await this.faceMesh(
                    this.video, 
                    this.options, 
                    () => {
                        console.log('Face detection model loaded');
                        this.isReady = true;
                    }
                );
                
                // For FaceMesh in ml5.js 0.12.2, use polling approach which is more reliable
                if (this.useFaceMeshApi && ml5.version === "0.12.2") {
                    console.log("Using polling approach for FaceMesh in ml5.js 0.12.2");
                    this.usePollingForDetection = true;
                    this.detectFaceLoop();
                    return;
                }
                
                // Listen for face detections
                if (this.faceMeshInstance && this.faceMeshInstance.on) {
                    // For APIs that use event-based detection (facemesh, FaceMesh)
                    const eventNames = ['face', 'predict', 'pose', 'facedetection'];
                    let eventBound = false;
                    
                    // Try different event names depending on the API
                    for (const eventName of eventNames) {
                        try {
                            console.log(`Trying to bind to '${eventName}' event`);
                            this.faceMeshInstance.on(eventName, (results) => {
                                // Process results if we're not already processing
                                if (!this.isProcessing) {
                                    this.processFaceDetection(results);
                                }
                            });
                            eventBound = true;
                            console.log(`Successfully bound to '${eventName}' event`);
                            break;
                        } catch (err) {
                            console.log(`Event '${eventName}' not supported`);
                        }
                    }
                    
                    if (!eventBound) {
                        console.warn("No compatible events found, using polling approach");
                        this.usePollingForDetection = true;
                        this.detectFaceLoop();
                    }
                } else {
                    console.warn("Model doesn't support 'on' method, using polling approach");
                    this.usePollingForDetection = true;
                    this.detectFaceLoop();
                }
            }
        } catch (err) {
            console.error("Error initializing face detection:", err);
            throw err;
        }
    }
    
    // Special detection method for imageClassifier fallback
    async detectWithClassifier() {
        if (!this.isReady || !this.faceMeshInstance) return;
        
        // Prevent concurrent detection to avoid tensor disposal errors
        if (this.isProcessing) {
            setTimeout(() => this.detectWithClassifier(), this.detectionInterval);
            return;
        }
        
        this.isProcessing = true;
        
        try {
            const results = await this.faceMeshInstance.classify(this.video);
            // We can't get facial landmarks, so we'll create dummy ones
            // based on general position of the face in the image
            this.createDummyLandmarks(results);
        } catch (err) {
            console.error("Error in classifier detection:", err);
        } finally {
            this.isProcessing = false;
            
            // Use timeout for next detection to allow tensors to be properly managed
            if (this.isReady) {
                setTimeout(() => this.detectWithClassifier(), this.detectionInterval);
            }
        }
    }
    
    // Create dummy landmarks when using classifiers that don't provide landmarks
    createDummyLandmarks(results) {
        const landmarks = [];
        const keypoints = [];
        
        // Create a face-like pattern of points
        const centerX = width / 2;
        const centerY = height / 2;
        const faceSize = min(width, height) * 0.3;
        
        // Eye positions (left and right)
        keypoints.push(createVector(centerX - faceSize * 0.2, centerY - faceSize * 0.2));
        keypoints.push(createVector(centerX + faceSize * 0.2, centerY - faceSize * 0.2));
        
        // Nose position
        keypoints.push(createVector(centerX, centerY));
        
        // Mouth positions
        keypoints.push(createVector(centerX - faceSize * 0.15, centerY + faceSize * 0.2));
        keypoints.push(createVector(centerX + faceSize * 0.15, centerY + faceSize * 0.2));
        
        // Face outline
        for (let angle = 0; angle < TWO_PI; angle += PI / 8) {
            const x = centerX + cos(angle) * faceSize * 0.5;
            const y = centerY + sin(angle) * faceSize * 0.5;
            keypoints.push(createVector(x, y));
        }
        
        // Add some movement based on time
        const time = millis() / 1000;
        for (let point of keypoints) {
            point.x += sin(time + point.y * 0.1) * 2; 
            point.y += cos(time + point.x * 0.1) * 2;
        }
        
        this.landmarks = landmarks;
        this.keypoints = keypoints;
    }
    
    // Alternative detection loop for newer ml5 versions if needed
    async detectFaceLoop() {
        if (!this.isReady || !this.faceMeshInstance) return;
        
        // Prevent concurrent detection to avoid tensor disposal errors
        if (this.isProcessing) {
            setTimeout(() => this.detectFaceLoop(), this.detectionInterval);
            return;
        }
        
        this.isProcessing = true;
        
        try {
            let results = null;
            
            // Try different prediction methods based on the API
            if (this.useFaceMeshApi) {
                // Specific handling for FaceMesh
                try {
                    results = await this.faceMeshInstance.predict(this.video);
                } catch (err) {
                    console.warn("Error in FaceMesh predict:", err);
                }
            } else if (this.faceMeshInstance.predict) {
                results = await this.faceMeshInstance.predict(this.video);
            } else if (this.faceMeshInstance.detectSingle) {
                results = await this.faceMeshInstance.detectSingle(this.video);
            } else if (this.faceMeshInstance.detect) {
                results = await this.faceMeshInstance.detect(this.video);
            } else if (this.faceMeshInstance.estimateFaces) {
                results = await this.faceMeshInstance.estimateFaces(this.video);
            } else if (this.faceMeshInstance.estimatePose) {
                results = await this.faceMeshInstance.estimatePose(this.video);
            } else {
                console.warn("No suitable predict method found");
            }
            
            // Process results
            if (results) {
                this.processFaceDetection(results);
            }
            
        } catch (err) {
            console.error("Error in face detection loop:", err);
        } finally {
            this.isProcessing = false;
            
            // Manual cleanup for TensorFlow.js tensors
            if (this.tensorCleanupEnabled && window.tf && tf.engine) {
                try {
                    // This helps prevent memory leaks in TensorFlow.js
                    const numTensors = tf.memory().numTensors;
                    if (numTensors > 1000) {
                        console.warn(`High tensor count: ${numTensors}. Disposing unused tensors.`);
                        tf.engine().endScope();
                        tf.engine().startScope();
                    }
                } catch (e) {
                    console.warn("Error cleaning up tensors:", e);
                }
            }
            
            // Use timeout for next detection to allow tensors to be properly managed
            if (this.isReady && this.usePollingForDetection) {
                setTimeout(() => this.detectFaceLoop(), this.detectionInterval);
            }
        }
    }

    // Process detected face and extract key landmarks
    processFaceDetection(results) {
        if (!results) {
            console.warn("No results from face detection");
            this.landmarks = [];
            this.keypoints = [];
            return;
        }
        
        // Create a deep copy of landmarks to avoid tensor disposal issues
        let processedLandmarks = [];
        
        // Different ml5 versions and APIs return different data structures
        // Try to handle various formats
        try {
            if (Array.isArray(results) && results.length > 0) {
                // Most common format: array of face detections
                const firstResult = results[0];
                
                if (firstResult.scaledMesh) {
                    // FaceMesh format
                    processedLandmarks = this.deepCopyLandmarks(firstResult.scaledMesh);
                } else if (firstResult.mesh) {
                    // Alternative FaceMesh format
                    processedLandmarks = this.deepCopyLandmarks(firstResult.mesh);
                } else if (firstResult.landmarks && firstResult.landmarks.positions) {
                    // FaceApi format
                    processedLandmarks = this.deepCopyLandmarks(firstResult.landmarks.positions);
                } else if (firstResult.keypoints) {
                    // PoseNet format
                    processedLandmarks = firstResult.keypoints.map(kp => [kp.position.x, kp.position.y, 0]);
                } else if (firstResult.parts) {
                    // BodyPix format (unlikely but possible)
                    processedLandmarks = Object.values(firstResult.parts)
                        .flat()
                        .map(point => [point.x, point.y, 0]);
                }
            } else if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                // MediaPipe Facemesh format
                processedLandmarks = this.deepCopyLandmarks(results.multiFaceLandmarks[0]);
            } else if (results.faceLandmarks) {
                // Single face landmarks format
                processedLandmarks = this.deepCopyLandmarks(results.faceLandmarks);
            } else if (typeof results === 'object' && results.poseLandmarks) {
                // MediaPipe Pose format (can be used as fallback)
                processedLandmarks = this.deepCopyLandmarks(results.poseLandmarks);
            } else {
                console.warn("Unrecognized face detection result format:", results);
                processedLandmarks = [];
            }
            
            // Update landmarks with deep-copied values
            this.landmarks = processedLandmarks;
            
            // Extract key facial feature points
            if (this.landmarks && this.landmarks.length > 0) {
                this.keypoints = this.extractKeypoints(this.landmarks);
            } else {
                this.keypoints = [];
            }
        } catch (err) {
            console.error("Error processing face detection results:", err);
            this.landmarks = [];
            this.keypoints = [];
        }
    }
    
    // Create a deep copy of landmarks to avoid tensor disposal issues
    deepCopyLandmarks(landmarks) {
        if (!landmarks || !landmarks.length) return [];
        
        try {
            return landmarks.map(landmark => {
                if (Array.isArray(landmark)) {
                    // Copy array landmarks [x, y, z]
                    return [...landmark];
                } else if (landmark && typeof landmark === 'object') {
                    // Copy object landmarks {x, y, z}
                    return { 
                        x: landmark.x, 
                        y: landmark.y, 
                        z: landmark.z !== undefined ? landmark.z : 0 
                    };
                } else {
                    return null;
                }
            }).filter(l => l !== null);
        } catch (err) {
            console.warn("Error creating deep copy of landmarks:", err);
            return [];
        }
    }

    // Extract important facial landmarks for particle attraction
    extractKeypoints(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            return [];
        }
        
        const keypoints = [];
        
        // Define groups of important facial features
        // These indices are based on the FaceMesh 468 points model
        
        // Eye contours (left and right)
        const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
        
        // Lips contour
        const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
        
        // Nose
        const nose = [1, 2, 3, 4, 5, 6, 168, 197, 195, 5, 4, 98, 97, 2, 326, 327];
        
        // Eyebrows
        const leftEyebrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
        const rightEyebrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];
        
        // Face contour (jawline)
        const faceContour = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];

        // Helper function to add points with some variance
        const addFeaturePoints = (indices, spacing = 1) => {
            for (let i = 0; i < indices.length; i += spacing) {
                const idx = indices[i];
                // Safely access landmarks to avoid errors
                if (idx < landmarks.length && landmarks[idx]) {
                    try {
                        // Handle different landmark formats (array or object with x,y)
                        let point;
                        if (Array.isArray(landmarks[idx])) {
                            point = createVector(landmarks[idx][0], landmarks[idx][1]);
                        } else if (landmarks[idx].x !== undefined && landmarks[idx].y !== undefined) {
                            point = createVector(landmarks[idx].x, landmarks[idx].y);
                        } else {
                            continue; // Skip if format is unknown
                        }
                        keypoints.push(point);
                    } catch (err) {
                        // If there's an error accessing a landmark, just skip it
                        continue;
                    }
                }
            }
        };
        
        try {
            // Check if we have enough landmarks for the full face model
            if (landmarks.length >= 468) {
                // Full FaceMesh model with 468 points
                addFeaturePoints(leftEye, 1);
                addFeaturePoints(rightEye, 1);
                addFeaturePoints(lips, 1);
                addFeaturePoints(nose, 2);
                addFeaturePoints(leftEyebrow, 1);
                addFeaturePoints(rightEyebrow, 1);
                addFeaturePoints(faceContour, 3);
            } else if (landmarks.length >= 68) {
                // Likely the 68-point face model used in some APIs
                // Remap the indices for this model
                const eyeIndices = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47];
                const mouthIndices = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67];
                const noseIndices = [27, 28, 29, 30, 31, 32, 33, 34, 35];
                const jawIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                
                addFeaturePoints(eyeIndices, 1);
                addFeaturePoints(mouthIndices, 1);
                addFeaturePoints(noseIndices, 1);
                addFeaturePoints(jawIndices, 2);
            } else {
                // For other models with fewer points, just use all available points
                for (let i = 0; i < landmarks.length; i++) {
                    if (landmarks[i]) {
                        try {
                            let point;
                            if (Array.isArray(landmarks[i])) {
                                point = createVector(landmarks[i][0], landmarks[i][1]);
                            } else if (landmarks[i].x !== undefined && landmarks[i].y !== undefined) {
                                point = createVector(landmarks[i].x, landmarks[i].y);
                            } else {
                                continue;
                            }
                            keypoints.push(point);
                        } catch (err) {
                            // Skip on error
                            continue;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("Error extracting keypoints:", err);
        }
        
        return keypoints;
    }

    // Check if face tracker is ready
    isTrackerReady() {
        return this.isReady;
    }

    // Get current facial keypoints for particle attraction
    getKeypoints() {
        return this.keypoints;
    }

    // Get full face landmarks (all 468 points)
    getLandmarks() {
        return this.landmarks;
    }

    // Get the video element (for debugging)
    getVideo() {
        return this.video;
    }
    
    // Clean up resources when done
    dispose() {
        this.isReady = false;
        this.usePollingForDetection = false;
        
        if (this.faceMeshInstance && this.faceMeshInstance.dispose) {
            try {
                this.faceMeshInstance.dispose();
            } catch (err) {
                console.warn("Error disposing faceMesh instance:", err);
            }
        }
        
        // Manual TensorFlow cleanup
        if (window.tf && tf.engine) {
            try {
                tf.engine().endScope();
                tf.engine().disposeVariables();
                console.log("TensorFlow tensors cleaned up");
            } catch (err) {
                console.warn("Error cleaning up TensorFlow tensors:", err);
            }
        }
    }
} 