import WebGL from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/capabilities/WebGL.js'; 
if (!WebGL.isWebGL2Available()) 
{ 
    const warning = WebGL.getWebGL2ErrorMessage();
    document.querySelector("body").appendChild( warning ); 
} 

import * as THREE  from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

window.addEventListener('load', _ => {
    const initializer = new Initializer();
});

export default class Initializer {
    constructor() {
        Ammo().then( ( AmmoLib ) => {
            Ammo = AmmoLib;
            this.init();
        });
    }    

    init() {
        this.clock = new THREE.Clock();
        this.controls = null;
        this.gravityConstant = 9.8;
        this.margin = 0.05;
        this.rigidBodies = [];
        this.meshes = [];
        this.meshMap = new WeakMap(); 
        this.initGraphics();
        this.initPhysics();
        this.createWorld();
        this.animate();
    }


    initGraphics() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("#bbbbbb");

        const frustumSize = 40;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera( 
            frustumSize * aspect / - 2, 
            frustumSize * aspect / 2, 
            frustumSize / 2, 
            frustumSize / - 2, 
            1, 
            1000 );
        this.camera.position.set(0,20,40);
        this.camera.rotation.set(-Math.PI/8,0,0);

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.setPixelRatio(window.devicePixelRatio);

        document.body.appendChild( this.renderer.domElement );
    }

    createGLTF() {
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/static/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
        this.loader.load('./hole_tile.glb', (gltf) => {
            const geometry = gltf.scene.children[0].geometry;
            const material = gltf.scene.children[0].material;
            this.createInstances(geometry,material,1);
        }); 
    }

    createInstances(geometry, material, count){
        const matrix = new THREE.Matrix4();
        const mesh = new THREE.InstancedMesh(geometry, material, 1);

        for(let i = 0; i < count; i++){
            this.randomizeMatrix(matrix);
            mesh.setMatrixAt(i, matrix);
            mesh.castShadow = true;

        }
        this.scene.add(mesh);
        let triangle, triangle_mesh = new Ammo.btTriangleMesh();
        //declare triangles position vectors
        let vectA = new Ammo.btVector3(0, 0, 0);
        let vectB = new Ammo.btVector3(0, 0, 0);
        let vectC = new Ammo.btVector3(0, 0, 0);

        //retrieve vertices positions from object
        let verticesPos = geometry.getAttribute('position').array
        let triangles = []
        for (let i = 0; i < verticesPos.length; i += 3) {
            triangles.push({
                x: verticesPos[i],
                y: verticesPos[i + 1],
                z: verticesPos[i + 2]
            });
        }

        for (let i = 0; i < triangles.length - 3; i += 3) {

            vectA.setX(triangles[i].x);
            vectA.setY(triangles[i].y);
            vectA.setZ(triangles[i].z);

            vectB.setX(triangles[i + 1].x);
            vectB.setY(triangles[i + 1].y);
            vectB.setZ(triangles[i + 1].z);

            vectC.setX(triangles[i + 2].x);
            vectC.setY(triangles[i + 2].y);
            vectC.setZ(triangles[i + 2].z);

            triangle_mesh.addTriangle(vectA, vectB, vectC, true);
        }
        Ammo.destroy(vectA);
        Ammo.destroy(vectB);
        Ammo.destroy(vectC);

        let shape = new Ammo.btConvexTriangleMeshShape( triangle_mesh, true);
        
        geometry.verticesNeedUpdate = true;

        this.handleInstancedMesh(mesh, shape, 1);
    }

    randomizeMatrix( matrix ) {
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        position.x = Math.random() * 5;
        position.y = Math.random() * 5;
        position.z = Math.random() * 5;

        rotation.x = 0;
        rotation.y = 0 ;
        rotation.z = 0;

        quaternion.setFromEuler( rotation );

        scale.x = scale.y = scale.z = 1;

        matrix.compose( position, quaternion, scale );
    };

    handleInstancedMesh(mesh, shape, mass){
        const array = mesh.instanceMatrix.array;
        const bodies = [];

        for(let i = 0; i < mesh.count; i++){
            const index = i * 16;
            
            const transform = new Ammo.btTransform();
            transform.setFromOpenGLMatrix(array.slice(index, index + 16));

            const motionState = new Ammo.btDefaultMotionState(transform);

            const localInertia = new Ammo.btVector3( 0, 0, 0 );
            shape.calculateLocalInertia(mass, localInertia);

            const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
            const body = new Ammo.btRigidBody( rbInfo );
            this.physicsWorld.addRigidBody( body );

            bodies.push( body );
        }
        this.meshes.push(mesh);
        this.meshMap.set(mesh, bodies);

        let index = Math.floor(Math.random() * mesh.count);
        let position = new THREE.Vector3();
        position.set(0, Math.random() + 1, 0);
        //this.setMeshPosition(mesh, position, index, Ammo)
    };

    initPhysics() {
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this.dispatcher = new Ammo.btCollisionDispatcher( this.collisionConfiguration );
        this.broadphase = new Ammo.btDbvtBroadphase();
        this.solver = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( 
            this.dispatcher, 
            this.broadphase, 
            this.solver, 
            this.collisionConfiguration );
        this.physicsWorld.setGravity( new Ammo.btVector3( 0, - this.gravityConstant, 0 ) );

        this.transformAux1 = new Ammo.btTransform();
        this.tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );
    }

    /**
     * World Creation
     */
    createWorld() {
        this.createLights();
        this.createGLTF();
        //createCube();
        //createGround();
        //createBall();

    }

    createLights() {
        const ambientLight = new THREE.AmbientLight("#888888");
        this.scene.add(ambientLight);

        const light = new THREE.DirectionalLight( 0xffffff, 2 );
        light.position.set( - 10, 18, 5 );
        light.castShadow = true;
        const d = 14;
        light.shadow.camera.left = - d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = - d;

        light.shadow.camera.near = 2;
        light.shadow.camera.far = 50;

        light.shadow.mapSize.x = 1024;
        light.shadow.mapSize.y = 1024;

        this.scene.add( light );
    }


    animate() { 
        this.render(); 
        requestAnimationFrame(this.animate.bind(this));
    } 

    render() { 
        const deltaTime = this.clock.getDelta();
        this.updatePhysics( deltaTime );
        //updateCube(deltaTime);
        //updateBall();
        //updateGround(deltaTime);
        this.renderer.render( this.scene, this.camera );
    }

    updatePhysics(deltaTime) {
        // Step world
        this.physicsWorld.stepSimulation( deltaTime, 10 );
    }
}