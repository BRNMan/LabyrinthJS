function createCube() {
    geometry = new THREE.BoxGeometry( 1, 1, 1 );
    material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );
    cube = new THREE.Mesh( geometry, material ); 
    cube.position.set(0,2,0);
    cube.castShadow = true;
    scene.add( cube ); 
}

function createGround() {
    ground = new THREE.Mesh(
        new THREE.BoxGeometry(20,1,40,1,1,1),
        new THREE.MeshPhongMaterial({color:"#5599aa"})
    );
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(20*.5, 1*.5, 40*.5));
    shape.setMargin(margin);
    ground.receiveShadow = true;
    createRigidBody(ground, shape, 100);
    ground.userData.physicsBody.setGravity(0);
    ground.userData.physicsBody.setLinearFactor(new Ammo.btVector3(0,0,0));

    wall = new THREE.Mesh
}

function createBall() {
    let ballRadius = 1.0;

    ball = new THREE.Mesh(
        new THREE.SphereGeometry( ballRadius, 14, 10 ),
        new THREE.MeshPhongMaterial({color:"#5599aa"})
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.mass=35

    const ballShape = new Ammo.btSphereShape( ballRadius );
    ballShape.setMargin( margin );
    pos.set(0,5,0,0);
    quat.set( 0, 0, 0, 1 );
    const ballBody = createRigidBody( ball, ballShape, 35, pos, quat, new THREE.Vector3(5,0,0) );

}

function createRigidBody( object, physicsShape, mass, pos, quat, vel, angVel ) {
    if ( pos ) {
        object.position.copy( pos );
    } else {
        pos = object.position;
    }

    if ( quat ) {
        object.quaternion.copy( quat );
    } else {
        quat = object.quaternion;
    }

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    const motionState = new Ammo.btDefaultMotionState( transform );

    const localInertia = new Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );

    const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    const body = new Ammo.btRigidBody( rbInfo );

    body.setFriction( 0.5 );

    if ( vel ) {
        body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) );
    }

    if ( angVel ) {
        body.setAngularVelocity( new Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );
    }
    object.userData.physicsBody = body;
    object.userData.collided = false;

    scene.add( object );
    if ( mass > 0 ) {
        rigidBodies.push( object );
        // Disable deactivation
        body.setActivationState(4);
    }
    physicsWorld.addRigidBody( body );
    return body;
}

function updateCube(deltaTime) {
    const cubeXVelocity = 1.0*Math.sin(clock.elapsedTime);
    const cubeYVelocity = 2.0*Math.sin(clock.elapsedTime*.3);
    cube.rotation.x += cubeXVelocity*deltaTime; 
    cube.rotation.y += cubeYVelocity*deltaTime;
}

function updateBall() {
    if(!ballMode) {
        pos.set(0,-20,0);
        quat.set(0,0,0,1);
        setPhysicsPosition(ball,pos,quat)
        ball.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,0,0));
    }
    else if(ball.position.y < -10) {
        pos.set(0,5,0);
        quat.set(0,0,0,1);
        setPhysicsPosition(ball,pos,quat)
    }
}

function updateGround(deltaTime) {
    let pBody = ground.userData.physicsBody;
    const yieldPoint = Math.PI/4;
    let xRot = ground.rotation.x, yRot = ground.rotation.y, zRot = ground.rotation.z;
    document.querySelector("#stats").textContent = ground.rotation.z;
}


function initInput() {
    this.renderer.domElement.addEventListener("pointerdown", function ( event ) {
        this.moveMode = !this.moveMode;
    });

    this.renderer.domElement.addEventListener("pointermove", function ( event ) {
        let text = "Hello";
        if(this.moveMode) {
            text = event.movementX;
            
        }
        document.querySelector("#stats").textContent = text;
    });

    document.querySelector("#btnBall").addEventListener("click", function (event) {
        this.ballMode = !this.ballMode;
    });
}

function setPhysicsPosition(object, pos, quat, linearVelocity, angularVelocity) {
    const transform = new Ammo.btTransform();
    transform.setIdentity();

    if ( pos ) {
        object.position.copy( pos );
        transform.setOrigin( new Ammo.btVector3( 0,5,0) );
    }

    if ( quat ) {
        object.quaternion.copy( quat );
        transform.setRotation( new Ammo.btQuaternion( 0,0,0,1) );
    } 

    const motionState = new Ammo.btDefaultMotionState( transform );
    
    ball.userData.motionState = motionState;
    ball.userData.physicsBody.setWorldTransform(transform);
    if(!linearVelocity) {
        ball.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0,0,0));
    }
    if(angularVelocity) {
        ball.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0,0,0));
    }
}

function addPhysicsRotation(object, angularVelocity) {
    let oldAngVel = object.userData.physicsBody.getAngularVelocity();
    object.userData.physicsBody.setAngularVelocity(oldAngVel + angularVelocity);
}