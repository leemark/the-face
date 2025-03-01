document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const introSection = document.getElementById('intro');
    const experienceSection = document.getElementById('experience');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // Event listeners
    startButton.addEventListener('click', startExperience);
    resetButton.addEventListener('click', resetExperience);

    // Track if we've shown an error about face tracking
    let hasShownFaceTrackingError = false;

    // Start the experience
    function startExperience() {
        // Switch from intro to experience section
        introSection.classList.remove('active');
        experienceSection.classList.add('active');
        
        // Show reset button
        resetButton.classList.remove('hidden');
        
        // Initialize p5.js sketch
        try {
            initializeSketch();
        } catch (err) {
            console.error("Error initializing sketch:", err);
            showError("There was a problem starting the experience: " + err.message);
        }
    }

    // Reset the experience
    function resetExperience() {
        // Reset the sketch
        if (window.resetSketch) {
            try {
                window.resetSketch();
            } catch (err) {
                console.error("Error resetting sketch:", err);
                showError("Error resetting the experience: " + err.message);
            }
        }
        
        // Switch back to intro
        experienceSection.classList.remove('active');
        introSection.classList.add('active');
        
        // Hide reset button
        resetButton.classList.add('hidden');
    }

    // Initialize the p5.js sketch
    function initializeSketch() {
        // This function is defined in sketch.js
        if (window.setupSketch) {
            window.setupSketch();
            
            // Set up error listener for face tracking
            window.addEventListener('faceTrackingError', handleFaceTrackingError);
        } else {
            console.error("setupSketch function not found");
            showError("Could not initialize the experience. Please refresh the page and try again.");
        }
    }
    
    // Handle face tracking errors
    function handleFaceTrackingError(event) {
        // Only show the error once
        if (!hasShownFaceTrackingError) {
            console.warn("Face tracking error event received:", event.detail);
            
            if (event.detail && event.detail.fallbackActive) {
                // Fallback is active, so just show a warning
                showError("Face tracking is not available or encountered an error. Running in fallback mode with simulated face tracking.");
            } else {
                // More serious error
                showError("Face tracking failed. The experience might not work correctly: " + 
                    (event.detail && event.detail.message ? event.detail.message : "Unknown error"));
            }
            
            hasShownFaceTrackingError = true;
        }
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
        
        // Automatically hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}); 