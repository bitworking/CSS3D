/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.camera
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.camera
 * @class
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} perspective
 * @returns {css3d.camera}
 */
css3d.camera = (function()
{
    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {Number} perspective
     * @returns {css3d.camera}
     */
    var camera = function(x, y, z, perspective)
    {
        /**
         * Set the perspective value
         * @type {Integer}
         * @memberof! css3d.camera
         * @instance
         */ 
        this.perspective = perspective || 800;

        x = (null != x) ? x : 0;
        y = (null != y) ? y : 0;
        z = (null != z) ? z : this.perspective;

        this._view = css3d.matrix4.identity();
        this._rotation = css3d.matrix4.identity();
        this._translation = new css3d.vector3(x, y, z);
        this._isDirty = true;
    };

    camera.prototype._calcFov = function(perspective, height)
    {
	return (360 * Math.atan(height / (2 * perspective))) / Math.PI;
    }

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.vector3} axis
     * @param {Number} angle
     * @returns {css3d.camera}
     */
    camera.prototype.setRotation = function(axis, angle)
    {
        this._rotation = css3d.matrix4.rotationAxis(axis, angle);
        this._isDirty = true;
        return this;
    };
    
    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.camera}
     */
    camera.prototype.setRotationXYZ = function(x, y, z)
    {
        x = x || 0;
        y = y || 0;
        z = z || 0;
        var rotation = null;
        rotation = css3d.matrix4.rotationZ(z);
        rotation = css3d.matrix4.multiply(rotation, css3d.matrix4.rotationY(y));
        rotation = css3d.matrix4.multiply(rotation, css3d.matrix4.rotationX(x));        
        this._rotation = rotation;
        this._isDirty = true;
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.matrix4} m
     * @returns {css3d.camera}
     */
    camera.prototype.setRotationMatrix = function(m)
    {
        this._rotation = m;
        this._isDirty = true;
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.matrix4}
     */
    camera.prototype.getRotation = function()
    {
        return this._rotation;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.camera}
     */
    camera.prototype.setTranslation = function(x, y, z)
    {
        this._translation.x = x;
        this._translation.y = y;
        this._translation.z = z;
        this._isDirty = true;
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.vector3}
     */
    camera.prototype.getTranslation = function()
    {
        return this._translation;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.vector3}
     */
    camera.prototype.backVector = function()
    {        
        return css3d.matrix4.back(this._rotation).normalize();
    };
    
    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.vector3}
     */
    camera.prototype.forwardVector = function()
    {
        return css3d.matrix4.forward(this._rotation).normalize();
    };

    /**
     * Move camera forward
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {Number} steps
     * @returns {css3d.camera}
     */
    camera.prototype.forward = function(steps)
    {
        var forwardVector = this.forwardVector();
        this.setTranslation(
            this._translation.x + (forwardVector.x * steps),
            this._translation.y + (forwardVector.y * steps),
            this._translation.z + (forwardVector.z * steps)
        );
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.vector3}
     */
    camera.prototype.rightVector = function()
    {        
        return css3d.matrix4.right(this._rotation).normalize();
    };

    /**
     * Move camera left
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {Number} steps
     * @returns {css3d.camera}
     */
    camera.prototype.left = function(steps)
    {
        var rightVector = this.rightVector();
        this.setTranslation(
            this._translation.x - (rightVector.x * steps),
            this._translation.y - (rightVector.y * steps),
            this._translation.z - (rightVector.z * steps)
        );
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.vector3}
     */
    camera.prototype.upVector = function()
    {        
        return css3d.matrix4.up(this._rotation).normalize();
    };

    /**
     * Move camera up
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {Number} steps
     * @returns {css3d.camera}
     */
    camera.prototype.up = function(steps)
    {
        var upVector = this.upVector();
        this.setTranslation(
            this._translation.x + (upVector.x * steps),
            this._translation.y + (upVector.y * steps),
            this._translation.z + (upVector.z * steps)
        );
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.matrix4}
     */
    camera.prototype.getViewMatrix = function()
    {
        return this._view;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.matrix4} m
     * @returns {css3d.camera}
     */
    camera.prototype.setViewMatrix = function(m)
    {
        this._rotation = [
            m[0], m[1], m[2],  0,
            m[4], m[5], m[6],  0,
            m[8], m[9], m[10], 0,
            0,    0,    0,     1
        ];
        this.setTranslation(m[3], m[7], m[11]);
        this._isDirty = true;
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.element} element
     * @param {Number} distance
     * @returns {css3d.matrix4}
     */
    camera.prototype.getFaceElementMatrix = function(element, distance)
    {
        distance = (null == distance) ? this.perspective : distance;
        
        var pivot = element.getPivotTransformed();
        var matrix = element.getTotalRotation();

        var backVector = element.backVector();

        var x = pivot.x + (backVector.x * distance);
        var y = pivot.y + (backVector.y * distance);
        var z = pivot.z + (backVector.z * distance);

        matrix[3] = x;
        matrix[7] = y;
        matrix[11] = z;

        return matrix;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.element} element
     * @param {Number} distance
     * @returns {Function}
     */
    camera.prototype.getFaceElementLerpFunction = function(element, distance)
    {
        var viewMatrix = this.getFaceElementMatrix(element, distance);

        var fromTranslation = this.getTranslation().clone()
        var toTranslation = new css3d.vector3(viewMatrix[3], viewMatrix[7], viewMatrix[11]);
        viewMatrix[3] = 0;viewMatrix[7] = 0;viewMatrix[11] = 0;

        var fromRotation = this.getRotation();
        var toRotation = css3d.quaternion.prototype.fromMatrix4(viewMatrix);

        var self = this;

        return function(t)
        {
            self.lerp(fromTranslation, toTranslation, fromRotation, toRotation, t);
        };
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.vector3} from
     * @param {css3d.vector3} to
     * @param {Number} t
     * @returns {css3d.camera}
     */
    camera.prototype.lerpTranslation = function(from, to, t)
    {
        this.setTranslation(
            css3d.math.lerp(from.x, to.x, t),
            css3d.math.lerp(from.y, to.y, t),
            css3d.math.lerp(from.z, to.z, t)
        );
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.matrix4} fromMatrix
     * @param {css3d.quaternion} toQuaternion
     * @param {Number} t
     * @returns {css3d.camera}
     */
    camera.prototype.lerpRotation = function(fromMatrix, toQuaternion, t)
    {
        var fromQuaternion = css3d.quaternion.prototype.fromMatrix4(fromMatrix);
        var out = css3d.quaternion.prototype.slerp(fromQuaternion, toQuaternion, t);
        this.setRotationMatrix(out.toMatrix4());
        return this;
    };

    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.vector3} fromTranslation
     * @param {css3d.vector3} toTranslation
     * @param {css3d.matrix4} fromRotationMatrix
     * @param {css3d.quaternion} toQuaternion
     * @param {Number} t
     * @returns {css3d.camera}
     */
    camera.prototype.lerp = function(fromTranslation, toTranslation, fromRotationMatrix, toQuaternion, t)
    {
        if (t == null) {
            return this;
        }
        if (fromTranslation && toTranslation) {
            this.lerpTranslation(fromTranslation, toTranslation, t);
        }
        if (fromRotationMatrix && toQuaternion) {
            this.lerpRotation(fromRotationMatrix, toQuaternion, t);
        }
        return this;
    };
    
    /**
     * 
     * @memberof! css3d.camera
     * @instance
     * @param {css3d.element} element
     * @returns {css3d.camera}
     */
    camera.prototype.lookAtElement = function(element)
    {
        var lookAtMatrix = css3d.matrix4.lookAt(this.getTranslation(), element.getTranslation(), new css3d.vector3(0, -1, 0));
        this.setRotationMatrix(lookAtMatrix);
        return this;
    };

    /**
     * Build the view matrix
     * 
     * @memberof! css3d.camera
     * @instance
     * @returns {css3d.camera}
     */
    camera.prototype.update = function()
    {
        if (this._isDirty) {

            var m = this._rotation;
            
            var cameraBackVector = this.backVector();
            m[3] = this._translation.x - (cameraBackVector.x * this.perspective);
            m[7] = this._translation.y - (cameraBackVector.y * this.perspective);
            m[11] = this._translation.z - (cameraBackVector.z * this.perspective);
            
            this._view = css3d.matrix4.fastInverse(m);
           
            this._isDirty = false;
        }
        return this;
    };

    return camera;

}());