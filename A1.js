// ASSIGNMENT-SPECIFIC API EXTENSION
THREE.Object3D.prototype.setMatrix = function(a) {
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
camera.position.set(10,5,10);
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

floorEnabled = false;

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

function multMat(m1, m2){
  return new THREE.Matrix4().multiplyMatrices(m1, m2);
}


function inverseMat(m){
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

function rotateMat(matrix, angle, axis){
  // Apply rotation by @angle with respect to @axis to @matrix
  // matrix: THREE.Matrix3
  // angle: float
  // axis: string "x", "y" or "z"
    return multMat(getRotationMatrix(angle, axis), matrix);

}

function rotateVec3(v, angle, axis){
  // Apply rotation by @angle with respect to @axis to vector @v
  // v: THREE.Vector3
  // angle: float
  // axis: string "x", "y" or "z"
  
  // TODO
    var m = getRotationMatrix(angle, axis);
    return v.applyMatrix4(m); // m*v
}

function rescaleMat(matrix, x, y, z){
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
    this.headRadius = 0.32;
    this.forearmRadius = 0.3;
    this.armRadius = 0.03;

    this.legRadius = 0.125;
    this.legHeight = 0.45;
    this.legBodyJointRatio = 0;

    this.lowerLegRadius = 0.125;
    this.lowerLegHeight = 0.55;
    this.lowerLegKneeJointRatio = 0.10;
    // Add parameters for parts
    // TODO

    // Animation
    this.walkDirection = new THREE.Vector3( 0, 0, 1 );

    // Material
    this.material = new THREE.MeshNormalMaterial();

    // Initial pose
    this.initialize()
  }

  initialTorsoMatrix(){
    var initialTorsoMatrix = idMat4();
    initialTorsoMatrix = translateMat(initialTorsoMatrix, 0,this.torsoHeight/2, 0);

    return initialTorsoMatrix;
  }

  initialHeadMatrix(){
    var initialHeadMatrix = idMat4();
    initialHeadMatrix = translateMat(initialHeadMatrix, 0, this.torsoHeight/2 + this.headRadius, 0);

    return initialHeadMatrix;
  }

  initialLeftArmMatrix(){
    var initialLeftArmMatrix = idMat4();
      initialLeftArmMatrix = rescaleMat(initialLeftArmMatrix, 1, 4, 1);
      initialLeftArmMatrix = translateMat(initialLeftArmMatrix, this.torsoRadius + 4*this.armRadius, this.torsoHeight/2+0.3, 0);

    return initialLeftArmMatrix;
    }

  // initialLeftForearmMatrix() {
  //   var initialLeftForearmMatrix = idMat4();
  //   initialLeftForearmMatrix = rotateMat(initialLeftForearmMatrix, 40, "x");
  //   initialLeftForearmMatrix = translateMat(initialLeftForearmMatrix, 0, 1.75, -0.6);
  //
  //
  //   return initialLeftForearmMatrix;
  // }

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

  legRescaleMatrix() {
    return rescaleMat(this.leftLegInitialMatrix, 2 * this.legRadius, this.legHeight, 2 * this.legRadius);
  }

  lowerLegRescaleMatrix() {
    return rescaleMat(this.lowerLegInitialMatrix, 2 * this.lowerLegRadius, this.lowerLegHeight, 2 * this.lowerLegRadius)
  }


  setLeg(absoluteTorsoMatrix, side) {
    var legMatrix = idMat4();
    var legInitialMatrix = idMat4();

    switch(side) {
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

    switch(side) {
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

    switch(side) {
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

    switch(side) {
      case "left":
        this.leftLowerLeg.setMatrix(absoluteScaledLowerLegMatrix);
        break;
      case "right":
        this.rightLowerLeg.setMatrix(absoluteScaledLowerLegMatrix);
        break;
    }

    return absoluteLowerLegMatrix;
  }

  initialize() {
    // Torso
    var torsoGeometry = new THREE.CubeGeometry(2*this.torsoRadius, this.torsoHeight, this.torsoRadius, 64);
    this.torso = new THREE.Mesh(torsoGeometry, this.material);

    // Head
    var headGeometry = new THREE.CubeGeometry(2*this.headRadius, this.headRadius, this.headRadius);
    this.head = new THREE.Mesh(headGeometry, this.material);

    // Left Arm
    var leftArmGeometry = new THREE.SphereGeometry( 0.15, 64, 64 );
    this.leftArm = new THREE.Mesh(leftArmGeometry, this.material);

    // Leg geometry (sphere, before scaling)
    var legGeometry = new THREE.SphereGeometry( 1, 64, 64 );

    // Left Leg
    this.leftLeg = new THREE.Mesh(legGeometry, this.material);

    // Right leg
    this.rightLeg = new THREE.Mesh(legGeometry, this.material);

    // Lower leg geometry
    var lowerLegGeometry = new THREE.SphereGeometry( 1, 64, 64 );

    // Left lower leg
    this.leftLowerLeg = new THREE.Mesh(lowerLegGeometry, this.material);

    // Right lower leg
    this.rightLowerLeg = new THREE.Mesh(lowerLegGeometry, this.material);


    // Torse transformation
    this.torsoInitialMatrix = this.initialTorsoMatrix();
    this.torsoMatrix = idMat4();
    this.torso.setMatrix(this.torsoInitialMatrix);

    // Head transformation
    this.headInitialMatrix = this.initialHeadMatrix();
    this.headMatrix = idMat4();
    var matrix = multMat(this.torsoInitialMatrix, this.headInitialMatrix);
    this.head.setMatrix(matrix);

    // Add transformations
    // left arm:
    this.leftArmInitialMatrix = this.initialLeftArmMatrix();
    this.leftArmMatrix = idMat4();
    var matrix = multMat(this.torsoMatrix, this.leftArmInitialMatrix);
    this.leftArm.setMatrix(matrix);
    // TODO

    /*/ left forearm:
    this.leftForearmInitialMatrix = this.initialLeftForearmMatrix();
    this.leftForearmMatrix = idMat4();
    var m = multMat(this.torsoMatrix, this.leftArmInitialMatrix);
    m = multMat(this.leftForearmInitialMatrix, m);
    this.leftForearm.setMatrix(m);*/

    // Left leg transformation
    this.leftLegInitialMatrix = this.initialLegMatrix();
    this.leftLegMatrix = idMat4();
    this.leftLegMatrix = translateMat(this.leftLegMatrix, this.torsoRadius/2 + this.legRadius/2, -this.torsoHeight/2, 0);

    var absoluteLeftLegMatrix = this.setLeg(this.torsoInitialMatrix, "left");

    // Right leg transformation
    this.rightLegInitialMatrix = this.initialLegMatrix();
    this.rightLegMatrix = idMat4();
    this.rightLegMatrix = translateMat(this.rightLegMatrix, -this.torsoRadius/2 - this.legRadius/2, -this.torsoHeight/2, 0);

    var absoluteRightLegMatrix = this.setLeg(this.torsoInitialMatrix, "right");

    // Lower leg transformation
    this.lowerLegInitialMatrix = this.initialLowerLegMatrix();
    this.lowerLegMatrix = idMat4();
    this.lowerLegMatrix = translateMat(this.lowerLegMatrix, 0, -this.legHeight + this.lowerLegKneeJointRatio * this.lowerLegHeight, 0);

    this.leftLowerLegMatrix = this.lowerLegMatrix;
    this.rightLowerLegMatrix = this.lowerLegMatrix;

    this.setLowerLeg(absoluteLeftLegMatrix, "left");
    this.setLowerLeg(absoluteRightLegMatrix, "right");

    // Add robot to scene
    scene.add(this.torso);
    scene.add(this.head);
    // Add parts
    // TODO
    scene.add(this.leftArm);
    // scene.add(this.leftForearm);

    scene.add(this.leftLeg);
    scene.add(this.leftLowerLeg);

    scene.add(this.rightLeg);
    scene.add(this.rightLowerLeg);
  }

  rotateTorso(angle){
    var torsoMatrix = this.torsoMatrix;

    this.torsoMatrix = idMat4();
    this.torsoMatrix = rotateMat(this.torsoMatrix, angle, "y");
    this.torsoMatrix = multMat(torsoMatrix, this.torsoMatrix);

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
    this.torso.setMatrix(absoluteTorsoMatrix);

    var relativeHeadMatrix = multMat(this.headMatrix, this.headInitialMatrix);
    var absoluteHeadMatrix = multMat(absoluteTorsoMatrix, relativeHeadMatrix);
    this.head.setMatrix(absoluteHeadMatrix);

    var relativeLeftArmMatrix = multMat(this.leftArmMatrix, this.leftArmInitialMatrix);
    var absoluteLeftArmMatrix = multMat(this.torsoMatrix, relativeLeftArmMatrix);
    this.leftArm.setMatrix(absoluteLeftArmMatrix);

    var absoluteLeftLegMatrix = this.setLeg(absoluteTorsoMatrix, "left");

    this.setLowerLeg(absoluteLeftLegMatrix, "left");

    var absoluteRightLegMatrix = this.setLeg(absoluteTorsoMatrix, "right");

    this.setLowerLeg(absoluteRightLegMatrix, "right");

    this.walkDirection = rotateVec3(this.walkDirection, angle, "y");
  }

  moveTorso(speed){
    this.torsoMatrix = translateMat(this.torsoMatrix, speed * this.walkDirection.x, speed * this.walkDirection.y, speed * this.walkDirection.z);

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);
    this.torso.setMatrix(absoluteTorsoMatrix);

    var relativeHeadMatrix = multMat(this.headMatrix, this.headInitialMatrix);
    var absoluteHeadMatrix = multMat(absoluteTorsoMatrix, relativeHeadMatrix);
    this.head.setMatrix(absoluteHeadMatrix);

    var relativeLeftArmMatrix = multMat(this.leftArmMatrix, this.leftArmInitialMatrix);
    var absoluteLeftArmMatrix = multMat(this.torsoMatrix, relativeLeftArmMatrix);
    this.leftArm.setMatrix(absoluteLeftArmMatrix);

    var absoluteLeftLegMatrix = this.setLeg(absoluteTorsoMatrix, "left");

    this.setLowerLeg(absoluteLeftLegMatrix, "left");

    var absoluteRightLegMatrix = this.setLeg(absoluteTorsoMatrix, "right");

    this.setLowerLeg(absoluteRightLegMatrix, "right");
  }

  rotateHead(angle){
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

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix)

    var absoluteLeftLegMatrix = this.setLeg(absoluteTorsoMatrix, "left");

    this.setLowerLeg(absoluteLeftLegMatrix, "left");
  }

  rotateLeftLowerLeg(angle, axis) {
    this.leftLowerLegRotationMatrix = idMat4();
    this.leftLowerLegRotationMatrix = rotateMat(this.leftLowerLegRotationMatrix, angle, axis);
    this.leftLowerLegMatrix = multMat(this.leftLowerLegMatrix, this.leftLowerLegRotationMatrix);

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);

    var absoluteLeftLegMatrix = this.setLeg(absoluteTorsoMatrix, "left");

    this.setLowerLeg(absoluteLeftLegMatrix, "left");
  }

  rotateRightLeg(angle, axis) {
    this.rightLegRotationMatrix = idMat4();
    this.rightLegRotationMatrix = rotateMat(this.rightLegRotationMatrix, angle, axis);
    this.rightLegMatrix = multMat(this.rightLegMatrix, this.rightLegRotationMatrix);

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);

    var absoluteRightLegMatrix = this.setLeg(absoluteTorsoMatrix, "right");

    this.setLowerLeg(absoluteRightLegMatrix, "right");
  }

  rotateRightLowerLeg(angle, axis) {
    this.rightLowerLegRotationMatrix = idMat4();
    this.rightLowerLegRotationMatrix = rotateMat(this.rightLowerLegRotationMatrix, angle, axis);
    this.rightLowerLegMatrix = multMat(this.rightLowerLegMatrix, this.rightLowerLegRotationMatrix);

    var absoluteTorsoMatrix = multMat(this.torsoMatrix, this.torsoInitialMatrix);

    var absoluteRightLegMatrix = this.setLeg(absoluteTorsoMatrix, "right");

    this.setLowerLeg(absoluteRightLegMatrix, "right");
  }

  look_at(point){
    // Compute and apply the correct rotation of the head and the torso for the robot to look at @point
      //TODO
  }
}

var robot = new Robot();

// LISTEN TO KEYBOARD
var keyboard = new THREEx.KeyboardState();

var selectedRobotComponent = 0;
var components = [
  "Torso",
  "Head",
  // Add parts names
  // TODO
  "Left leg",
  "Lower left leg",
  "Right leg",
  "Lower right leg"
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
  if (keyboard.pressed("e")){
    selectedRobotComponent = selectedRobotComponent + 1;

    if (selectedRobotComponent<0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    window.alert(components[selectedRobotComponent] + " selected");
  }

  // Previous element
  if (keyboard.pressed("q")){
    selectedRobotComponent = selectedRobotComponent - 1;

    if (selectedRobotComponent < 0){
      selectedRobotComponent = numberComponents - 1;
    }

    if (selectedRobotComponent >= numberComponents){
      selectedRobotComponent = 0;
    }

    window.alert(components[selectedRobotComponent] + " selected");
  }

  // UP
  if (keyboard.pressed("w")){
    switch (components[selectedRobotComponent]){
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
    }
  }

  // DOWN
  if (keyboard.pressed("s")){
    switch (components[selectedRobotComponent]){
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
    }
  }

  // LEFT
  if (keyboard.pressed("a")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.rotateTorso(0.1);
        break;
      case "Head":
        robot.rotateHead(0.1);
        break;
      // Add more cases
      // TODO
    }
  }

  // RIGHT
  if (keyboard.pressed("d")){
    switch (components[selectedRobotComponent]){
      case "Torso":
        robot.rotateTorso(-0.1);
        break;
      case "Head":
        robot.rotateHead(-0.1);
        break;
      // Add more cases
      // TODO
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
                var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
            }
        }

        updateLookAtPosition();
    }
    else{
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
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

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
