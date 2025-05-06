import { rotateCamera, setUpMouseControls} from './cameraControls.js';

import * as THREE from 'three';

let container = document.getElementById('threejs-container');
let canvas = document.getElementById('canvas');

let currentScene = new THREE.Scene();
let currentCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let currentRenderer = new THREE.WebGLRenderer({ canvas });
currentRenderer.setSize(window.innerWidth, window.innerHeight);

if (!container.contains(canvas)) {
    container.appendChild(currentRenderer.domElement); 
}

let activeScene = null;
let fullSceneObjects = null

const faceMaterial = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.0002, sizeAttenuation: false, transparent: true, opacity: 0.8 });
const handMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.8 });
let facePoints, handPoints, faceLines = [];

const faceLineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true, 
});

const handLineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000, 
    transparent: true,
    opacity: 0.8,
});

let faceLineGeometry = null;
let faceLineMesh = null;
const directions = [
    new THREE.Vector3(1, 0, 0), 
    new THREE.Vector3(0, 1, 0), 
    new THREE.Vector3(0, 0, 1), 
];

let handLineGeometry = null;
let handLineMesh = null;
let leftHandPoints = null;
let rightHandPoints = null;

let leftHandLineGeometry = null;
let leftHandLineMesh = null;
let rightHandLineGeometry = null;
let rightHandLineMesh = null;


function initFaceLandmarkObjects(scene, maxLandmarks) {
    // Initialize Points
    const pointGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxLandmarks * 3);
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    facePoints = new THREE.Points(pointGeometry, faceMaterial);
    scene.add(facePoints);

    // Initialize Lines
    const linePositions = new Float32Array(maxLandmarks * directions.length * 6); // Each line has 2 points (start and end)
    const lineColors = new Float32Array(maxLandmarks * directions.length * 6); // Color for each vertex
    faceLineGeometry = new THREE.BufferGeometry();
    faceLineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    faceLineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    faceLineMesh = new THREE.LineSegments(faceLineGeometry, faceLineMaterial);
    scene.add(faceLineMesh);
}

function updateFaceLandmarks(landmarks, scene) {
    const maxLandmarks = landmarks.length;
    const pointPositions = facePoints.geometry.attributes.position.array;
    const linePositions = faceLineGeometry.attributes.position.array;
    const lineColors = faceLineGeometry.attributes.color.array;

    const lineLength = 0.005; 
    let pointIndex = 0;
    let lineIndex = 0;

    let sumX = 0, sumY = 0, sumZ = 0;

    landmarks.forEach((landmark) => {
        sumX += (landmark.x / window.innerWidth) * 2 - 1;
        sumY += -(landmark.y / window.innerHeight) * 2 + 1;
        sumZ += landmark.z;
    });
    const centerX = sumX / maxLandmarks;
    const centerY = sumY / maxLandmarks;
    const centerZ = sumZ / maxLandmarks;

    landmarks.forEach((landmark) => {
        const x = (landmark.x / window.innerWidth) * 2 - 1 - centerX;
        const y = -(landmark.y / window.innerHeight) * 2 + 1 - centerY;
        const z = landmark.z - centerZ;

        //console.log("head", x, y, z)

        pointPositions[pointIndex++] = x;
        pointPositions[pointIndex++] = y;
        pointPositions[pointIndex++] = z;

        directions.forEach((direction, dirIndex) => {
            const lineStart = new THREE.Vector3(x, y, z);
            const lineEnd = new THREE.Vector3(
                x + direction.x * lineLength,
                y + direction.y * lineLength,
                z + direction.z * lineLength
            );

            // Start point
            linePositions[lineIndex] = lineStart.x;
            lineColors[lineIndex++] = dirIndex === 0 ? 1 : 0; // Red for X
            linePositions[lineIndex] = lineStart.y;
            lineColors[lineIndex++] = dirIndex === 1 ? 1 : 0; // Green for Y
            linePositions[lineIndex] = lineStart.z;
            lineColors[lineIndex++] = dirIndex === 2 ? 1 : 0; // Blue for Z

            // End point
            linePositions[lineIndex] = lineEnd.x;
            lineColors[lineIndex++] = dirIndex === 0 ? 1 : 0;
            linePositions[lineIndex] = lineEnd.y;
            lineColors[lineIndex++] = dirIndex === 1 ? 1 : 0;
            linePositions[lineIndex] = lineEnd.z;
            lineColors[lineIndex++] = dirIndex === 2 ? 1 : 0;
        });
    });

    facePoints.geometry.attributes.position.needsUpdate = true;
    faceLineGeometry.attributes.position.needsUpdate = true;
    faceLineGeometry.attributes.color.needsUpdate = true;
}

function initHandLandmarkObjects(scene, maxLandmarks) {
    // Left hand points
    const leftGeometry = new THREE.BufferGeometry();
    const leftPositions = new Float32Array(maxLandmarks * 3);
    leftGeometry.setAttribute('position', new THREE.BufferAttribute(leftPositions, 3));
    leftHandPoints = new THREE.Points(leftGeometry, handMaterial);
    scene.add(leftHandPoints);

    // Left hand lines
    leftHandLineGeometry = new THREE.BufferGeometry();
    const leftLinePositions = new Float32Array(maxLandmarks * 6); // 2 points per line
    leftHandLineGeometry.setAttribute('position', new THREE.BufferAttribute(leftLinePositions, 3));
    leftHandLineMesh = new THREE.LineSegments(leftHandLineGeometry, handLineMaterial);
    scene.add(leftHandLineMesh);

    // Right hand points
    const rightGeometry = new THREE.BufferGeometry();
    const rightPositions = new Float32Array(maxLandmarks * 3);
    rightGeometry.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
    rightHandPoints = new THREE.Points(rightGeometry, handMaterial);
    scene.add(rightHandPoints);

    // Right hand lines
    rightHandLineGeometry = new THREE.BufferGeometry();
    const rightLinePositions = new Float32Array(maxLandmarks * 6); 
    rightHandLineGeometry.setAttribute('position', new THREE.BufferAttribute(rightLinePositions, 3));
    rightHandLineMesh = new THREE.LineSegments(rightHandLineGeometry, handLineMaterial);
    scene.add(rightHandLineMesh);
}

function updateHandLandmarks(leftHandLandmarks, rightHandLandmarks, scene, leftHandGesture, rightHandGesture) {

    if (leftHandLandmarks) {
        if (!leftHandPoints || !leftHandLineMesh) {
            initHandLandmarkObjects(scene, leftHandLandmarks.length);
        }
        let finger8 = updateSingleHandLandmarks(leftHandLandmarks, leftHandPoints, leftHandLineGeometry, scene, "Left");
        if (leftHandGesture) {
            CheckGesture(leftHandGesture, finger8, "Left");
        }
    } else {

        if (leftHandPoints) {
            scene.remove(leftHandPoints);
            leftHandPoints.geometry.dispose();
            leftHandPoints.material.dispose();
            leftHandPoints = null;
        }
        if (leftHandLineMesh) {
            scene.remove(leftHandLineMesh);
            leftHandLineMesh.geometry.dispose();
            leftHandLineMesh.material.dispose();
            leftHandLineMesh = null;
        }
    }


    if (rightHandLandmarks) {
        if (!rightHandPoints || !rightHandLineMesh) {
 
            initHandLandmarkObjects(scene, rightHandLandmarks.length);
        }
        let finger8 = updateSingleHandLandmarks(rightHandLandmarks, rightHandPoints, rightHandLineGeometry, scene, "Right");
        if (rightHandGesture) {
            
        }
    } else {

        if (rightHandPoints) {
            scene.remove(rightHandPoints);
            rightHandPoints.geometry.dispose();
            rightHandPoints.material.dispose();
            rightHandPoints = null;
        }
        if (rightHandLineMesh) {
            scene.remove(rightHandLineMesh);
            rightHandLineMesh.geometry.dispose();
            rightHandLineMesh.material.dispose();
            rightHandLineMesh = null;
        }
    }
}

//640, 360
//8-pointer finger, 4 thumb, 12 index

function updateSingleHandLandmarks(landmarks, handPoints, handLineGeometry, scene, handName) {
    const maxLandmarks = landmarks.length;
    const pointPositions = handPoints.geometry.attributes.position.array;
    const linePositions = handLineGeometry.attributes.position.array;

    let pointIndex = 0;
    let lineIndex = 0;
    let lineLength = 0.02; // Length of each axis line
    const directions = [
        new THREE.Vector3(lineLength, 0, 0), // X-axis (positive)
        new THREE.Vector3(0, lineLength, 0), // Y-axis (positive)
        new THREE.Vector3(0, 0, lineLength), // Z-axis (positive)
    ];

    // Scene scaling factors
    const sceneWidth = 1; // Adjust as needed
    const sceneHeight = 1;
    const sceneDepthScale = 1; // Adjust z scaling as needed

    // Calculate centroid for normalization
    let sumX = 0, sumY = 0, sumZ = 0;
    landmarks.forEach((landmark) => {
        sumX += (landmark.x / 640) * 2 - 1;
        sumY += -((landmark.y / 3600) * 2 - 1);
        sumZ += landmark.z; // Assuming z is already normalized or needs scaling
    });

    let centerX = sumX / maxLandmarks;
    let centerY = sumY / maxLandmarks;
    let centerZ = sumZ / maxLandmarks;

    //console.log("center of hand", centerX, centerY, centerZ)

    let offsetValue = sceneWidth / 10; 
    let offset = (handName === "Left") ? -offsetValue : offsetValue;

    let handIndex = 0;
    let finger8 = null;

    landmarks.forEach((landmark) => {
        let x = ((landmark.x / 640) * 2 - 1) * (sceneWidth / 2) - centerX;
        let y = -(((landmark.y / 360) * 2 - 1) * (sceneHeight / 2) - centerY);
        let z = (landmark.z - centerZ) * sceneDepthScale;

        //console.log("hands", x, y, z);
        handIndex++;
        if (handIndex === 8) {
            //console.log("index 8", x, y, z);
            finger8 = { x, y, z };
        }


        pointPositions[pointIndex++] = x;
        pointPositions[pointIndex++] = y;
        pointPositions[pointIndex++] = z;

        for (const direction of directions) {
            linePositions[lineIndex++] = x;
            linePositions[lineIndex++] = y;
            linePositions[lineIndex++] = z;

            linePositions[lineIndex++] = x + direction.x;
            linePositions[lineIndex++] = y + direction.y;
            linePositions[lineIndex++] = z + direction.z;
        }
    });

    handPoints.geometry.attributes.position.needsUpdate = true;
    handLineGeometry.attributes.position.needsUpdate = true;

    return finger8;
}
////////////////////////////////////////////DRAWING////////////////////////////////////////////

let isDrawing = false;
let drawLinePoints = [];
let currentLine = null;
let centerX, centerY, centerZ = null;

//["None", "Closed_Fist", "Open_Palm", "Pointing_Up", "Thumb_Down", "Thumb_Up", "Victory", "ILoveYou"]
function CheckGesture(handGesture, finger8, handName) {

    if (handName === "Left" && handGesture == "Victory" && activeScene === "scene1") {
        removeArrows();
    }

    if (handName === "Left" && handGesture == "Closed_Fist" && activeScene === "scene1") {
        lightsOff(finger8, handName);
    }

    if (handName === "Left" && handGesture == "Open_Palm" && activeScene === "scene1") {
        lightsOn(finger8, handName);
    }

    if (handName === "Left" && handGesture == "Pointing_Up" && activeScene === "scene1") {
        toogleBloom(finger8, handName);
    }

    if (handName === "Left" && handGesture == "Thumb_Up" && activeScene === "scene1") {
        zoomIn();
    }

    if (handName === "Left" && handGesture == "Thumb_Down" && activeScene === "scene1") {
        zoomOut();
    }

    if (handName === "Left" && handGesture == "Pointing_Up" && activeScene === "scene2") {
        Draw(finger8, handName);
    }

    else if (activeScene === "scene2") {
        stopDrawing(finger8, handName);
    }

    if (handName === "Left" && handGesture == "Thumb_Up" && activeScene === "scene2") {
        zoomIn();
    }

    if (handName === "Left" && handGesture == "Thumb_Down" && activeScene === "scene2") {
        zoomOut();
    }

    if (handName === "Left" && handGesture == "Open_Palm" && activeScene === "scene2") {
        cameraResume();
    }

    if (handName === "Left" && handGesture == "Closed_Fist" && activeScene === "scene2") {
        cameraStop();
    }

    if (handName === "Left" && handGesture == "Victory" && activeScene === "scene2") {
        wildGlitch();
    }

    if (handName === "Left" && handGesture == "ILoveYou" && activeScene === "scene2") {
        normalGlitch();
    }


}

function wildGlitch() {
    console.log("Wild Glitch");
    fullSceneObjects.wildGlitch();
}

function normalGlitch() {
    console.log("Normal Glitch");
    fullSceneObjects.normalGlitch();
}

function zoomIn() {
    console.log("Zooming in");
    fullSceneObjects.zoomIn();
}

function zoomOut() {
    console.log("Zooming out");
    fullSceneObjects.zoomOut();
}

function cameraStop() {
    console.log("Camera stopped");
    fullSceneObjects.cameraStop();
}

function cameraResume() {
    console.log("Camera resumed");
    fullSceneObjects.cameraResume();
}


let isLightOn = true;

function lightsOn(finger8, handName) {
    if (!isLightOn) {
        isLightOn = true;
        console.log("Lights on");
        fullSceneObjects.onLightsOn();
    }
}
function lightsOff(finger8, handName) {
    if (isLightOn) {
        isLightOn = false;
        fullSceneObjects.onLightsOff();
        console.log("Lights off");
    }
}

function toogleBloom(finger8, handName) {
    if (isLightOn){

        fullSceneObjects.onTurnIntersectsOff(finger8.x, finger8.y, finger8.z);
    }
    else {
        fullSceneObjects.onTurnIntersectsOn(finger8.x, finger8.y, finger8.z);
    }
}

function removeArrows() {
    fullSceneObjects.removeAllArrowHelpers();
}


function initNewDrawing() {
    console.log("Drawing started");
    console.log(drawLinePoints);
    const drawLinegeometry = new THREE.BufferGeometry();
    drawLinegeometry.setAttribute('position', new THREE.Float32BufferAttribute(drawLinePoints, 3));
    const drawLinematerial = new THREE.LineBasicMaterial({ color: 0x0000ff });

    currentLine = new THREE.Line(drawLinegeometry, drawLinematerial);
    currentScene.add(currentLine);

    return { drawLinePoints, currentLine };
}

let drawFactor_x = 1;
let drawFactor_y = 1;
let drawFactor_z = 1;

function Draw(finger8, handName) {
    finger8 = { x: finger8.x * drawFactor_x, y: finger8.y * drawFactor_y, z: finger8.z * drawFactor_z };

    if (isDrawing) {
        updateLine(finger8);

    } else {
        drawLinePoints = [finger8.x, finger8.y, finger8.z];
        initNewDrawing();
        isDrawing = true;
    }
    return {isDrawing};
}

function updateLine(position) {
    console.log("UpdatingLine");
    if (currentLine) {
        drawLinePoints.push(position.x, position.y, position.z);

        currentLine.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(drawLinePoints, 3)
        );

        currentLine.geometry.needsUpdate = true;
    }
}

function stopDrawing(handLandmarks, handName) {
    isDrawing = false;
    currentLine = null;
    drawLinePoints = [];
    //console.log("Drawing stopped");
    
}

////////////////////////////////////////////LIGHTING////////////////////////////////////////////

function addAmbientLight(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    ambientLight.position.set(0, 0, 0);
    scene.add(ambientLight);
}

function addLight(scene) {
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, 0, 0);
    scene.add(light);
}


//////////////////////////////////////////SCENE HANDLING//////////////////////////////////////////
function initializeScene(scene) {
    addLight(scene);
    addAmbientLight(scene);
    initFaceLandmarkObjects(scene, 468);
    initHandLandmarkObjects(scene, 21*6);
}

function updateScene(data) {
    updateSceneLandmarks(data, currentScene); 
}

function updateSceneLandmarks(data, scene) {


    if (data.face && data.face.length > 0) {
        updateFaceLandmarks(data.face, scene); 
    } else {
        updateFaceLandmarks([], scene);
    }
    if (data.hands && data.hands.length > 0) {

        let leftHandGesture = "None";
        let rightHandGesture = "None";
        const leftHandLandmarks = data.hands.filter(hand => hand.type === "Left");
        const rightHandLandmarks = data.hands.filter(hand => hand.type === "Right");

        if(data.hands[0].type === "Left")
        {
            leftHandGesture = data.gesture;
        }
        if (data.hands[0].type === "Right")
        {
            rightHandGesture = data.gesture;
            if (rightHandGesture === "Victory" && activeScene !== "scene1") {
                switchToScene1();
            }
            if (rightHandGesture === "ILoveYou" && activeScene !== "scene2") {
                switchToScene2();
        }
        }
        
        updateHandLandmarks(leftHandLandmarks, rightHandLandmarks, scene, leftHandGesture, rightHandGesture);
    } else {
        
        updateHandLandmarks(null, null, scene, null, null);
    }

}

async function loadScene(sceneName) {
    try {
        const module = await import(`./${sceneName}.js`);
        const SceneClass = module.default;
        activeScene = sceneName;
        fullSceneObjects = new SceneClass();
        return fullSceneObjects;
    } catch (error) {
        console.error(`Failed to load scene: ${sceneName}`, error);
    }
}

function switchScene(newScene) {

    if (newScene && typeof newScene.getScene === 'function') {

        currentScene = newScene.getScene(); 
        currentCamera = newScene.getCamera();
        currentRenderer = newScene.getRenderer();
        initializeScene(currentScene, currentCamera, currentRenderer);
        console.log("Switched to new scene");

    } else {
        console.error("Invalid scene passed to switchScene.");
    }
}



//////////////////////////////////////////RUN//////////////////////////////////////////
function animate() {

    requestAnimationFrame(animate);

    rotateCamera(currentCamera);

    if (currentScene) {
        currentRenderer.render(currentScene, currentCamera);
    } else {
        console.warn("currentScene is undefined or not initialized.");
    }
}


function setUpKeyControls() {
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Digit1') {
            //console.log("1 pressed");
            loadScene('scene1').then((newScene) => {
                if (newScene) {
                    switchScene(newScene);
                }
            });
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.code === 'Digit2') {
            //console.log("2 pressed");
            loadScene('scene2').then((newScene) => {
                if (newScene) {
                    switchScene(newScene);
                }
            });
        }
    });
}

function switchToScene1() {
    loadScene('scene1').then((newScene) => {
        if (newScene) {
            switchScene(newScene);
        }
    });
}

function switchToScene2() {
    loadScene('scene2').then((newScene) => {
        if (newScene) {
            switchScene(newScene);
        }
    });
}

window.addEventListener('resize', () => {
    currentRenderer.setSize(window.innerWidth, window.innerHeight);
    currentCamera.aspect = window.innerWidth / window.innerHeight;
    currentCamera.updateProjectionMatrix();
});

const socket = io.connect('http://127.0.0.1:5000');

socket.on('landmarks_data', function(data) {
    updateScene(data);
});

setUpKeyControls();
//setUpMouseControls();
initializeScene(currentScene);
animate();
