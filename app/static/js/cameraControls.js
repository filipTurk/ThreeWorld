import * as THREE from 'three';


let cameraAngleX = 0;
let cameraAngleY = 0;
let cameraDistance = 0.5; 

let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;


function rotateCamera(camera) {
   
    camera.position.x = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
    camera.position.y = cameraDistance * Math.sin(cameraAngleX);
    camera.position.z = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
    
   
    camera.lookAt(0, 0, 0);
}


function startDrag(event) {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
    event.preventDefault();
}


function dragCamera(event) {
    if (!isDragging) return;

   
    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;


    const rotationSpeed = 0.005; 
    cameraAngleY += deltaX * rotationSpeed;
    cameraAngleX += deltaY * rotationSpeed;


    cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));


    previousMouseX = event.clientX;
    previousMouseY = event.clientY;

    event.preventDefault();
}


function stopDrag(event) {
    isDragging = false;
    event.preventDefault();
}


function zoomCamera(event) {

    const zoomSpeed = 0.1;


    if (event.deltaY > 0) {
        cameraDistance += zoomSpeed; 
    } else {
        cameraDistance -= zoomSpeed; 
    }


    event.preventDefault();
}
const coordinatesDiv = document.getElementById('coordinates');


function updateMouseCoordinates(event) {

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    coordinatesDiv.textContent = `Mouse Coordinates (NDC): X: ${mouse.x.toFixed(2)}, Y: ${mouse.y.toFixed(2)}`;
}


function setUpMouseControls() {
    
    window.addEventListener('mousedown', startDrag, false);

    window.addEventListener('mousemove', (event) => {
        dragCamera(event); 
        //updateMouseCoordinates(event); // Update mouse coordinates
    }, false);

    window.addEventListener('mouseup', stopDrag, false);

    window.addEventListener('touchstart', (event) => startDrag(event.touches[0]), false);
    window.addEventListener('touchmove', (event) => dragCamera(event.touches[0]), false);
    window.addEventListener('touchend', stopDrag, false);
    window.addEventListener('wheel', zoomCamera, false); 
}

export { rotateCamera, setUpMouseControls};
