import WebGL from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/capabilities/WebGL.js'; 
if (!WebGL.isWebGL2Available()) 
{ 
    const warning = WebGL.getWebGL2ErrorMessage();
    document.querySelector("body").appendChild( warning ); 
} 

import * as THREE  from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js'

import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';

let scene, camera, renderer;
let geometry, material, cube;
let collisionConfiguration, dispatcher, broadphase, solver, physicsWorld, transformAux1, tempBtVec3_1;
let gravityConstant = 9.8;

let clock = new THREE.Clock();

Ammo().then( function ( AmmoLib ) {
    Ammo = AmmoLib;
    init();
} );

function init() {
    initGraphics();
    initPhysics();
    createObjects();
    //initInput();
}


function initGraphics() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#bbbbbb");

    const frustumSize = 5;
    const aspect = window.innerWidth / window.innerHeight;
	camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000 );
    camera.position.set(0,0,5);

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setAnimationLoop( animate );

    document.body.appendChild( renderer.domElement );
}

function initPhysics() {
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    physicsWorld.setGravity( new Ammo.btVector3( 0, - gravityConstant, 0 ) );

    transformAux1 = new Ammo.btTransform();
    tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );
}

function createObjects() {
    geometry = new THREE.BoxGeometry( 1, 1, 1 );
    material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    cube = new THREE.Mesh( geometry, material ); 
    scene.add( cube ); 
}


function animate() { 
    render();
} 

function render() {
    const deltaTime = clock.getDelta();
    updatePhysics( deltaTime );
    renderer.render( scene, camera );
}
function updatePhysics() {
    cube.rotation.x += 0.01; 
    cube.rotation.y += 0.01;
}


