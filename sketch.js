class Particle {
    constructor(x, y) {
        this.originalPosition = createVector(x, y);
        this.position = createVector(x, y);
        this.color = Particle.generateColor();
        this.velocity = createVector(0, 0);
    }

    update(grid, deltaTime) {
        const potential = grid._potential(this.position, grid.time);
        this.velocity = potential;
        this.position.add(potential.mult(deltaTime * 10));

        const center = createVector(width / 2, height / 2);
        if (this.position.dist(center) > Math.max(width, height) * 0.7) {
            this.position = this.originalPosition.copy();
        }
    }

    render() {
        const velocityMagnitude = this.velocity.mag();
        const saturation = this.color[1] + 50 * smoothstep(0, 5, velocityMagnitude);
        stroke(color(this.color[0], saturation, this.color[2]));
        point(this.position.x, this.position.y);
    }

    static generateParticleOutsideBoundaries(boundaries, maxAttempts = 1000) {
        let validPosition = false;
        let attempts = 0;


        while (!validPosition && attempts < maxAttempts) {
            const x = random(width);
            const y = random(height);
            validPosition = true;
            for (const boundary of boundaries) {
                if (boundary.withinBoundary(createVector(x, y))) {
                    validPosition = false;
                    break;
                }
            }
            if (validPosition) {
                this.position = createVector(x, y);
            }
            attempts++;
        }

        return (attempts < maxAttempts) ? new Particle(this.position.x, this.position.y) : null;
    }

    static generateColor() {
        const hue = random(150, 230);
        const saturation = 150;
        const brightness = 150;
        return [hue, saturation, brightness];
    }
}

const smoothstep = (edge0, edge1, x) => {
    const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

const ramp = (x) => {
    if (x <= -1) return -1;
    if (x >= 1) return 1;

    const x2 = x * x;
    const x4 = x2 * x2;
    return x * (15 / 8 - (10 / 8) * x2 + (3 / 8) * x4);
}

class Boundary {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    getNearestPointOnBoundary(point) {
        const boundaryPoint = createVector(point.x - this.x, point.y - this.y).normalize().mult(this.radius).add(this.x, this.y);
        return boundaryPoint;
    }

    render() {
        noFill();
        stroke(0);
        ellipse(this.x, this.y, this.radius * 2);
    }

    withinBoundary(point) {
        const distance = dist(point.x, point.y, this.x, this.y);
        return distance < this.radius;
    }
}

class NoiseFieldGenerator {

    constructor(noiseScale = 0.001, boundaries = [], mouseEffect = false) {
        this.boundaries = boundaries;
        this.noiseScale = noiseScale;
        this.time = 0;
        this.mouseEffect = mouseEffect;
    }

    reset() {
        this.time = 0;
    }

    _partialDerivativeByX(position, t, epsilon = 0.0001) {
        const x = position.x;
        const y = position.y;
        return (this._potentialField(x + epsilon, y, t) - this._potentialField(x - epsilon, y, t)) / (2 * epsilon);
    }

    _partialDerivativeByY(position, t, epsilon = 0.0001) {
        const x = position.x;
        const y = position.y;
        return (this._potentialField(x, y + epsilon, t) - this._potentialField(x, y - epsilon, t)) / (2 * epsilon);
    }

    _noise(x, y, t, offsetX = 0, offsetY = 0, frequency = 1) {
        return (noise(x * this.noiseScale * frequency + t * 0 + offsetX, y * this.noiseScale * frequency + t * 0 + offsetY) - 0.5) * 2;
    }

    _potentialField(x, y, t) {
        const noiseValue = this._noise(x, y, t, 0, 0, 2);


        let field = noiseValue;
        if (this.mouseEffect && mouseIsPressed) {
            const mouseVector = createVector(mouseX, mouseY);
            const distance = dist(x, y, mouseVector.x, mouseVector.y);
            field *= 1 - smoothstep(0, 100, distance);
        } else {
            field *= 0;
        }

        let field2 = this._noise(x, y, t, 1000, 1000, 1) + 2 * this._noise(x, y, t, 2000, 2000, 0.5);
        if (this.boundaries.length > 0) {
            for (const boundary of this.boundaries) {
                const nearestPoint = boundary.getNearestPointOnBoundary(createVector(x, y));
                const distance = dist(x, y, nearestPoint.x, nearestPoint.y);
                field2 *= ramp(distance / 100);
            }
        }
        return field + field2;
    }

    _potential(position, t) {
        const potentialX = this._partialDerivativeByY(position, t);
        const potentialY = -this._partialDerivativeByX(position, t);

        return createVector(potentialX, potentialY);
    }
    update(deltaTime) {
        this.time += deltaTime * 0.001;
    }
}

let mouseIsClicked = false;
const numParticles = 1500;
const particles = [];
let grid;
const boundaries = [];
const numBoundaries = 0;

function setup() {
    createCanvas(700, 700);
    colorMode(HSB, 360, 100, 100, 1);
    for (let i = 0; i < numBoundaries; i++) {
        const x = random(width);
        const y = random(height);
        const radius = random(50, 70);
        boundaries.push(new Boundary(x, y, radius));
    }
    for (let i = 0; i < numParticles; i++) {
        const particle = Particle.generateParticleOutsideBoundaries(boundaries);
        if (particle) {
            particles.push(particle);
        }
    }
    grid = new NoiseFieldGenerator(0.002, boundaries, true);
}

function draw() {
    background(0, 0, 100, 0.1);
    deltaTime = Math.min(deltaTime || 16.67, 100);
    grid.update(deltaTime);
    for (let particle of particles) {
        particle.update(grid, deltaTime);
        particle.render();
    }
    for (let boundary of boundaries) {
        boundary.render();
    }
}

function mouseClicked() {
    mouseIsClicked = true;
}

function mouseReleased() {
    mouseIsClicked = false;
}