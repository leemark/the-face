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
    }

    // Initialize the face tracker
    async setup() {
        // Create video element for webcam feed
        this.video = createCapture(VIDEO);
        this.video.size(640, 480);
        this.video.hide(); // Hide the video element
        
        // Load facemesh model
        // Updated to use the correct ml5.js API
        this.faceMesh = ml5.facemesh || ml5.FaceMesh;
        
        if (!this.faceMesh) {
            console.error("FaceMesh not found in ml5 library. Checking for alternative APIs...");
            
            // Try alternative API names that might be used in different ml5 versions
            if (ml5.face) {
                console.log("Found ml5.face, trying that instead");
                this.faceMesh = ml5.face;
            } else if (ml5.faceApi) {
                console.log("Found ml5.faceApi, trying that instead");
                this.faceMesh = ml5.faceApi;
            } else {
                throw new Error("Could not find FaceMesh functionality in ml5 library");
            }
        }
        
        console.log("Creating face detector with options:", this.options);
        
        // Create a new instance with the current API
        try {
            this.faceMeshInstance = await this.faceMesh(
                this.video, 
                this.options, 
                () => {
                    console.log('FaceMesh model loaded');
                    this.isReady = true;
                }
            );
            
            // Listen for face detections
            if (this.faceMeshInstance && this.faceMeshInstance.on) {
                this.faceMeshInstance.on('face', (results) => {
                    this.processFaceDetection(results);
                });
            } else {
                console.warn("FaceMesh instance doesn't support 'on' method, trying alternative approach");
                // For newer ml5 versions that might use a different pattern
                this.detectFaceLoop();
            }
        } catch (err) {
            console.error("Error initializing FaceMesh:", err);
            throw err;
        }
    }
    
    // Alternative detection loop for newer ml5 versions if needed
    async detectFaceLoop() {
        if (!this.isReady) return;
        
        try {
            if (this.faceMeshInstance && this.faceMeshInstance.predict) {
                const results = await this.faceMeshInstance.predict(this.video);
                this.processFaceDetection(results);
            }
        } catch (err) {
            console.error("Error in face detection loop:", err);
        }
        
        // Continue detection loop
        setTimeout(() => this.detectFaceLoop(), 100);
    }

    // Process detected face and extract key landmarks
    processFaceDetection(results) {
        if (results && results.length > 0) {
            // Different ml5 versions might return different data structures
            // Try to handle various formats
            if (results[0].scaledMesh) {
                // Store all landmarks
                this.landmarks = results[0].scaledMesh;
            } else if (results[0].mesh) {
                this.landmarks = results[0].mesh;
            } else if (results[0].landmarks && results[0].landmarks.positions) {
                this.landmarks = results[0].landmarks.positions;
            }
            
            // Extract key facial feature points
            this.keypoints = this.extractKeypoints(this.landmarks);
        } else {
            this.landmarks = [];
            this.keypoints = [];
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
                if (landmarks[idx]) {
                    const point = createVector(landmarks[idx][0], landmarks[idx][1]);
                    keypoints.push(point);
                }
            }
        };
        
        // Add all feature points with appropriate spacing
        addFeaturePoints(leftEye, 1);
        addFeaturePoints(rightEye, 1);
        addFeaturePoints(lips, 1);
        addFeaturePoints(nose, 2);
        addFeaturePoints(leftEyebrow, 1);
        addFeaturePoints(rightEyebrow, 1);
        addFeaturePoints(faceContour, 3);
        
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
} 