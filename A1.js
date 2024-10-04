// ASSIGNMENT-SPECIFIC API EXTENSION
THREE.Object3D.prototype.setMatrix = function (a) {
    this.matrix = a;
    this.matrix.decompose(this.position, this.quaternion, this.scale);
};

var start = Date.now();
// SETUP RENDERER AND SCENE
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff); // white background colour
document.body.appendChild(renderer.domElement);

// SETUP CAMERA
var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000); // view angle, aspect ratio, near, far
camera.position.set(10, 5, 10);
camera.lookAt(scene.position);
scene.add(camera);

// SETUP ORBIT CONTROL OF THE CAMERA
var controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;

// ADAPT TO WINDOW RESIZE
function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

// FLOOR WITH CHECKERBOARD

floorEnabled = true;

if (floorEnabled) {
    var floorTexture = new THREE.ImageUtils.loadTexture('images/tile.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.MirroredRepeatWrapping;
    floorTexture.repeat.set(4, 4);

    var floorMaterial = new THREE.MeshBasicMaterial({map: floorTexture, side: THREE.DoubleSide});
    var floorGeometry = new THREE.PlaneBufferGeometry(15, 15);
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0.0;
    scene.add(floor);
}

// TRANSFORMATIONS

function multMat(m1, m2) {
    return new THREE.Matrix4().multiplyMatrices(m1, m2);
}


function inverseMat(m) {
    return new THREE.Matrix4().getInverse(m, true);
}


function idMat4() {
    // Create Identity matrix
    // TODO
    var m = new THREE.Matrix4();
    m.set(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
    return m;
}

function translateMat(matrix, x, y, z) {
    // Apply translation [x, y, z] to @matrix
    // matrix: THREE.Matrix4
    // x, y, z: float

    var m = new THREE.Matrix4();
    m.set(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1);
    m = multMat(m, matrix);
    return m;
}

function getRotationMatrix(angle, axis) {
    var m = new THREE.Matrix4();
    switch (axis) {
        case "x": {
            m.set(
                1, 0, 0, 0,
                0, Math.cos(angle), -1 * Math.sin(angle), 0,
                0, Math.sin(angle), Math.cos(angle), 0,
                0, 0, 0, 1
            );
            break;
        }
        case "y": {
            m.set(
                Math.cos(angle), 0, Math.sin(angle), 0,
                0, 1, 0, 0,
                -1 * Math.sin(angle), 0, Math.cos(angle), 0,
                0, 0, 0, 1
            );
            break;
        }
        case "z": {
            m.set(
                Math.cos(angle), -1 * Math.sin(angle), 0, 0,
                Math.sin(angle), Math.cos(angle), 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            );
            break;
        }
    }
    return m;
}

function rotateMat(matrix, angle, axis) {
    // Apply rotation by @angle with respect to @axis to @matrix
    // matrix: THREE.Matrix3
    // angle: float
    // axis: string "x", "y" or "z"
    return multMat(getRotationMatrix(angle, axis), matrix);

}

function rotateVec3(v, angle, axis) {
    // Apply rotation by @angle with respect to @axis to vector @v
    // v: THREE.Vector3
    // angle: float
    // axis: string "x", "y" or "z"

    // TODO
    var m = getRotationMatrix(angle, axis);
    return v.applyMatrix4(m); // m*v
}

function rescaleMat(matrix, x, y, z) {
    // Apply scaling @x, @y and @z to @matrix
    // matrix: THREE.Matrix3
    // x, y, z: float

    var m = new THREE.Matrix4();
    m.set(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
    m = multMat(m, matrix);
    return m;
}

class Robot {
    constructor() {
        // Geometry
        this.torsoHeight = 1.5;
        this.torsoRadius = 0.75;
        this.torsoElevation = 0;
        this.torsoMoveDistance = 0;
        this.headRadius = 0.32;

        this.armRadius = 0.125;
        this.armLength = 0.45;
        this.armJointRatio = 0.10;

        this.forearmRadius = 0.125;
        this.forearmLength = 0.45;
        this.armForearmJointRatio = 0.10;

        this.legRadius = 0.125;
        this.legHeight = 0.45;
        this.legBodyJointRatio = 0;

        this.lowerLegRadius = 0.125;
        this.lowerLegHeight = 0.55;
        this.lowerLegKneeJointRatio = 0.10;
        // Add parameters for parts
        // TODO

        // Animation
        this.walkDirection = new THREE.Vector3(0, 0, 1);

        // Material
        this.material = new THREE.MeshNormalMaterial();

        // Initial pose
        this.initialize()
    }

    initialTorsoMatrix() {
        return idMat4();
    }

    initialHeadMatrix() {
        var initialHeadMatrix = idMat4();
        initialHeadMatrix = translateMat(initialHeadMatrix, 0, this.torsoHeight / 2 + this.headRadius, 0);

        return initialHeadMatrix;
    }

    initialArmMatrix() {
        var initialRightArmMatrix = idMat4();
        initialRightArmMatrix = translateMat(initialRightArmMatrix, 0, -this.armLength * (0.5 - this.armJointRatio), 0)

        return initialRightArmMatrix;
    }

    initialForearmMatrix() {
        var initialLeftForearmMatrix = idMat4();
        initialLeftForearmMatrix = translateMat(initialLeftForearmMatrix, 0, -this.forearmLength * (0.5 - this.armForearmJointRatio), 0);

        return initialLeftForearmMatrix;
    }

    initialLegMatrix() {
        var initialLegMatrix = idMat4();
        initialLegMatrix = translateMat(initialLegMatrix, 0, -this.legHeight * (0.5 - this.legBodyJointRatio), 0);

        return initialLegMatrix;
    }

    initialLowerLegMatrix() {
        var initialLowerLegMatrix = idMat4();
        initialLowerLegMatrix = translateMat(initialLowerLegMatrix, 0, -this.lowerLegHeight * (0.5 - this.lowerLegKneeJointRatio), 0);

        return initialLowerLegMatrix;
    }

    armRescaleMatrix() {
        return rescaleMat(this.leftArmInitialMatrix, 2 * this.armRadius, this.armLength, 2 * this.armRadius);
    }

    forearmRescaleMatrix() {
        return rescaleMat(this.forearmInitialMatrix, 2 * this.forearmRadius, this.forearmLength, 2 * this.forearmRadius)
    }

    legRescaleMatrix() {
        return rescaleMat(this.leftLegInitialMatrix, 2 * this.legRadius, this.legHeight, 2 * this.legRadius);
    }

    lowerLegRescaleMatrix() {
        return rescaleMat(this.lowerLegInitialMatrix, 2 * this.lowerLegRadius, this.lowerLegHeight, 2 * this.lowerLegRadius)
    }

    setArm(absoluteTorsoMatrix, side) {
        var armMatrix = idMat4();
        var armInitialMatrix = idMat4();


        switch (side) {
            case "left":
                armMatrix = this.leftArmMatrix;
                armInitialMatrix = this.leftArmInitialMatrix;
                break;
            case "right":
                armMatrix = this.rightArmMatrix;
                armInitialMatrix = this.rightArmInitialMatrix;
                break;
        }

        var relativeArmMatrix = multMat(armMatrix, armInitialMatrix);
        var absoluteArmMatrix = multMat(absoluteTorsoMatrix, relativeArmMatrix);

        var absoluteScaledArmMatrix = multMat(absoluteArmMatrix, this.armRescaleMatrix());

        switch (side) {
            case "left":
                this.leftArm.setMatrix(absoluteScaledArmMatrix);
                break;
            case "right":
                this.rightArm.setMatrix(absoluteScaledArmMatrix);
                break;
        }

        return absoluteArmMatrix;
    }

    setForearm(absoluteArmMatrix, side) {
        var forearmMatrix = idMat4();

        switch (side) {
            case "left":
                forearmMatrix = this.leftForearmMatrix;
                break;
            case "right":
                forearmMatrix = this.rightForearmMatrix;
                break;
        }

        var relativeForearmMatrix = multMat(forearmMatrix, this.forearmInitialMatrix);
        var absoluteForearmMatrix = multMat(absoluteArmMatrix, relativeForearmMatrix);
        var absoluteScaledForearmMatrix = multMat(absoluteForearmMatrix, this.forearmRescaleMatrix());

        switch (side) {
            case "left":
                this.leftForearm.setMatrix(absoluteScaledForearmMatrix);
                break;
            case "right":
                this.rightForearm.setMatrix(absoluteScaledForearmMatrix);
                break;
        }

        return absoluteForearmMatrix;
    }

    setLeg(absoluteTorsoMatrix, side) {
        var legMatrix = idMat4();
        var legInitialMatrix = idMat4();


        switch (side) {
            case "left":
                legMatrix = this.leftLegMatrix;
                legInitialMatrix = this.leftLegInitialMatrix;
                break;
            case "right":
                legMatrix = this.rightLegMatrix;
                legInitialMatrix = this.rightLegInitialMatrix;
                break;
        }

        var relativeLegMatrix = multMat(legMatrix, legInitialMatrix);
        var absoluteLegMatrix = multMat(absoluteTorsoMatrix, relativeLegMatrix);

        var absoluteScaledLegMatrix = multMat(absoluteLegMatrix, this.legRescaleMatrix());

        switch (side) {
            case "left":
                this.leftLeg.setMatrix(absoluteScaledLegMatrix);
                break;
            case "right":
                this.rightLeg.setMatrix(absoluteScaledLegMatrix);
                break;
        }

        return absoluteLegMatrix;
    }

    setLowerLeg(absoluteLegMatrix, side) {
        var lowerLegMatrix = idMat4();

        switch (side) {
            case "left":
                lowerLegMatrix = this.leftLowerLegMatrix;
                break;
            case "right":
                lowerLegMatrix = this.rightLowerLegMatrix;
                break;
        }

        var relativeLowerLegMatrix = multMat(lowerLegMatrix, this.lowerLegInitialMatrix);
        var absoluteLowerLegMatrix = multMat(absoluteLegMatrix, relativeLowerLegMatrix);
        var absoluteScaledLowerLegMatrix = multMat(absoluteLowerLegMatrix, this.lowerLegRescaleMatrix());

        switch (side) {
            case "left":
                this.leftLowerLeg.setMatrix(absoluteScaledLowerLegMatrix);
                break;
            case "right":
                this.rightLowerLeg.setMatrix(absoluteScaledLowerLegMatrix);
                break;
        }

        return absoluteLowerLegMatrix;
    }

    getTorsoHeightMatrix() {
        var absoluteLeftLegMatrix = multMat(this.leftLegMatrix, this.initialLegMatrix());
        var absoluteRightLegMatrix = multMat(this.rightLegMatrix, this.initialLegMatrix());

        var halfLowerLegTranslateMat = translateMat(idMat4(), 0, -this.lowerLegHeight, 0);
        var relativeLeftLowerLegMatrix = multMat(this.leftLowerLegMatrix, multMat(this.lowerLegInitialMatrix, halfLowerLegTranslateMat));
        var absoluteLeftLowerLegMatrix = multMat(absoluteLeftLegMatrix, relativeLeftLowerLegMatrix);
        var absoluteLeftLowerLegMatrixScaled = multMat(absoluteLeftLowerLegMatrix, this.lowerLegRescaleMatrix());

        var relativeRightLowerLegMatrix = multMat(this.rightLowerLegMatrix, multMat(this.lowerLegInitialMatrix, halfLowerLegTranslateMat));
        var absoluteRightLowerLegMatrix = multMat(absoluteRightLegMatrix, relativeRightLowerLegMatrix);
        var absoluteRightLowerLegMatrixScaled = multMat(absoluteRightLowerLegMatrix, this.lowerLegRescaleMatrix());

        var leftLegVector = new THREE.Vector3(0, 0, 0);
        leftLegVector.applyMatrix4(absoluteLeftLowerLegMatrixScaled);

        var rightLegVector = new THREE.Vector3(0, 0, 0);
        rightLegVector.applyMatrix4(absoluteRightLowerLegMatrixScaled);

        var elevation = -Math.min(leftLegVector.y, rightLegVector.y);
        var heightDifference = elevation - this.torsoElevation;
        this.torsoElevation += heightDifference;

        return translateMat(idMat4(), 0, heightDifference, 0);
    }

    initialize() {
        // Torso
        var torsoGeometry = new THREE.CubeGeometry(2 * this.torsoRadius, this.torsoHeight, this.torsoRadius, 64);
        this.torso = new THREE.Mesh(torsoGeometry, this.material);

        // Head
        var headGeometry = new THREE.CubeGeometry(2 * this.headRadius, this.headRadius, this.headRadius);
        this.head = new THREE.Mesh(headGeometry, this.material);

        // Left Arm
        var leftArmGeometry = new THREE.SphereGeometry(1, 64, 64);
        this.leftArm = new THREE.Mesh(leftArmGeometry, this.material);

        //right arm
        var rightArmGeometry = new THREE.SphereGeometry(1, 64, 64);
        this.rightArm = new THREE.Mesh(rightArmGeometry, this.material);

        // left forearm
        var leftForearmGeometry = new THREE.SphereGeometry(1, 64, 64);
        this.leftForearm = new THREE.Mesh(leftForearmGeometry, this.material);

        // left forearm
        var rightForearmGeometry = new THREE.SphereGeometry(1, 64, 64);
        this.rightForearm = new THREE.Mesh(rightForearmGeometry, this.material);

        // Leg geometry (sphere, before scaling)
        var legGeometry = new THREE.SphereGeometry(1, 64, 64);

        // Left Leg
        this.leftLeg = new THREE.Mesh(legGeometry, this.material);

        // Right leg
        this.rightLeg = new THREE.Mesh(legGeometry, this.material);

        // Lower leg geometry
        var lowerLegGeometry = new THREE.SphereGeometry(1, 64, 64);

        // Left lower leg
        this.leftLowerLeg = new THREE.Mesh(lowerLegGeometry, this.material);

        // Right lower leg
        this.rightLowerLeg = new THREE.Mesh(lowerLegGeometry, this.material);


        // Torso initial matrix setup
        this.torsoInitialMatrix = this.initialTorsoMatrix();
        this.torsoMatrix = idMat4();

        // Left arm matrix calculation
        this.leftArmInitialMatrix = this.initialArmMatrix();
        this.leftArmMatrix = idMat4();
        this.leftArmMatrix = translateMat(this.leftArmMatrix, -this.torsoRadius - this.armRadius*5/4, this.torsoHeight/3, 0);

        // Right arm matrix calculation
        this.rightArmInitialMatrix = this.initialArmMatrix();
        this.rightArmMatrix = idMat4();
        this.rightArmMatrix = translateMat(this.rightArmMatrix, this.torsoRadius + this.armRadius*5/4, this.torsoHeight/3, 0);

        // Forearm matrix calculation
        this.forearmInitialMatrix = this.initialForearmMatrix();
        this.forearmMatrix = idMat4();
        this.forearmMatrix = translateMat(this.forearmMatrix, 0, -this.armLength + this.armForearmJointRatio * this.forearmLength, 0);

        this.leftForearmMatrix = this.forearmMatrix;
        this.rightForearmMatrix = this.forearmMatrix;

        // Left leg matrix calculation
        this.leftLegInitialMatrix = this.initialLegMatrix();
        this.leftLegMatrix = idMat4();
        this.leftLegMatrix = translateMat(this.leftLegMatrix, this.torsoRadius/2 + this.legRadius/2, -this.torsoHeight/2, 0);

        // Right leg matrix calculation
        this.rightLegInitialMatrix = this.initialLegMatrix();
        this.rightLegMatrix = idMat4();
        this.rightLegMatrix = translateMat(this.rightLegMatrix, -this.torsoRadius/2 - this.legRadius/2, -this.torsoHeight/2, 0);

        // Lower leg matrix calculation
        this.lowerLegInitialMatrix = this.initialLowerLegMatrix();
        this.lowerLegMatrix = idMat4();
        this.lowerLegMatrix = translateMat(this.lowerLegMatrix, 0, -this.legHeight + this.lowerLegKneeJointRatio * this.lowerLegHeight, 0);

        this.leftLowerLegMatrix = this.lowerLegMatrix;
        this.rightLowerLegMatrix = this.lowerLegMatrix;

        // Torso elevation with respect to the legs
        this.torsoMatrix = multMat(this.getTorsoHeightMatrix(), this.torsoMatrix);
        this.absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
        this.torso.setMatrix(this.absoluteTorsoMatrix);

        // Head transformation
        this.headInitialMatrix = this.initialHeadMatrix();
        this.headMatrix = idMat4();
        var matrix = multMat(this.absoluteTorsoMatrix, this.headInitialMatrix);
        this.head.setMatrix(matrix);

        // Left arm transformation
        var absoluteLeftArmMatrix = this.setArm(this.absoluteTorsoMatrix, "left");

        // Right arm transformation
        var absoluteRightArmMatrix = this.setArm(this.absoluteTorsoMatrix, "right");

        // Forearm transformations

        this.setForearm(absoluteLeftArmMatrix, "left");
        this.setForearm(absoluteRightArmMatrix, "right");

        // Left leg transformation
        var absoluteLeftLegMatrix = this.setLeg(this.absoluteTorsoMatrix, "left");

        // Right leg transformation
        var absoluteRightLegMatrix = this.setLeg(this.absoluteTorsoMatrix, "right");

        // Lower leg transformations

        this.setLowerLeg(absoluteLeftLegMatrix, "left");
        this.setLowerLeg(absoluteRightLegMatrix, "right");

        // Add robot to scene
        scene.add(this.torso);
        scene.add(this.head);

        scene.add(this.leftArm);
        scene.add(this.rightArm);

        scene.add(this.leftForearm);
        scene.add(this.rightForearm);

        scene.add(this.leftLeg);
        scene.add(this.leftLowerLeg);

        scene.add(this.rightLeg);
        scene.add(this.rightLowerLeg);
    }

    updateRobot() {
        this.torsoMatrix = multMat(this.getTorsoHeightMatrix(), this.torsoMatrix);

        var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
        this.torso.setMatrix(absoluteTorsoMatrix);

        var relativeHeadMatrix = multMat(this.headMatrix, this.headInitialMatrix);
        var absoluteHeadMatrix = multMat(absoluteTorsoMatrix, relativeHeadMatrix);
        this.head.setMatrix(absoluteHeadMatrix);

        var absoluteLeftArmMatrix = this.setArm(absoluteTorsoMatrix, "left");
        this.setForearm(absoluteLeftArmMatrix, "left");
        var absoluteRightArmMatrix = this.setArm(absoluteTorsoMatrix, "right");
        this.setForearm(absoluteRightArmMatrix, "right");

        var absoluteLeftLegMatrix = this.setLeg(absoluteTorsoMatrix, "left");
        this.setLowerLeg(absoluteLeftLegMatrix, "left");
        var absoluteRightLegMatrix = this.setLeg(absoluteTorsoMatrix, "right");
        this.setLowerLeg(absoluteRightLegMatrix, "right");
    }

    rotateTorso(angle) {
        var torsoMatrix = this.torsoMatrix;

        this.torsoMatrix = idMat4();
        this.torsoMatrix = rotateMat(this.torsoMatrix, angle, "y");
        this.torsoMatrix = multMat(torsoMatrix, this.torsoMatrix);

        this.updateRobot();

        this.walkDirection = rotateVec3(this.walkDirection, angle, "y");

        console.log(this.torsoMatrix);
    }

    calculateAnimationRotationAngle(speed, value) {
        return Math.sign(speed) * -Math.PI * value;
    }

    moveTorso(speed){
        speed /= 2;

        this.torsoMatrix = translateMat(this.torsoMatrix, speed * this.walkDirection.x, speed * this.walkDirection.y, speed * this.walkDirection.z);

        var movementUnitDuration = 0.05;
        var maxWalkCycleUnits = 80;

        var addedMovementUnits = Math.floor(speed/movementUnitDuration);

        this.torsoMoveDistance += addedMovementUnits;

        this.walkCycleDistance = this.torsoMoveDistance % maxWalkCycleUnits;

        if (this.walkCycleDistance !== 0 && Math.sign(this.walkCycleDistance) === -1) {
            this.walkCycleDistance = maxWalkCycleUnits + this.walkCycleDistance;
        }

        var leftLegRotation = 0;
        var leftLowerLegRotation = 0;
        var rightLegRotation = 0;
        var rightLowerLegRotation = 0;

        if (0 <= this.walkCycleDistance && this.walkCycleDistance < 20) {
            leftLegRotation = 0.0175;
            // no leftLowerLegRotation
            rightLegRotation = -0.005;
            rightLowerLegRotation = -0.01;
        } else if (20 <= this.walkCycleDistance && this.walkCycleDistance < 40) {
            leftLegRotation = -0.01;
            leftLowerLegRotation = -0.01;
            // no rightLegRotation
            // no rightLowerLegRotation
        } else if (40 <= this.walkCycleDistance && this.walkCycleDistance < 60) {
            leftLegRotation = -0.015;
            leftLowerLegRotation = 0.015;
            rightLegRotation = 0.0125;
            rightLowerLegRotation = 0.0175;
        } else if (60 <= this.walkCycleDistance && this.walkCycleDistance < 80) {
            leftLegRotation = -(0.0175 - 0.01 - 0.015);
            leftLowerLegRotation = -(-0.01 + 0.015);
            rightLegRotation = -(-0.005 + 0.0125);
            rightLowerLegRotation = -(-0.01 + 0.0175);
        }

        var leftArmRotation;
        var leftForearmRotation;
        var rightArmRotation;
        var rightForearmRotation;

        if (20 <= this.walkCycleDistance && this.walkCycleDistance < 60) {
            leftArmRotation = -0.01;
            leftForearmRotation = -0.01;
            rightArmRotation = 0.01;
            rightForearmRotation = 0.01;
        } else {
            leftArmRotation = 0.01;
            leftForearmRotation = 0.01;
            rightArmRotation = -0.01;
            rightForearmRotation = -0.01;
        }

        this.rotateLeftLeg(this.calculateAnimationRotationAngle(speed, leftLegRotation), "x");
        this.rotateLeftLowerLeg(this.calculateAnimationRotationAngle(speed, leftLowerLegRotation), "x");
        this.rotateRightLeg(this.calculateAnimationRotationAngle(speed, rightLegRotation), "x");
        this.rotateRightLowerLeg(this.calculateAnimationRotationAngle(speed, rightLowerLegRotation), "x");

        this.rotateLeftArm(this.calculateAnimationRotationAngle(speed, leftArmRotation), "x");
        this.rotateLeftForearm(this.calculateAnimationRotationAngle(speed, leftForearmRotation), "x");
        this.rotateRightArm(this.calculateAnimationRotationAngle(speed, rightArmRotation), "x");
        this.rotateRightForearm(this.calculateAnimationRotationAngle(speed, rightForearmRotation), "x");

        this.updateRobot();
    }

    rotateHead(angle) {
        var headMatrix = this.headMatrix;

        this.headMatrix = idMat4();
        this.headMatrix = rotateMat(this.headMatrix, angle, "y");
        this.headMatrix = multMat(headMatrix, this.headMatrix);

        var matrix = multMat(this.headMatrix, this.headInitialMatrix);
        matrix = multMat(this.torsoMatrix, matrix);
        matrix = multMat(this.torsoInitialMatrix, matrix);
        this.head.setMatrix(matrix);
    }

    // Add methods for other parts
    // TODO

    rotateLeftLeg(angle, axis) {
        this.leftLegRotationMatrix = idMat4();
        this.leftLegRotationMatrix = rotateMat(this.leftLegRotationMatrix, angle, axis);
        this.leftLegMatrix = multMat(this.leftLegMatrix, this.leftLegRotationMatrix);

        this.updateRobot();
    }

    rotateLeftLowerLeg(angle, axis) {
        this.leftLowerLegRotationMatrix = idMat4();
        this.leftLowerLegRotationMatrix = rotateMat(this.leftLowerLegRotationMatrix, angle, axis);
        this.leftLowerLegMatrix = multMat(this.leftLowerLegMatrix, this.leftLowerLegRotationMatrix);

        this.updateRobot();
    }

    rotateRightLeg(angle, axis) {
        this.rightLegRotationMatrix = idMat4();
        this.rightLegRotationMatrix = rotateMat(this.rightLegRotationMatrix, angle, axis);
        this.rightLegMatrix = multMat(this.rightLegMatrix, this.rightLegRotationMatrix);

        this.updateRobot();
    }

    rotateRightLowerLeg(angle, axis) {
        this.rightLowerLegRotationMatrix = idMat4();
        this.rightLowerLegRotationMatrix = rotateMat(this.rightLowerLegRotationMatrix, angle, axis);
        this.rightLowerLegMatrix = multMat(this.rightLowerLegMatrix, this.rightLowerLegRotationMatrix);

        this.updateRobot();
    }

    rotateLeftArm(angle, axis) {
        this.leftArmRotationMatrix = idMat4();
        this.leftArmRotationMatrix = rotateMat(this.leftArmRotationMatrix, angle, axis);
        this.leftArmMatrix = multMat(this.leftArmMatrix, this.leftArmRotationMatrix);

        this.updateRobot();
    }

    rotateLeftForearm(angle, axis) {
        this.leftForearmRotationMatrix = idMat4();
        this.leftForearmRotationMatrix = rotateMat(this.leftForearmRotationMatrix, angle, axis);
        this.leftForearmMatrix = multMat(this.leftForearmMatrix, this.leftForearmRotationMatrix);

        this.updateRobot();
    }

    rotateRightArm(angle, axis) {
        this.rightArmRotationMatrix = idMat4();
        this.rightArmRotationMatrix = rotateMat(this.rightArmRotationMatrix, angle, axis);
        this.rightArmMatrix = multMat(this.rightArmMatrix, this.rightArmRotationMatrix);

        this.updateRobot();
    }

    rotateRightForearm(angle, axis) {
        this.rightForearmRotationMatrix = idMat4();
        this.rightForearmRotationMatrix = rotateMat(this.rightForearmRotationMatrix, angle, axis);
        this.rightForearmMatrix = multMat(this.rightForearmMatrix, this.rightForearmRotationMatrix);

        this.updateRobot();
    }

    dotProduct(v1, v2) {
        return ((v1.x * v2.x) + (v1.y * v2.y) + (v1.z * v2.z));
    }

    look_at(point) {
        // Compute and apply the correct rotation of the head and the torso for the robot to look at @point
        var newWalkDirection = new THREE.Vector3(point.x - this.torso.matrix.elements[12], 0, point.z - this.torso.matrix.elements[14]);
        var i = 100;
        while ((i !== 0)) {
            var d = this.dotProduct(this.walkDirection.normalize(), newWalkDirection.normalize());
            var angle = Math.acos(d)
            if (angle) { // prevents NaN
                this.rotateTorso(angle);
            }
            newWalkDirection.set(point.x - this.torso.matrix.elements[12], 0, point.z - this.torso.matrix.elements[14]);
            i--;
        }
    }
}

var robot = new Robot();

// LISTEN TO KEYBOARD
var keyboard = new THREEx.KeyboardState();

var selectedRobotComponent = 0;
var components = [
    "Torso",
    "Head",
    "Left leg",
    "Lower left leg",
    "Right leg",
    "Lower right leg",
    "Left arm",
    "Left forearm",
    "Right arm",
    "Right forearm",
];
var numberComponents = components.length;

//MOUSE EVENTS
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var sphere = null;

document.addEventListener('mousemove', onMouseMove, false);

var isRightButtonDown = false;

function checkKeyboard() {
    // Next element
    if (keyboard.pressed("e")) {
        selectedRobotComponent = selectedRobotComponent + 1;

        if (selectedRobotComponent < 0) {
            selectedRobotComponent = numberComponents - 1;
        }

        if (selectedRobotComponent >= numberComponents) {
            selectedRobotComponent = 0;
        }

        window.alert(components[selectedRobotComponent] + " selected");
    }

    // Previous element
    if (keyboard.pressed("q")) {
        selectedRobotComponent = selectedRobotComponent - 1;

        if (selectedRobotComponent < 0) {
            selectedRobotComponent = numberComponents - 1;
        }

        if (selectedRobotComponent >= numberComponents) {
            selectedRobotComponent = 0;
        }

        window.alert(components[selectedRobotComponent] + " selected");
    }

    // UP
    if (keyboard.pressed("w")) {
        switch (components[selectedRobotComponent]) {
            case "Torso":
                robot.moveTorso(0.1);
                break;
            case "Head":
                break;
            // Add more cases
            // TODO
            case "Left leg":
                robot.rotateLeftLeg(-0.01, "x");
                break;
            case "Lower left leg":
                robot.rotateLeftLowerLeg(-0.01, "x");
                break;
            case "Right leg":
                robot.rotateRightLeg(-0.01, "x");
                break;
            case "Lower right leg":
                robot.rotateRightLowerLeg(-0.01, "x");
                break;
            case "Left arm":
                robot.rotateLeftArm(-0.01, "x");
                break;
            case "Left forearm":
                robot.rotateLeftForearm(-0.01, "x");
                break;
            case "Right arm":
                robot.rotateRightArm(-0.01, "x");
                break;
            case "Right forearm":
                robot.rotateRightForearm(-0.01, "x");
                break;
        }
    }

    // DOWN
    if (keyboard.pressed("s")) {
        switch (components[selectedRobotComponent]) {
            case "Torso":
                robot.moveTorso(-0.1);
                break;
            case "Head":
                break;
            // Add more cases
            // TODO
            case "Left leg":
                robot.rotateLeftLeg(0.01, "x");
                break;
            case "Lower left leg":
                robot.rotateLeftLowerLeg(0.01, "x");
                break;
            case "Right leg":
                robot.rotateRightLeg(0.01, "x");
                break;
            case "Lower right leg":
                robot.rotateRightLowerLeg(0.01, "x");
                break;
            case "Left arm":
                robot.rotateLeftArm(0.01, "x");
                break;
            case "Left forearm":
                robot.rotateLeftForearm(0.01, "x");
                break;
            case "Right arm":
                robot.rotateRightArm(0.01, "x");
                break;
            case "Right forearm":
                robot.rotateRightForearm(0.01, "x");
                break;
        }
    }

    // LEFT
    if (keyboard.pressed("a")) {
        switch (components[selectedRobotComponent]) {
            case "Torso":
                robot.rotateTorso(0.1);
                break;
            case "Head":
                robot.rotateHead(0.1);
                break;
            case "Left arm":
                robot.rotateLeftArm(-0.01, "z");
                break;
            case "Right arm":
                robot.rotateRightArm(-0.01, "z");
                break;
        }
    }

    // RIGHT
    if (keyboard.pressed("d")) {
        switch (components[selectedRobotComponent]) {
            case "Torso":
                robot.rotateTorso(-0.1);
                break;
            case "Head":
                robot.rotateHead(-0.1);
                break;
            case "Left arm":
                robot.rotateLeftArm(0.01, "z");
                break;
            case "Right arm":
                robot.rotateRightArm(0.01, "z");
                break;
        }
    }

    if (keyboard.pressed("f")) {
        isRightButtonDown = true;

        var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

        vector.unproject(camera);

        var dir = vector.sub(camera.position).normalize();

        raycaster.ray.origin.copy(camera.position);
        raycaster.ray.direction.copy(dir);

        var intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            if (!sphere) {
                var geometry = new THREE.SphereGeometry(0.1, 32, 32);
                var material = new THREE.MeshBasicMaterial({color: 0xff0000});
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
            }
        }

        updateLookAtPosition();
    } else {
        isRightButtonDown = false;

        if (sphere) {
            scene.remove(sphere);
            sphere.geometry.dispose();
            sphere.material.dispose();
            sphere = null;
        }
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (isRightButtonDown) {
        updateLookAtPosition();
    }
}

function updateLookAtPosition() {
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

    vector.unproject(camera);

    var dir = vector.sub(camera.position).normalize();

    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.direction.copy(dir);

    var intersects = raycaster.intersectObjects(scene.children.filter(obj => obj !== sphere), true);

    if (intersects.length > 0) {
        var intersect = intersects[0]
        sphere.position.copy(intersect.point);
        robot.look_at(intersect.point);
    }
}

// SETUP UPDATE CALL-BACK
function update() {
    checkKeyboard();
    requestAnimationFrame(update);
    renderer.render(scene, camera);
}

update();
