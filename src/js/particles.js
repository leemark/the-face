// Particle class for individual particles
class Particle {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = p5.Vector.random2D().mult(random(0.5, 2));
        this.acceleration = createVector(0, 0);
        this.maxSpeed = 4;
        this.maxForce = 0.1;
        this.size = random(3, 8);
        this.color = {
            r: random(150, 255),
            g: random(150, 255),
            b: random(150, 255),
            a: random(150, 200)
        };
        this.lifespan = 255;
        this.decay = random(0.5, 1.5);
        this.isAttracted = false;
    }

    // Apply force to particle
    applyForce(force) {
        this.acceleration.add(force);
    }

    // Calculate attraction to target point
    seek(target, strength = 1) {
        let desired = p5.Vector.sub(target, this.position);
        let distance = desired.mag();
        
        if (distance < 1) {
            return createVector(0, 0);
        }
        
        desired.normalize();
        desired.mult(this.maxSpeed);
        
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        steer.mult(strength);
        
        return steer;
    }

    // Separate from other particles (avoid crowding)
    separate(particles, desiredSeparation = 25) {
        let steer = createVector(0, 0);
        let count = 0;
        
        for (let other of particles) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < desiredSeparation)) {
                let diff = p5.Vector.sub(this.position, other.position);
                diff.normalize();
                diff.div(d); // Weight by distance
                steer.add(diff);
                count++;
            }
        }
        
        if (count > 0) {
            steer.div(count);
        }
        
        if (steer.mag() > 0) {
            steer.normalize();
            steer.mult(this.maxSpeed);
            steer.sub(this.velocity);
            steer.limit(this.maxForce);
        }
        
        return steer;
    }

    // Align with other particles
    align(particles, neighborDistance = 50) {
        let sum = createVector(0, 0);
        let count = 0;
        
        for (let other of particles) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < neighborDistance)) {
                sum.add(other.velocity);
                count++;
            }
        }
        
        if (count > 0) {
            sum.div(count);
            sum.normalize();
            sum.mult(this.maxSpeed);
            let steer = p5.Vector.sub(sum, this.velocity);
            steer.limit(this.maxForce);
            return steer;
        } else {
            return createVector(0, 0);
        }
    }

    // Cohesion: move toward the center of mass of neighbors
    cohesion(particles, neighborDistance = 50) {
        let sum = createVector(0, 0);
        let count = 0;
        
        for (let other of particles) {
            let d = p5.Vector.dist(this.position, other.position);
            if ((d > 0) && (d < neighborDistance)) {
                sum.add(other.position);
                count++;
            }
        }
        
        if (count > 0) {
            sum.div(count);
            return this.seek(sum, 0.5);
        } else {
            return createVector(0, 0);
        }
    }

    // Stay within bounds
    borders(width, height) {
        const buffer = 50;
        let desired = null;
        
        if (this.position.x < buffer) {
            desired = createVector(this.maxSpeed, this.velocity.y);
        } else if (this.position.x > width - buffer) {
            desired = createVector(-this.maxSpeed, this.velocity.y);
        }
        
        if (this.position.y < buffer) {
            desired = desired || createVector(this.velocity.x, this.maxSpeed);
        } else if (this.position.y > height - buffer) {
            desired = desired || createVector(this.velocity.x, -this.maxSpeed);
        }
        
        if (desired) {
            desired.normalize();
            desired.mult(this.maxSpeed);
            let steer = p5.Vector.sub(desired, this.velocity);
            steer.limit(this.maxForce);
            return steer;
        }
        
        return createVector(0, 0);
    }

    // Update particle position
    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0); // Reset acceleration
        
        // Reduce lifespan for particles not attracted to facial features
        if (!this.isAttracted) {
            this.lifespan -= this.decay;
        } else {
            // Regenerate lifespan a bit if attracted
            this.lifespan = min(255, this.lifespan + this.decay * 2);
        }
    }

    // Display particle
    display() {
        noStroke();
        fill(this.color.r, this.color.g, this.color.b, this.lifespan);
        ellipse(this.position.x, this.position.y, this.size, this.size);
    }

    // Check if the particle is still alive
    isDead() {
        return this.lifespan <= 0;
    }
}

// ParticleSystem manages multiple particles
class ParticleSystem {
    constructor(numParticles = 500) {
        this.particles = [];
        this.attractors = [];
        this.maxParticles = numParticles;
        
        // Initialize particles
        for (let i = 0; i < this.maxParticles; i++) {
            this.addParticle();
        }
    }

    // Add a particle to the system
    addParticle() {
        const x = random(width);
        const y = random(height);
        this.particles.push(new Particle(x, y));
    }

    // Set attractor points based on facial landmarks
    setAttractors(landmarks) {
        this.attractors = landmarks;
    }

    // Update all particles
    update() {
        // Add particles if below max
        while (this.particles.length < this.maxParticles) {
            this.addParticle();
        }
        
        // Update each particle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Apply various behaviors
            const separation = p.separate(this.particles).mult(1.5);
            const alignment = p.align(this.particles).mult(1.0);
            const cohesion = p.cohesion(this.particles).mult(1.0);
            const borders = p.borders(width, height).mult(1.5);
            
            p.applyForce(separation);
            p.applyForce(alignment);
            p.applyForce(cohesion);
            p.applyForce(borders);
            
            // Reset attraction flag
            p.isAttracted = false;
            
            // Apply attraction to facial landmarks
            if (this.attractors.length > 0) {
                // Find the closest attractor
                let closestDist = Infinity;
                let closestAttractor = null;
                
                for (let attractor of this.attractors) {
                    const d = p5.Vector.dist(p.position, attractor);
                    if (d < closestDist && d < 150) { // Only consider attractors within range
                        closestDist = d;
                        closestAttractor = attractor;
                    }
                }
                
                // Apply attraction to closest attractor
                if (closestAttractor) {
                    // Strength varies by distance - stronger when closer
                    const strength = map(closestDist, 0, 150, 2.5, 0.5);
                    const attraction = p.seek(closestAttractor, strength);
                    p.applyForce(attraction);
                    p.isAttracted = true;
                }
            }
            
            p.update();
            
            // Remove dead particles
            if (p.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    // Display all particles
    display() {
        for (let p of this.particles) {
            p.display();
        }
    }
} 