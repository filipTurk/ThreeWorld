import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LuminosityShader } from 'three/addons/shaders/LuminosityShader.js';

let container, stats;
let canvas;
let raycaster, renderer, parentTransform, sphereInter;
const pointer = new THREE.Vector2();
const radius = 1.2;


export default class Scene2 {
    constructor() {

        this.camera = null;
        this.stopCamera = false;
        this.theta = 0;
        this.gama = 0;
        this.zeta = 0;
        this.scene = new THREE.Scene();
        this.animate = this.animate.bind(this);
        this.initContainer();
        this.init();
        this.targetFov = this.camera.fov;
        this.currentFov = this.camera.fov;
        this.zoomSpeed = 0.01; // Smooth zoom speed
    }

    initContainer() {

        container = document.getElementById('threejs-container');
        canvas = document.getElementById('canvas');

        if (container) {
            console.log('container exists');
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


    init() {

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );

        this.scene.background = new THREE.Color( 0xf0f0f0 );

        const geometry = new THREE.SphereGeometry( 5 );
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

        sphereInter = new THREE.Mesh( geometry, material );
        sphereInter.visible = false;
        this.scene.add( sphereInter );

        const lineGeometry = new THREE.BufferGeometry();
        const points = [];

        const point = new THREE.Vector3();
        const direction = new THREE.Vector3();

        for ( let i = 0; i < 50; i ++ ) {

            direction.x += Math.random() - 0.5;
            direction.y += Math.random() - 0.5;
            direction.z += Math.random() - 0.5;
            direction.normalize().multiplyScalar( 10 );

            point.add( direction );
            points.push( point.x, point.y, point.z );

        }

        lineGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( points, 3 ) );

        parentTransform = new THREE.Object3D();
        parentTransform.position.x = Math.random() * 40 - 20;
        parentTransform.position.y = Math.random() * 40 - 20;
        parentTransform.position.z = Math.random() * 40 - 20;

        parentTransform.rotation.x = Math.random() * 2 * Math.PI;
        parentTransform.rotation.y = Math.random() * 2 * Math.PI;
        parentTransform.rotation.z = Math.random() * 2 * Math.PI;

        parentTransform.scale.x = Math.random() + 0.5;
        parentTransform.scale.y = Math.random() + 0.5;
        parentTransform.scale.z = Math.random() + 0.5;

        for ( let i = 0; i < 50; i ++ ) {

            let object;

            const lineMaterial = new THREE.LineBasicMaterial( { color: Math.random() * 0xffffff } );

            if ( Math.random() > 0.5 ) {

                object = new THREE.Line( lineGeometry, lineMaterial );

            } else {

                object = new THREE.LineSegments( lineGeometry, lineMaterial );

            }

            object.position.x = Math.random() * 400 - 200;
            object.position.y = Math.random() * 400 - 200;
            object.position.z = Math.random() * 400 - 200;

            object.rotation.x = Math.random() * 2 * Math.PI;
            object.rotation.y = Math.random() * 2 * Math.PI;
            object.rotation.z = Math.random() * 2 * Math.PI;

            object.scale.x = Math.random() + 0.5;
            object.scale.y = Math.random() + 0.5;
            object.scale.z = Math.random() + 0.5;

            parentTransform.add( object );

        }

        this.scene.add( parentTransform );

        raycaster = new THREE.Raycaster();
        raycaster.params.Line.threshold = 3;

        renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setAnimationLoop( this.animate );


        stats = new Stats();
        container.appendChild( stats.dom );

        document.addEventListener( 'pointermove', this.onPointerMove );


        window.addEventListener( 'resize', this.onWindowResize );

    }

    initPostProcessing() {

        this.composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.glitchPass = new GlitchPass();
        this.glitchPass.goWild = false; 
        this.composer.addPass(this.glitchPass);

        //const luminosityPass = new ShaderPass( LuminosityShader );
        //this.composer.addPass( luminosityPass );
    }

    normalGlitch() {
        this.initPostProcessing();
    }

    wildGlitch() {
        this.glitchPass.goWild = true; // Enable wild glitch
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
        this.composer.setSize(window.innerWidth, window.innerHeight);

    }

    onPointerMove( event ) {

        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    }

    render() {

        if (!this.stopCamera) {
            this.theta += 0.1;
            this.gama += 0.1;
            this.zeta += 0.1;

        }
        this.camera.position.x = radius * Math.sin( THREE.MathUtils.degToRad( this.zeta ) );
        this.camera.position.y = radius * Math.sin( THREE.MathUtils.degToRad( this.gama ) );
        this.camera.position.z = radius * Math.cos( THREE.MathUtils.degToRad( this.theta ) );
        this.camera.lookAt( this.scene.position );

        this.camera.updateMatrixWorld();

        // find intersections

        raycaster.setFromCamera( pointer, this.camera );

        const intersects = raycaster.intersectObjects( parentTransform.children, true );

        if ( intersects.length > 0 ) {

            sphereInter.visible = true;
            sphereInter.position.copy( intersects[ 0 ].point );

        } else {

            sphereInter.visible = false;

        }
        if (this.composer) {
            this.composer.render();
        }
        else {
            renderer.render( this.scene, this.camera );
        }
        //renderer.render( this.scene, this.camera );

    }

    //if scene to then scene2.animate()
    animate() {

        this.updateZoom();
        this.render();
        stats.update();

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
        // Smoothly interpolate between the current and target FOV values
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, this.zoomSpeed);
            this.camera.fov = this.currentFov;
            this.camera.updateProjectionMatrix();
        }
        

        if (this.camera instanceof THREE.OrthographicCamera) {
           
        }
    
        this.render();
    }

    cameraStop() {

        if (!this.stopCamera) {
            this.stopCamera = true;
            this.composer = null;
        }
    }

    cameraResume() {

        if (this.stopCamera) {
            this.stopCamera = false;
        }
    }



    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return renderer;
    }
}  