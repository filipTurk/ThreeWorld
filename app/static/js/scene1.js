import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );

const params = {
    threshold: 0,
    strength: 1,
    radius: 0.5,
    exposure: 1
};

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

let container, canvas;

const radius = 5;
let theta = 0;
let gama = 0;
let zeta = 0;

export default class Scene1 {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200);
        this.camera.position.set(0, 0, 20);
        this.camera.lookAt(0, 0, 0);
        this.isActive = true; // Track if the scene is active
        this.targetFov = this.camera.fov;
        this.currentFov = this.camera.fov;
        this.zoomSpeed = 0.01; // Smooth zoom speed
        this.initContainer();
        this.initBloom();
        this.initControls();
        this.setupScene();
        this.animate();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    }

    initContainer() {

        container = document.getElementById('threejs-container');
        canvas = document.getElementById('canvas');

        if (container) {

            container.remove();

            container = document.createElement('threejs-container');  
            container.id = 'threejs-container';
            document.body.appendChild(container);
            canvas = document.createElement('canvas');
            container.appendChild(canvas);
        }
        else {
            container = document.createElement('threejs-container');  
            container.id = 'threejs-container';
            document.body.appendChild(container);
            canvas = document.createElement('canvas');
            container.appendChild(canvas);
        }

        return { container, canvas };
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.maxPolarAngle = Math.PI * 0.5;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
    }

    initBloom() {

        this.renderer = new THREE.WebGLRenderer( { canvas , antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        //document.body.appendChild( this.renderer.domElement );

        const renderScene = new RenderPass(this.scene, this.camera);
        this.renderScene = renderScene;

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            params.strength,
            params.radius,
            params.threshold
        );
        this.bloomPass = bloomPass;

        const bloomComposer = new EffectComposer(this.renderer);
        bloomComposer.renderToScreen = false;
        bloomComposer.addPass(renderScene);
        bloomComposer.addPass(bloomPass);
        this.bloomComposer = bloomComposer;

        this.finalComposer = new EffectComposer(this.renderer);
        const mixPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: bloomComposer.renderTarget2.texture }
                },
                vertexShader: document.getElementById('vertexshader').textContent,
                fragmentShader: document.getElementById('fragmentshader').textContent,
            })
        );
        this.finalComposer.addPass(renderScene);
        this.finalComposer.addPass(mixPass);
        this.finalComposer.addPass(new OutputPass());
    }

    setupScene() {
        this.scene.clear();
        const geometry = new THREE.IcosahedronGeometry(0.3, 15);

        for (let i = 0; i < 100; i++) {
            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.7, Math.random() * 0.2 + 0.05);

            const material = new THREE.MeshBasicMaterial({ color: color });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.x = Math.random() * 10 - 5;
            sphere.position.y = Math.random() * 10 - 5;
            sphere.position.z = Math.random() * 10 - 5;
            sphere.position.normalize().multiplyScalar(Math.random() * 4.0 + 2.0);
            sphere.scale.setScalar(Math.random() * Math.random() + 0.5);
            this.scene.add(sphere);

            if (Math.random() < 1) sphere.layers.enable(BLOOM_SCENE);
        }
    }

    animate() {
        if (!this.isActive) return; // Stop animation if the scene is inactive
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.updateZoom(); 
        this.render();
    }

    render() {
        theta += 0.1;
        gama += 0.131
        zeta += 0.122;
        this.camera.position.x = radius * Math.sin( THREE.MathUtils.degToRad( theta ) );
        this.camera.position.y = radius * Math.sin( THREE.MathUtils.degToRad( gama ) );
        this.camera.position.z = radius * Math.cos( THREE.MathUtils.degToRad( zeta ) );
        this.camera.lookAt( this.scene.position );

        this.scene.traverse(this.darkenNonBloomed.bind(this));
        this.bloomComposer.render();
        this.scene.traverse(this.restoreMaterial.bind(this));
        this.finalComposer.render();
    }

    darkenNonBloomed(obj) {
        if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
            materials[obj.uuid] = obj.material;
            obj.material = darkMaterial;
        }
    }

    restoreMaterial(obj) {
        if (materials[obj.uuid]) {
            obj.material = materials[obj.uuid];
            delete materials[obj.uuid];
        }
    }

    onPointerDown(event) {
        const mouse = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, false);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            object.layers.toggle(BLOOM_SCENE);
            this.render();
        }
    }

    onLightsOff() {
        // Iterate through all children in the scene
        this.scene.traverse((object) => {
            if (object.isMesh) {
                // Turn off bloom effect by removing the object from the BLOOM_SCENE layer
                object.layers.disable(BLOOM_SCENE);
            }
        });
    
        // Re-render the scene to apply changes
        this.render();
    }

    onLightsOn() {
        // Iterate through all children in the scene
        this.scene.traverse((object) => {
            if (object.isMesh) {
                // Turn on bloom effect by adding the object to the BLOOM_SCENE layer
                object.layers.enable(BLOOM_SCENE);
            }
        });
    
        // Re-render the scene to apply changes
        this.render();
    }

    onTurnIntersectsOff(x, y, z) {
        const finger = new THREE.Vector3(x, y, z);
    
        const direction = new THREE.Vector3()
            .subVectors(finger, this.camera.position)
            .normalize();
        
        const randomColor = Math.random() * 0xffffff;

        const arrowHelper = new THREE.ArrowHelper(
            direction,            
            this.camera.position,
            50,                  
            randomColor              
        );
        this.scene.add(arrowHelper);
    
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, direction);
        raycaster.far = 100; 
        const intersects = raycaster.intersectObjects(this.scene.children, false);
    
        if (intersects.length > 0) {
            console.log("Intersect found:", intersects[0]);
            const object = intersects[0].object;
    
 
            object.layers.disable(BLOOM_SCENE);
            this.render(); 
        }
    }
    
    

    onTurnIntersectsOn(x, y, z) {
        const finger = new THREE.Vector3(x, y, z);
    
        const direction = new THREE.Vector3()
            .subVectors(finger, this.camera.position)
            .normalize();
    
        let randomColor = Math.random() * 0xffffff;

        const arrowHelper = new THREE.ArrowHelper(
            direction,            
            this.camera.position, 
            50,                   
            randomColor             
        );
        this.scene.add(arrowHelper);
    

        const raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, direction);
        raycaster.far = 100; 
        const intersects = raycaster.intersectObjects(this.scene.children, false);
    
        if (intersects.length > 0) {
            console.log("Intersect found:", intersects[0]);
            const object = intersects[0].object;
    
 
            object.layers.enable(BLOOM_SCENE);
            this.render(); 
        }
    }
    
    
    removeAllArrowHelpers() {

        this.scene.children = this.scene.children.filter(child => {
 
            if (child instanceof THREE.ArrowHelper) {
                this.scene.remove(child); 
                return false; 
            }
            return true; 
        });
        
        this.render(); 
    }

    zoomIn() {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.targetFov = Math.max(5, this.targetFov - 5); 
        } else {
            this.camera.position.z -= 0.1; 
        }
        this.render();
    }
    
    zoomOut() {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.targetFov = Math.min(100, this.targetFov + 5); 
        } else {
            this.camera.position.z += 0.1; 
        }
        this.render();
    }
    
    updateZoom() {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, this.zoomSpeed);
            this.camera.fov = this.currentFov;
            this.camera.updateProjectionMatrix();
        }
        
        
        if (this.camera instanceof THREE.OrthographicCamera) {
            
        }
    
        this.render();
    }
    

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    disable() {
        this.isActive = false; 
        this.renderer.domElement.remove(); 
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }
}


