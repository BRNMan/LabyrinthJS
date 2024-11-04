import WebGL from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/capabilities/WebGL.js';
if (!WebGL.isWebGL2Available()) {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.querySelector("body").appendChild(warning);
}

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

window.addEventListener('load', _ => {
    const initializer = new Initializer();
});

export default class Initializer {
    constructor() {
        Ammo().then((AmmoLib) => {
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
            1000);
        this.camera.position.set(0, 20, 40);
        this.camera.rotation.set(-Math.PI / 8, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        document.body.appendChild(this.renderer.domElement);
    }

    createGLTF() {
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/static/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
        this.loader.load('./hole_tile.glb', (gltf) => {
            this.waitForTileLoad(gltf, 1)
        });
        this.loader.load('./blank_tile.glb', (gltf) => {
            this.waitForTileLoad(gltf, 0);
        });
    }

    waitForTileLoad(gltf, tileNum) {
        let tileMap = [
            [0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ];
        const geometry = gltf.scene.children[0].geometry;
        const material = gltf.scene.children[0].material;
        for (let i = 0; i < tileMap.length; i++) {
            for (let j = 0; j < tileMap[i].length; j++) {
                let curTile = tileMap[i][j];
                if (curTile == tileNum) {
                    this.createInstancedMeshRigidBodies(geometry, material, 1, 0, new THREE.Vector3(i * 2, 0, j * 2));
                }
            }
        }

    }

    createBall() {
        let ballRadius = 1.0;

        this.ball = new THREE.Mesh(
            new THREE.SphereGeometry(ballRadius, 14, 10),
            new THREE.MeshPhongMaterial({ color: "#5599aa" })
        );
        this.scene.add(this.ball);

        const ballShape = new Ammo.btSphereShape(ballRadius);
        ballShape.setMargin(0.05);
        let pos = new THREE.Vector3(0, 5, 0);
        let quat = new THREE.Vector4(0, 0, 0, 1);
        const ballBody = this.createRigidBody(
             this.ball,
             ballShape,
             35,
             pos,
             quat,
            new Ammo.btVector3(1,0,1));
    }

    createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {
        if (pos) {
            object.position.copy(pos);
        } else {
            pos = object.position;
        }

        if (quat) {
            object.quaternion.copy(quat);
        } else {
            quat = object.quaternion;
        }
 
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(0, 5, 0));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        physicsShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        body.setFriction(0.5);

        if (vel) {
            body.setLinearVelocity(new Ammo.btVector3(vel.x(), vel.y(), vel.z()));
        }

        if (angVel) {
            body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
        }

        object.userData.physicsBody = body;

        this.scene.add(object);
        if (mass > 0) {
            this.rigidBodies.push(object);
            // Disable deactivation
            body.setActivationState(4);
        }
        this.physicsWorld.addRigidBody(body);
        return body;
    }

    createInstancedMeshRigidBodies(geometry, material, count, mass, position) {
        const matrix = new THREE.Matrix4();
        const mesh = new THREE.InstancedMesh(geometry, material, 1);

        for (let i = 0; i < count; i++) {
            this.getPositionMatrix(matrix);
            matrix.setPosition(position);

            mesh.setMatrixAt(i, matrix);
            mesh.castShadow = true;
        }
        this.scene.add(mesh);
        let triangle,triangle_mesh = new Ammo.btTriangleMesh();
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

        let shape = new Ammo.btConvexTriangleMeshShape(triangle_mesh, true);

        geometry.verticesNeedUpdate = true;

        this.handleInstancedMesh(mesh, shape, mass, position);
    }

    getPositionMatrix(matrix) {
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        position.x = 0;
        position.y = 0;
        position.z = 0;

        rotation.x = 0;
        rotation.y = 0;
        rotation.z = 0;

        quaternion.setFromEuler(rotation);

        scale.x = scale.y = scale.z = 1;

        matrix.compose(position, quaternion, scale);
    };

    handleInstancedMesh(mesh, shape, mass, position) {
        const array = mesh.instanceMatrix.array;
        const bodies = [];

        for (let i = 0; i < mesh.count; i++) {
            const index = i * 16;

            const transform = new Ammo.btTransform();
            transform.setFromOpenGLMatrix(array.slice(index, index + 16));

            const motionState = new Ammo.btDefaultMotionState(transform);

            const localInertia = new Ammo.btVector3(0, 0, 0);
            shape.calculateLocalInertia(mass, localInertia);

            const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
            const body = new Ammo.btRigidBody(rbInfo);
            this.physicsWorld.addRigidBody(body);

            bodies.push(body);
        }
        this.meshes.push(mesh);
        this.meshMap.set(mesh, bodies);

        let index = Math.floor(Math.random() * mesh.count);
        if (mesh.isInstancedMesh) {
            const bodies = this.meshMap.get(mesh)
            const body = bodies[index]

            body.setAngularVelocity(new Ammo.btVector3(0, 0, 0))
            body.setLinearVelocity(new Ammo.btVector3(0, 0, 0))
            this.tempTransform = new Ammo.btTransform();
            this.tempTransform.setIdentity();
            body.setWorldTransform(this.tempTransform)
        }
    };

    initPhysics() {
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
        this.broadphase = new Ammo.btDbvtBroadphase();
        this.solver = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            this.dispatcher,
            this.broadphase,
            this.solver,
            this.collisionConfiguration);
        this.physicsWorld.setGravity(new Ammo.btVector3(0, - this.gravityConstant, 0));

        this.transformAux1 = new Ammo.btTransform();
        this.tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);
    }

    /**
     * World Creation
     */
    createWorld() {
        this.createLights();
        this.createGLTF();
        //createCube();
        //createGround();
        this.createBall();

    }

    createLights() {
        const ambientLight = new THREE.AmbientLight("#888888");
        this.scene.add(ambientLight);

        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(- 10, 18, 5);
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

        this.scene.add(light);
    }


    animate() {
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }

    render() {
        const deltaTime = this.clock.getDelta();
        this.updatePhysics(deltaTime);
        //updateCube(deltaTime);
        //updateBall();
        //updateGround(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updatePhysics(deltaTime) {
        // Step world
        this.physicsWorld.stepSimulation(deltaTime, 10);
        // Update objects
        for ( let i = 0; i < this.rigidBodies.length; i ++ ) {

            const objThree = this.rigidBodies[ i ];
            const objPhys = objThree.userData.physicsBody;
            const ms = objPhys.getMotionState();
            if ( ms ) {
                let transformAux1 = new Ammo.btTransform();
                ms.getWorldTransform( transformAux1 );
                const p = transformAux1.getOrigin();
                const q = transformAux1.getRotation();
                objThree.position.set( p.x(), p.y(), p.z() );
                objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

            }

        }
    }
}