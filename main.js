import WebGL from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/capabilities/WebGL.js';
if (!WebGL.isWebGL2Available()) {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.querySelector("body").appendChild(warning);
}

import * as THREE from 'three'

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
        this.gravityConstant = 20 * 9.8;
        this.margin = 0.05;
        this.threePhysicsMeshes = [];
        this.meshes = [];
        this.namedMeshMap = new Map();
        this.initGraphics();
        this.initPhysics();
        this.createWorld();
        this.initInput();
        this.animate();
    }

    initInput() {
        this.keysDown = {};
        window.addEventListener("keydown", (e) => {
            this.keysDown[e.key] = true;
        });

        window.addEventListener("keyup", (e) => {
            this.keysDown[e.key] = false;
        });
    }

    isKeyDown(key) {
        return this.keysDown.hasOwnProperty(key) && this.keysDown[key];
    }

    initGraphics() {
        this.scene = new THREE.Scene();
        const texture = new THREE.TextureLoader().load( "wallcat.jpg" );
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 1, 1 );
        this.scene.background = texture;

        const frustumSize = 40;
        const aspect = window.innerWidth / window.innerHeight;
        /**this.camera = new THREE.PerspectiveCamera(

        );**/
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / - 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / - 2,
            1,
            1000);
        this.camera.position.set(0, 20, 40);
        this.camera.lookAt(new THREE.Vector3(0,0,0))

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        document.body.appendChild(this.renderer.domElement);
    }

    loadMap() {
        this.globalXOffset = -10;
        this.globalZOffset = -10;

        // Walls are numpad style
        // 8 = connect vertically
        // 4 = connect horizontally
        // 5 = connect everywhere
        let wallMap = [
            [12, 8, 8, 8, 8, 9],
            [4, 0, 0, 0, 0, 1],
            [4, 0, 0, 0, 0, 1],
            [4, 0, 2, 6, 0, 1],
            [4, 0, 0, 0, 0, 1],
            [4, 0, 0, 0, 0, 1],
            [4, 0, 0, 0, 0, 1],
            [6, 2, 2, 0, 2, 3],
        ];

        let tileMap = [
            [1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1],
        ];

        const compoundShape = new Ammo.btCompoundShape();
        const tileInnerWidth = 2.0;
        const tilePadding = .5;
        const tileSpacing = tileInnerWidth + tilePadding;
        const groundBorderSize = .5;
        const yGroundSize = tileMap.length * tileSpacing; 
        const xGroundSize = tileMap[0].length * tileSpacing;
        // Rectangle
        const rect = new THREE.Shape();
        rect.moveTo(0, 0);
        rect.lineTo(0, yGroundSize);
        rect.lineTo(xGroundSize, yGroundSize);
        rect.lineTo(xGroundSize, 0);
        rect.lineTo(0, 0);

        this.groundGroup = new THREE.Group(); 

        // Make ground/tiles
        for (let i = 0; i < tileMap.length; i++) {
            for (let j = 0; j < tileMap[i].length; j++) {
                let curTile = tileMap[i][j];
                if (curTile == 1) {
                    const holePath = new THREE.Path();
                    holePath.absarc(j * tileSpacing + tileSpacing / 2,
                        i * tileSpacing + tileSpacing / 2,
                        tileInnerWidth / 2.1,
                        0,
                        Math.PI * 2,
                        true);
                    rect.holes.push(holePath);
                }
            }
        }

        const walls = [];
        // Make walls
        for (let i = 0; i < wallMap.length; i++) {
            for (let j = 0; j < wallMap[i].length; j++) {
                let curWall = wallMap[i][j];
                if((curWall >> 2) & 1 == 1) { // Vertical Left
                    this.createWall(tileSpacing,i,j,
                        0.5,2,3,0,tileSpacing/2,
                        compoundShape);
                }
                if((curWall >> 0) & 1 == 1) { // Vertical Right
                    this.createWall(tileSpacing,i,j,
                        0.5,2,3,tileSpacing,tileSpacing/2,
                        compoundShape);
                }                                                  
                if((curWall >> 3) & 1 == 1) {// Horizontal top
                    this.createWall(tileSpacing,i,j,
                        3,2,0.5,tileSpacing/2,0,
                        compoundShape);
                }
                if((curWall >> 1) & 1 == 1) {// Horizontal bottom
                    this.createWall(tileSpacing,i,j,
                        3,2,0.5,tileSpacing/2,tileSpacing,
                        compoundShape);
                }                    
            }
        }

        // Make ground out of tiles and walls.
        const extrudeSettings = {
            depth: 2,
            steps: 1,
            bevelEnabled: false,
            curveSegments: 8
        }
        const geo = new THREE.ExtrudeGeometry(rect, extrudeSettings)
        geo.translate(this.globalXOffset,this.globalZOffset,0);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshPhongMaterial({ color: 'khaki' })
        const mesh = new THREE.Mesh(geo, mat);
        const groundShape = this.createAmmoShapeFromMesh(mesh, false);

        // Create a rigid body for the compound floor
        const mass = 10000; // Static floor, so mass is zero
        const floorTransform = new Ammo.btTransform();
        floorTransform.setIdentity();
        floorTransform.setOrigin(new Ammo.btVector3(0, 0, 0));

        compoundShape.addChildShape(floorTransform, groundShape);

        const motionState = new Ammo.btDefaultMotionState(floorTransform);
        const localInertia = new Ammo.btVector3(0, 0, 0);
        
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
        const floorBody = new Ammo.btRigidBody(rbInfo);
        floorBody.setGravity(0);
        floorBody.setLinearFactor(new Ammo.btVector3(0,0,0)); // Don't move position
        floorBody.setActivationState(4); // DISABLE_DEACTIVATION
        floorBody.setCollisionFlags(2); // KINEMATIC_OBJECT

        

        // Add floor to the physics world
        this.groundGroup.add(mesh);
        this.groundGroup.position.set(0,0,0)
        this.scene.add(this.groundGroup)
        this.namedMeshMap.set("ground", this.groundGroup);
        this.groundGroup.userData.physicsBody = floorBody;
        this.physicsWorld.addRigidBody(floorBody);
    }

    /**
     * 
     * @param {*} tileSpacing 
     * @param {*} i x position
     * @param {*} j z position
     * @param {*} x width
     * @param {*} y height
     * @param {*} z depth
     * @param {*} xOffset 
     * @param {*} zOffset 
     * @param {*} compoundShape 
     * @returns 
     */
    createWall(tileSpacing,i,j,x,y,z,xOffset,zOffset,compoundShape) {
        const geometry = new THREE.BoxGeometry(x, y, z);
        const ammoShape = this.createAmmoShapeFromBox(x, y, z);

        //geometry
        const material = new THREE.MeshPhongMaterial({ color: 0x227777 });
        const cubeMesh = new THREE.Mesh(geometry, material);
        cubeMesh.position.set(
            j * tileSpacing + xOffset + this.globalXOffset,
            0,
            i * tileSpacing + zOffset + this.globalZOffset);
        this.groundGroup.add(cubeMesh);
        if(!!compoundShape) {
            const tileTransform = new Ammo.btTransform();
            tileTransform.setIdentity();
            tileTransform.setOrigin(
                new Ammo.btVector3(cubeMesh.position.x,
                    cubeMesh.position.y,
                    cubeMesh.position.z));
            compoundShape.addChildShape(tileTransform, ammoShape)
        }
        //return this.addShapeToPhysics(cubeMesh, ammoShape, 0, compoundShape);
    }

    createGround() {

    }

    createBall() {
        let ballRadius = 0.6;

        this.ball = new THREE.Mesh(
            new THREE.SphereGeometry(ballRadius, 14, 10),
            new THREE.MeshPhongMaterial({ color: "#5599aa" })
        );
        this.scene.add(this.ball);

        const ballShape = this.createAmmoShapeFromSphere(ballRadius);
        let pos = new THREE.Vector3(0, 5, 0);
        let quat = new THREE.Vector4(0, 0, 0, 1);
        this.ball.position.set(pos.x, pos.y, pos.z);
        const body = this.addShapeToPhysics(this.ball, ballShape, 35);
        body.setLinearVelocity(new Ammo.btVector3(0, 0, 20));
    }

    createAmmoShapeFromSphere(radius) {
        const ballShape = new Ammo.btSphereShape(radius);
        ballShape.setMargin(0.01);
        return ballShape;
    }

    createAmmoShapeFromBox(x, y, z) {
        const boxShape = new Ammo.btBoxShape(new Ammo.btVector3(x/2,y/2,z/2));
        boxShape.setMargin(0.01);
        return boxShape;
    }

    createAmmoShapeFromMesh(mesh, isConvex) {
        //retrieve vertices positions from object
        let verticesPos = mesh.geometry.getAttribute('position').array
        let triangles = []
        for (let i = 0; i < verticesPos.length; i += 3) {
            triangles.push({
                x: verticesPos[i],
                y: verticesPos[i + 1],
                z: verticesPos[i + 2]
            });
        }
        let triangle, triangleMesh = new Ammo.btTriangleMesh();
        for (let i = 0; i < triangles.length - 3; i += 3) {
            triangleMesh.addTriangle(
                new Ammo.btVector3(triangles[i].x, triangles[i].y, triangles[i].z),
                new Ammo.btVector3(triangles[i + 1].x, triangles[i + 1].y, triangles[i + 1].z),
                new Ammo.btVector3(triangles[i + 2].x, triangles[i + 2].y, triangles[i + 2].z),
                false // last parameter indicates whether to compute bounding box immediately
            );
        }

        let shape = new Ammo.btConvexTriangleMeshShape(triangleMesh, true);
        if (!isConvex) {
            shape = new Ammo.btBvhTriangleMeshShape(triangleMesh);
        }
        shape.setMargin(0.01);
        shape.setLocalScaling(new Ammo.btVector3(1, 1, 1));
        return shape;

    }

    /**
     * 
     * @param {*} mesh The THREE.js mesh
     * @param {*} shape The THREE.js shape
     * @param {*} mass 
     * @param {*} name Every object can have a unique name in case you want to use it later.
     * @param {*} compoundShapeParent Optional The parent of a compound shape if applicable.
     * @returns 
     */
    addShapeToPhysics(mesh, shape, mass, name, compoundShapeParent) {
        const position = mesh.position;

        this.tempTransform = new Ammo.btTransform();
        this.tempTransform.setIdentity();
        this.tempTransform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

        const motionState = new Ammo.btDefaultMotionState(this.tempTransform);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        if (mass > 0) {
            shape.calculateLocalInertia(mass, localInertia);
        }

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        this.physicsWorld.addRigidBody(body);
        mesh.userData.name = name;
        mesh.userData.physicsBody = body;
        this.threePhysicsMeshes.push(mesh);

        return body;
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

        Ammo.btGImpactCollisionAlgorithm.prototype.registerAlgorithm(
            this.dispatcher);
    }

    /**
     * World Creation
     */
    createWorld() {
        this.createLights();
        this.loadMap();
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

    // Animation and physics
    animate() {
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }

    render() {
        const deltaTime = this.clock.getDelta();
        this.updateGround(deltaTime);
        this.updatePhysics(deltaTime);
        //updateBall();
        this.updateGround(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateGround(deltaTime) {
        let groundMesh = this.namedMeshMap.get("ground");

        let curXRotation = 0;
        let curZRotation = 0;
        if(this.isKeyDown("w") || this.isKeyDown("ArrowUp")) { 
            curXRotation = -1*deltaTime;
        } else if(this.isKeyDown("s") || this.isKeyDown("ArrowDown")) {
            curXRotation = 1*deltaTime;       
        }
        if(this.isKeyDown("a") || this.isKeyDown("ArrowLeft")) { 
            curZRotation = 1*deltaTime;
        } else if(this.isKeyDown("d") || this.isKeyDown("ArrowRight")) {
            curZRotation = -1*deltaTime;       
        }


        let tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
        let ammoTmpPos = new Ammo.btVector3(), ammoTmpQuat = new Ammo.btQuaternion();
      
        let axis = new THREE.Vector3(curXRotation,0,curZRotation).normalize();
        let point = new THREE.Vector3(10,0,10);
        groundMesh.rotateOnAxis(axis,deltaTime*Math.PI/10);

        groundMesh.getWorldPosition(tmpPos);
        groundMesh.getWorldQuaternion(tmpQuat);
    
        let physicsBody = groundMesh.userData.physicsBody;
    
        let ms = physicsBody.getMotionState();
        if ( ms ) {
            ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
            ammoTmpQuat.setValue( tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);
            
            let tmpTrans = new Ammo.btTransform();
            tmpTrans.setIdentity();
            tmpTrans.setOrigin( ammoTmpPos ); 
            tmpTrans.setRotation( ammoTmpQuat ); 
    
            ms.setWorldTransform(tmpTrans);
        }
    }

    updatePhysics(deltaTime) {
        // Step world
        this.physicsWorld.stepSimulation(deltaTime, 10);
        // Update objects
        for (let i = 0; i < this.threePhysicsMeshes.length; i++) {
            const threeMesh = this.threePhysicsMeshes[i];
            const rigidBody = threeMesh.userData.physicsBody;
            const ms = rigidBody.getMotionState();
            if (ms) {
                let tempTransform = new Ammo.btTransform();
                ms.getWorldTransform(tempTransform);
                const p = tempTransform.getOrigin();
                const q = tempTransform.getRotation();
                threeMesh.position.set(p.x(), p.y(), p.z());
                threeMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }
    }
}