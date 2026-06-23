/**
 * Physics module wrapping CANNON-ES
 */
import * as CANNON from 'cannon-es';

const Physics = (() => {
    let world;
    const bodies = [];
    const gravityForce = 9.82;

    function init() {
        world = new CANNON.World();
        world.gravity.set(0, -gravityForce, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 8; // Slight optimization
        world.solver.tolerance = 0.15;

        const physicsMaterial = new CANNON.Material("slipperyMaterial");
        const physicsContactMaterial = new CANNON.ContactMaterial(
            physicsMaterial,
            physicsMaterial,
            {
                friction: 0.12,
                restitution: 0.15
            }
        );
        world.addContactMaterial(physicsContactMaterial);
    }

    function setGravityInverted(isInverted) {
        if (isInverted) {
            world.gravity.set(0, gravityForce, 0);
        } else {
            world.gravity.set(0, -gravityForce, 0);
        }
    }

    function createBox(x, y, z, width, height, depth, mass = 0, material = null) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: mass,
            material: material || new CANNON.Material()
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        world.addBody(body);
        bodies.push(body);
        return body;
    }

    function createSphere(x, y, z, radius, mass = 0, material = null) {
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({
            mass: mass,
            material: material || new CANNON.Material()
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        world.addBody(body);
        bodies.push(body);
        return body;
    }

    function createGround(x, y, z, orientation = new CANNON.Quaternion()) {
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.copy(orientation);
        groundBody.position.set(x, y, z);
        world.addBody(groundBody);
        bodies.push(groundBody);
        return groundBody;
    }

    function checkStaticCollision(x, z, radius = 0.8) {
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            // Only check static colliders (mass === 0) representing maze walls / buildings (group === 2)
            if (body.mass === 0 && body.collisionFilterGroup === 2) {
                const shape = body.shapes[0];
                if (shape && shape.type === CANNON.Shape.types.BOX) {
                    const halfX = shape.halfExtents.x;
                    const halfZ = shape.halfExtents.z;
                    
                    const minX = body.position.x - halfX - radius;
                    const maxX = body.position.x + halfX + radius;
                    const minZ = body.position.z - halfZ - radius;
                    const maxZ = body.position.z + halfZ + radius;
                    
                    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function removeBody(body) {
        world.removeBody(body);
        const index = bodies.indexOf(body);
        if (index > -1) {
            bodies.splice(index, 1);
        }
    }

    function step(deltaTime) {
        const timeStep = Math.min(deltaTime, 0.1);
        // Use variable timestep for perfectly smooth rendering and camera sync on all monitor refresh rates (e.g. 120Hz/144Hz/240Hz)
        world.step(timeStep);
    }

    return {
        init,
        getWorld: () => world,
        setGravityInverted,
        createBox,
        createSphere,
        createGround,
        removeBody,
        checkStaticCollision,
        step,
        gravityForce
    };
})();

export default Physics;
