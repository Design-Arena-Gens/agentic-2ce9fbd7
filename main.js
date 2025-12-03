import * as THREE from 'three';

// Game state
const gameState = {
    score: 0,
    speed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    baseSpeed: 50,
    speedBoost: 0,
    isPlaying: false,
    questionActive: false,
    questionCooldown: 0
};

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87ceeb, 1, 300);
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Car
const carGeometry = new THREE.BoxGeometry(2, 1, 4);
const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const car = new THREE.Mesh(carGeometry, carMaterial);
car.position.y = 0.5;
car.castShadow = true;
scene.add(car);

// Car details
const windowGeometry = new THREE.BoxGeometry(1.8, 0.6, 1.5);
const windowMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const carWindow = new THREE.Mesh(windowGeometry, windowMaterial);
carWindow.position.set(0, 0.8, 0.5);
car.add(carWindow);

// Wheels
const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });

const wheelPositions = [
    [-1, -0.3, 1.5],
    [1, -0.3, 1.5],
    [-1, -0.3, -1.5],
    [1, -0.3, -1.5]
];

wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    car.add(wheel);
});

// Road
const roadWidth = 15;
const roadSegmentLength = 50;
const roadSegments = [];

function createRoadSegment(zPosition) {
    const group = new THREE.Group();

    // Main road
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadSegmentLength);
    const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);

    // Center line
    const lineGeometry = new THREE.PlaneGeometry(0.3, roadSegmentLength);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.01;
    group.add(centerLine);

    // Side lines
    [-roadWidth/2, roadWidth/2].forEach(x => {
        const sideLine = new THREE.Mesh(lineGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        sideLine.rotation.x = -Math.PI / 2;
        sideLine.position.set(x, 0.01, 0);
        group.add(sideLine);
    });

    // Grass on sides
    const grassGeometry = new THREE.PlaneGeometry(30, roadSegmentLength);
    const grassMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });

    [-22.5, 22.5].forEach(x => {
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.receiveShadow = true;
        grass.position.x = x;
        group.add(grass);
    });

    // Random trees
    for (let i = 0; i < 5; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const treeX = side * (roadWidth/2 + 5 + Math.random() * 15);
        const treeZ = (Math.random() - 0.5) * roadSegmentLength;

        const treeTrunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 3, 8),
            new THREE.MeshPhongMaterial({ color: 0x8b4513 })
        );
        treeTrunk.position.set(treeX, 1.5, treeZ);
        treeTrunk.castShadow = true;
        group.add(treeTrunk);

        const treeTop = new THREE.Mesh(
            new THREE.ConeGeometry(2, 4, 8),
            new THREE.MeshPhongMaterial({ color: 0x228b22 })
        );
        treeTop.position.set(treeX, 4.5, treeZ);
        treeTop.castShadow = true;
        group.add(treeTop);
    }

    group.position.z = zPosition;
    scene.add(group);
    return group;
}

// Initialize road segments
for (let i = 0; i < 10; i++) {
    roadSegments.push(createRoadSegment(-i * roadSegmentLength));
}

// Question obstacles
const questionObstacles = [];

function createQuestionObstacle(zPosition) {
    const geometry = new THREE.BoxGeometry(3, 3, 0.5);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.3
    });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(
        (Math.random() - 0.5) * (roadWidth - 4),
        1.5,
        zPosition
    );
    obstacle.castShadow = true;

    // Add question mark
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const textMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 2.5),
        textMaterial
    );
    textMesh.position.z = 0.26;
    obstacle.add(textMesh);

    scene.add(obstacle);
    return obstacle;
}

// Spawn question obstacles
setInterval(() => {
    if (gameState.isPlaying && !gameState.questionActive) {
        questionObstacles.push(createQuestionObstacle(car.position.z - 150));
    }
}, 5000);

// Math question generator
function generateQuestion() {
    const operations = ['+', '-', '*', '/'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1, num2, correctAnswer, question;

    switch(operation) {
        case '+':
            num1 = Math.floor(Math.random() * 50) + 1;
            num2 = Math.floor(Math.random() * 50) + 1;
            correctAnswer = num1 + num2;
            question = `${num1} + ${num2} = ?`;
            break;
        case '-':
            num1 = Math.floor(Math.random() * 50) + 20;
            num2 = Math.floor(Math.random() * num1);
            correctAnswer = num1 - num2;
            question = `${num1} - ${num2} = ?`;
            break;
        case '*':
            num1 = Math.floor(Math.random() * 12) + 1;
            num2 = Math.floor(Math.random() * 12) + 1;
            correctAnswer = num1 * num2;
            question = `${num1} × ${num2} = ?`;
            break;
        case '/':
            num2 = Math.floor(Math.random() * 10) + 2;
            correctAnswer = Math.floor(Math.random() * 10) + 1;
            num1 = num2 * correctAnswer;
            question = `${num1} ÷ ${num2} = ?`;
            break;
    }

    const answers = [correctAnswer];
    while (answers.length < 4) {
        const wrongAnswer = correctAnswer + Math.floor(Math.random() * 20) - 10;
        if (wrongAnswer !== correctAnswer && !answers.includes(wrongAnswer) && wrongAnswer > 0) {
            answers.push(wrongAnswer);
        }
    }

    // Shuffle answers
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    return { question, correctAnswer, answers };
}

function showQuestion() {
    gameState.questionActive = true;
    const { question, correctAnswer, answers } = generateQuestion();

    document.getElementById('question').textContent = question;
    const answerButtons = document.querySelectorAll('.answer-btn');

    answerButtons.forEach((btn, index) => {
        btn.textContent = answers[index];
        btn.className = 'answer-btn';
        btn.onclick = () => checkAnswer(answers[index], correctAnswer, btn);
    });

    document.getElementById('question-panel').classList.remove('hidden');
}

function checkAnswer(selected, correct, btn) {
    const allButtons = document.querySelectorAll('.answer-btn');
    allButtons.forEach(b => b.disabled = true);

    const feedback = document.getElementById('feedback');

    if (selected === correct) {
        btn.classList.add('correct');
        gameState.score += 100;
        gameState.correctAnswers++;
        gameState.speedBoost = Math.min(gameState.speedBoost + 20, 100);

        feedback.textContent = '✓ Correct!';
        feedback.className = 'show correct';
    } else {
        btn.classList.add('wrong');
        gameState.wrongAnswers++;
        gameState.speedBoost = Math.max(gameState.speedBoost - 10, 0);

        feedback.textContent = '✗ Wrong!';
        feedback.className = 'show wrong';

        allButtons.forEach(b => {
            if (parseInt(b.textContent) === correct) {
                b.classList.add('correct');
            }
        });
    }

    setTimeout(() => {
        feedback.className = '';
        document.getElementById('question-panel').classList.add('hidden');
        gameState.questionActive = false;
        gameState.questionCooldown = 3;
        allButtons.forEach(b => {
            b.disabled = false;
            b.className = 'answer-btn';
        });
    }, 1500);

    updateUI();
}

// Controls
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Camera follow car
camera.position.set(0, 5, 10);
camera.lookAt(car.position);

// UI elements
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', startGame);

function startGame() {
    gameState.isPlaying = true;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('score-panel').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('speed').textContent = Math.round(gameState.speed);
    document.getElementById('correct').textContent = gameState.correctAnswers;
    document.getElementById('wrong').textContent = gameState.wrongAnswers;
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (gameState.isPlaying && !gameState.questionActive) {
        // Car controls
        const turnSpeed = 3 * delta;
        const acceleration = 30 * delta;

        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            car.position.x = Math.max(car.position.x - turnSpeed, -roadWidth/2 + 1);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            car.position.x = Math.min(car.position.x + turnSpeed, roadWidth/2 - 1);
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            gameState.baseSpeed = Math.min(gameState.baseSpeed + acceleration, 150);
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            gameState.baseSpeed = Math.max(gameState.baseSpeed - acceleration, 20);
        }

        // Apply speed
        gameState.speed = gameState.baseSpeed + gameState.speedBoost;
        car.position.z -= gameState.speed * delta;

        // Decay speed boost
        if (gameState.speedBoost > 0) {
            gameState.speedBoost -= 5 * delta;
        }

        // Update score based on distance
        gameState.score += Math.floor(gameState.speed * delta);

        // Question cooldown
        if (gameState.questionCooldown > 0) {
            gameState.questionCooldown -= delta;
        }

        // Move road segments
        roadSegments.forEach(segment => {
            if (segment.position.z > car.position.z + roadSegmentLength * 2) {
                segment.position.z -= roadSegmentLength * roadSegments.length;
            }
        });

        // Check question obstacle collision
        questionObstacles.forEach((obstacle, index) => {
            if (obstacle.position.z > car.position.z + 10) {
                scene.remove(obstacle);
                questionObstacles.splice(index, 1);
            } else if (
                !gameState.questionActive &&
                gameState.questionCooldown <= 0 &&
                Math.abs(obstacle.position.z - car.position.z) < 3 &&
                Math.abs(obstacle.position.x - car.position.x) < 3
            ) {
                showQuestion();
                scene.remove(obstacle);
                questionObstacles.splice(index, 1);
            }
        });

        updateUI();
    }

    // Camera follow
    camera.position.x = car.position.x;
    camera.position.z = car.position.z + 10;
    camera.position.y = car.position.y + 5;
    camera.lookAt(car.position);

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
