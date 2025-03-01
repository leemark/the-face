# The Face

An interactive art project that creates a particle-based visual representation of the user's face.

## Description

"The Face" is a web-based art project that uses your webcam to track facial features. Instead of displaying your actual face, it creates an abstract representation using particles that swarm around your facial features, creating a dynamic and interactive experience.

The particles exhibit boid-like flocking behavior, responding to the movement and position of your facial features in real-time. The result is an ethereal visualization that captures the essence of your face without displaying the actual video feed.

## Features

- Real-time facial tracking using ml5.js and FaceMesh
- Dynamic particle system with boid-like behavior (alignment, cohesion, separation)
- Particles that respond to facial movements and expressions
- Fullscreen immersive experience
- Debug mode for development and testing

## Technologies Used

- HTML, CSS, JavaScript (vanilla)
- p5.js for canvas manipulation and animation
- ml5.js for machine learning and facial tracking

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser (Chrome recommended)
3. Allow camera access when prompted
4. Click "Start Experience" to begin

## Controls

- Click "Start Experience" to begin
- Click "Reset" to reset the experience
- Press 'D' key to toggle debug mode (shows face landmarks)

## Requirements

- Modern web browser with WebGL support
- Webcam
- JavaScript enabled

## Development

For development and customization:

- Modify particle behavior in `src/js/particles.js`
- Adjust facial tracking settings in `src/js/faceMesh.js`
- Change visual appearance with `src/css/styles.css`

## License

This project is released under the MIT License. 