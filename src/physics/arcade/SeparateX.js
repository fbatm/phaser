/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2019 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var CONST = require('./const');
var GetOverlapX = require('./GetOverlapX');

/**
 * Separates two overlapping bodies on the X-axis (horizontally).
 *
 * Separation involves moving two overlapping bodies so they don't overlap anymore
 * and adjusting their velocities based on their mass. This is a core part of collision detection.
 *
 * The bodies won't be separated if there is no horizontal overlap between them, if they are static,
 * or if either one uses custom logic for its separation.
 *
 * @function Phaser.Physics.Arcade.SeparateX
 * @since 3.0.0
 *
 * @param {Phaser.Physics.Arcade.Body} body1 - The first Body to separate. This is our priority body.
 * @param {Phaser.Physics.Arcade.Body} body2 - The second Body to separate.
 * @param {boolean} overlapOnly - If `true`, the bodies will only have their overlap data set and no separation will take place.
 * @param {number} bias - A value to add to the delta value during overlap checking. Used to prevent sprite tunneling.
 *
 * @return {boolean} `true` if the two bodies overlap horizontally, otherwise `false`.
 */
var SeparateX = function (body1, body2, overlapOnly, bias)
{
    // console.log('');
    // console.log('%c frame ' + body1.world._frame + '                                                                                     ', 'background-color: orange');
    // console.log('body1:', body1.gameObject.name, 'vs body2:', body2.gameObject.name);
    // console.log('pre-GetOverlap by = body1', body1.y, 'body2', body2.y);
    // console.log('pre-GetOverlap gy = body1', body1.gameObject.y, 'body2', body2.gameObject.y);

    var collisionInfo = GetOverlapX(body1, body2, overlapOnly, bias);

    // console.log(collisionInfo);
    // console.log('post-GetOverlap by = body1', body1.y, 'body2', body2.y);
    // console.log('post-GetOverlap gy = body1', body1.gameObject.y, 'body2', body2.gameObject.y);

    var overlap = collisionInfo.overlapY;
    var leftFace = collisionInfo.face === CONST.FACING_LEFT;
    var rightFace = !leftFace;
    var intersects = collisionInfo.intersects;

    var velocity1 = body1.velocity;
    var velocity2 = body2.velocity;

    var bounce1 = body1.bounce;
    var bounce2 = body2.bounce;

    var body1Immovable = (body1.physicsType === CONST.STATIC_BODY || body1.immovable);
    var body2Immovable = (body2.physicsType === CONST.STATIC_BODY || body2.immovable);

    // console.log('body1 overlaps body2 across the', ((leftFace) ? 'left' : 'right'), 'by', overlap, 'px');

    //  Can't separate two immovable bodies, or a body with its own custom separation logic
    if (!intersects || overlapOnly || (body1Immovable && body2Immovable) || body1.customSeparateX || body2.customSeparateX)
    {
        console.log(this.world._frame, 'SeparateX aborted');

        //  return true if there was some overlap, otherwise false.
        return ((intersects && overlap !== 0) || (body1.embedded && body2.embedded));
    }

    //  Adjust their positions and velocities accordingly based on the amount of overlap
    var x1 = velocity1.x;
    var x2 = velocity2.x;

    var nx1 = x1;
    var nx2 = x2;

    //  At this point, the velocity from gravity, world rebounds, etc has been factored in.
    //  The body is moving the direction it wants to, but may be blocked and rebound.

    var moving1 = body1.movingX();
    var moving2 = body2.movingX();

    if (moving1 && moving2)
    {
        //  Neither body is immovable, so they get a new velocity based on mass
        var mass1 = body1.mass;
        var mass2 = body2.mass;

        var bnx1;
        var bnx2;

        //  We don't need costly sqrts if both masses are the same
        if (mass1 === mass2)
        {
            bnx1 = Math.abs(x2) * ((x2 > 0) ? 1 : -1);
            bnx2 = Math.abs(x1) * ((x1 > 0) ? 1 : -1);
        }
        else
        {
            bnx1 = Math.sqrt((x2 * x2 * mass2) / mass1) * ((x2 > 0) ? 1 : -1);
            bnx2 = Math.sqrt((x1 * x1 * mass1) / mass2) * ((x1 > 0) ? 1 : -1);
        }

        var avg = (bnx1 + bnx2) * 0.5;

        var nv1 = bnx1 - avg;
        var nv2 = bnx2 - avg;

        nx1 = avg + nv1 * bounce1.x;
        nx2 = avg + nv2 * bounce2.x;

        // console.log('resolution 1');
        // console.log('pre-impact v = body1', x1, 'body2', x2);
        // console.log('post-impact v = body1', nx1, 'body2', nx2);
        // console.log('pre-impact y = body1', body1.gameObject.y, 'body2', body2.gameObject.y);
        // console.log('wb = body1', body1.worldBlocked.down, 'body2', body2.worldBlocked.down);

        // console.log('avg', avg);
        // console.log('nv', nv1, nv2);
        // console.log('sqrt mult', bnx1, bnx2);
        // console.log('delta', body1.deltaY(), body2.deltaY());
    }
    else if (!moving1 && moving2)
    {
        //  Body1 is immovable, so adjust body2 speed

        if (body1.rideable)
        {
            nx2 = (leftFace) ? 1 : -1;
        }
        else
        {
            nx2 = x1 - x2 * bounce2.x;
        }

        // console.log('%cresolution 3', 'background-color: red; color: white');
        // console.log('pre-impact v = body1', x1, 'body2', x2);
        // console.log('post-impact v = body1', nx1, 'body2', nx2);
        // console.log('pre-impact by = body1', body1.y, 'body2', body2.y);
        // console.log('pre-impact gy = body1', body1.gameObject.y, 'body2', body2.gameObject.y);
        // console.log('wb = body1', body1.worldBlocked.down, 'body2', body2.worldBlocked.down);
        // console.log('sleeping? = body1', body1.sleeping, 'body2', body2.sleeping);
    }
    else if (moving1 && !moving2)
    {
        //  Body2 is immovable, so adjust body1 speed

        if (body2.rideable)
        {
            nx1 = (leftFace) ? 1 : -1;
        }
        else
        {
            nx1 = x2 - x1 * bounce1.x;
        }

        // console.log('resolution 4');
        // console.log('pre-impact v = body1', x1, 'body2', x2);
        // console.log('post-impact v = body1', nx1, 'body2', nx2);
        // console.log('pre-impact y = body1', body1.gameObject.y, 'body2', body2.gameObject.y);
        // console.log('wb = body1', body1.worldBlocked.down, 'body2', body2.worldBlocked.down);
        // console.log('sleeping? = body1', body1.sleeping, 'body2', body2.sleeping);
    }
    else
    {
        // console.log('neither moving, or both immovable');

        // console.log('resolution 5');
        // console.log('pre-impact v = body1', x1, 'body2', x2);
        // console.log('post-impact v = body1', nx1, 'body2', nx2);
        // console.log('sleeping? = body1', body1.sleeping, 'body2', body2.sleeping);

        nx1 = 0;
        nx2 = 0;
    }

    var totalA = collisionInfo.share1;
    var totalB = collisionInfo.share2;
    
    // console.log('split at', totalA, totalB, 'of', overlap);

    if (totalA === 0 && totalB === 0 && overlap !== 0)
    {
        velocity1.x = 0;
        velocity2.x = 0;

        return true;
    }

    //  Flip flop?
    var flip1 = (x1 < 0 && nx1 > 0) || (x1 > 0 && nx1 < 0);
    var flip2 = (x2 < 0 && nx2 > 0) || (x2 > 0 && nx2 < 0);

    if (!body1.sleeping && flip1 && Math.abs(nx1) < body1.minVelocity.x)
    {
        // console.log('body1 flip vel too small, zeroing');
        nx1 = 0;
    }

    if (!body2.sleeping && flip2 && Math.abs(nx2) < body2.minVelocity.x)
    {
        // console.log('body2 flip vel too small, zeroing');
        nx2 = 0;
    }

    //  By this stage the bodies have their separation distance calculated (stored in totalA/B)
    //  and they have their new post-impact velocity. So now we need to  work out block state based on direction.

    if (nx1 !== 0)
    {
        //  nx1 < 0 = Body1 is moving LEFT
        //  nx1 > 0 = Body1 is moving RIGHT

        if (leftFace)
        {
            //  The top of Body1 overlaps with the bottom of Body2
            if (body2.isBlockedLeft())
            {
                // console.log('nx1 < 0 topface up', body1.y);
                body1.setBlockedLeft(collisionInfo, body2);
            }
            else
            {
                // console.log('nx1 < 0 topface add', body1.y);
                body1.y += body1.getMoveX(totalA);
            }
        }
        else if (rightFace)
        {
            //  The bottom of Body1 overlaps with the top of Body2
            if (body2.isBlockedRight())
            {
                // console.log('nx1 < 0 bottomface down', body1.y);
                body1.setBlockedRight(collisionInfo, body2);
            }
            else
            {
                // console.log('nx1 < 0 bottomface add', body1.y);
                body1.y += body1.getMoveX(totalA);
            }
        }

        //  If Body1 cannot move up, it doesn't matter what new velocity it has.
        if (body1.sleeping && (nx1 < 0 && body1.isBlockedLeft()) || (nx1 > 0 && body1.isBlockedRight()))
        {
            // console.log('nx1 < 0 zero sleep');
            nx1 = 0;
        }
    }
    else if (body1.moves)
    {
        //  Body1 is stationary, but is under physics control

        if (leftFace)
        {
            //  The top of Body1 overlaps with the bottom of Body2
            if (totalA !== 0 && !body1.isBlockedRight())
            {
                // console.log('body1 stationary topface add', body1.y);
                body1.y += body1.getMoveX(totalA);
            }
    
            if (body2.isBlockedLeft())
            {
                // console.log('body1 stationary topface up', body1.y);
                body1.setBlockedLeft(collisionInfo, body2);
            }
        }
        else if (rightFace)
        {
            //  The bottom of Body1 overlaps with the top of Body2
            if (totalA !== 0 && !body1.isBlockedRight())
            {
                // console.log('body1 stationary bottomface add', body1.y);
                body1.y += body1.getMoveX(totalA);
            }
    
            if (body2.isBlockedRight())
            {
                // console.log('body1 stationary bottomface down', body1.y);
                body1.setBlockedRight(collisionInfo, body2);
            }
        }
    }

    if (nx2 !== 0)
    {
        //  nx2 < 0 = Body2 is moving LEFT
        //  nx2 > 0 = Body2 is moving RIGHT

        if (leftFace)
        {
            //  The bottom of Body2 overlaps with the top of Body1
            if (body1.isBlockedRight())
            {
                // console.log('nx2 < 0 topface down', body2.y);
                body2.setBlockedRight(collisionInfo, body1);
            }
            else
            {
                // console.log('nx2 < 0 topface add', body2.y);
                body2.y += body2.getMoveX(totalB);
            }
        }
        else if (rightFace)
        {
            //  The top of Body2 overlaps with the bottom of Body1
            if (body1.isBlockedLeft())
            {
                // console.log('nx2 < 0 bottomface down', body2.y);
                body2.setBlockedLeft(collisionInfo, body1);
            }
            else
            {
                // console.log('nx2 < 0 bottomface add', body2.y);
                body2.y += body2.getMoveX(totalB);
            }
        }

        //  If Body2 cannot move up or down, it doesn't matter what new velocity it has
        if (body2.sleeping && (nx2 < 0 && body2.isBlockedLeft()) || (nx2 > 0 && body2.isBlockedRight()))
        {
            // console.log('nx2 < 0 zero sleep');
            nx2 = 0;
        }
    }
    else if (body2.moves)
    {
        //  Body2 is stationary
        if (leftFace)
        {
            //  The bottom of Body2 overlaps with the top of Body1
            if (totalB !== 0 && !body2.isBlockedRight())
            {
                // console.log('body2 stationary topface add', body2.y);
                body2.y += body2.getMoveX(totalB);
            }
    
            if (body1.isBlockedRight())
            {
                // console.log('body2 stationary topface down', body2.y);
                body2.setBlockedRight(collisionInfo, body1);
            }
        }
        else if (rightFace)
        {
            //  The top of Body2 overlaps with the bottom of Body1
            if (totalB !== 0 && !body2.isBlockedLeft())
            {
                // console.log('body2 stationary bottomface add', body2.y);
                body2.y += body2.getMoveX(totalB);
            }
    
            if (body1.isBlockedLeft())
            {
                // console.log('body2 stationary bottomface down', body2.y);
                body2.setBlockedLeft(collisionInfo, body1);
            }
        }
    }

    //  We disregard the new velocity when a Body is world blocked AND blocked by something on the opposite face

    if (body1.isBlockedX())
    {
        nx1 = 0;
    }

    if (body2.isBlockedX())
    {
        nx2 = 0;
    }

    //  Wakey, wakey?

    if (body1.sleeping)
    {
        if (Math.abs(nx1) < body1.minVelocity.x)
        {
            //  Not enough new velocity to get out of bed for
            nx1 = 0;
        }
        else
        {
            // console.log('waking body1 from', nx1, body1.prevVelocity.y);
            body1.wake();
        }
    }

    if (body2.sleeping)
    {
        if (Math.abs(nx2) < body2.minVelocity.x)
        {
            //  Not enough new velocity to get out of bed for
            nx2 = 0;
        }
        else
        {
            // console.log('waking body2 from', nx2, body2.prevVelocity.y);
            body2.wake();
        }
    }

    // console.log('SepX End', nx1, nx2);

    velocity1.x = nx1;
    velocity2.x = nx2;

    //  If we got this far then there WAS overlap, and separation is complete, so return true
    return true;
};

module.exports = SeparateX;
