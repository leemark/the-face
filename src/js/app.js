document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const introSection = document.getElementById('intro');
    const experienceSection = document.getElementById('experience');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');

    // Event listeners
    startButton.addEventListener('click', startExperience);
    resetButton.addEventListener('click', resetExperience);

    // Start the experience
    function startExperience() {
        // Switch from intro to experience section
        introSection.classList.remove('active');
        experienceSection.classList.add('active');
        
        // Show reset button
        resetButton.classList.remove('hidden');
        
        // Initialize p5.js sketch
        initializeSketch();
    }

    // Reset the experience
    function resetExperience() {
        // Reset the sketch
        if (window.resetSketch) {
            window.resetSketch();
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
        }
    }
}); 