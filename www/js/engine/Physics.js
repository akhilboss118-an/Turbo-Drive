export class Physics {
    constructor() {
        this.gravity = -20;
        this.friction = 0.97;
        this.collisionBodies = [];
    }

    addCollisionBody(body) {
        this.collisionBodies.push(body);
    }

    removeCollisionBody(body) {
        const idx = this.collisionBodies.indexOf(body);
        if (idx >= 0) this.collisionBodies.splice(idx, 1);
    }

    update(deltaTime) {
        for (const body of this.collisionBodies) {
            if (body.isDynamic) {
                body.velocity.y += this.gravity * deltaTime;
                body.position.x += body.velocity.x * deltaTime;
                body.position.y += body.velocity.y * deltaTime;
                body.position.z += body.velocity.z * deltaTime;
                body.velocity.x *= this.friction;
                body.velocity.z *= this.friction;
                if (body.position.y < body.groundY) {
                    body.position.y = body.groundY;
                    body.velocity.y = 0;
                }
            }
        }
    }

    getCollisionResponse(aPos, aHalf, bPos, bHalf) {
        const dx = aPos.x - bPos.x;
        const dz = aPos.z - bPos.z;
        const overlapX = aHalf.x + bHalf.x - Math.abs(dx);
        const overlapZ = aHalf.z + bHalf.z - Math.abs(dz);
        if (overlapX > 0 && overlapZ > 0) {
            const pushX = Math.sign(dx) * Math.min(overlapX + 0.1, overlapX);
            const pushZ = Math.sign(dz) * Math.min(overlapZ + 0.1, overlapZ);
            if (overlapX < overlapZ) {
                return { x: pushX, z: 0, normalX: Math.sign(dx), normalZ: 0 };
            } else {
                return { x: 0, z: pushZ, normalX: 0, normalZ: Math.sign(dz) };
            }
        }
        return null;
    }

    isOnGround(entity, track) {
        const terrainY = track.getHeightAtPoint(entity.position.x, entity.position.z);
        return entity.position.y <= terrainY + 0.5 && entity.velocity.y <= 0;
    }
}
