/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.element
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.element
 * @class
 * @param {DOMElement} domElement
 * @returns {css3d.element}
 */
css3d.element = (function()
{

    /**
     * 
     * @param {DOMElement} domElement
     * @returns {css3d.element}
     */
    var element = function(domElement)
    {
        this._domElement = domElement;
        this._pivot = new css3d.vector3(0, 0, 0);
        this._world = css3d.matrix4.identity();
        this._scale = new css3d.vector3(1, 1, 1);
        this._rotation = css3d.matrix4.identity();
        this._translation = new css3d.vector3();
        this._parent = null;
        this._children = [];
        
        this._shaderElement = null;
        this._backfaceCulling = false;
        this._backfaceCullingOld = null;
        
        this._isDirty = true;
        this._isScaled = false;
        this._isRotated = false;
        this._isTranslated = false;
        this._isPivotChanged = false;
        
        /**
         * Set shading on/off
         * @type {Boolean}
         * @memberof! css3d.element
         * @instance
         */
        this.shading = true;
        this.backfaceCullingDirty = false;
        this.worldView = null;
        this.normal = new css3d.vector3(0, 0, 1);
        this.normalWorld = new css3d.vector3(0, 0, 1);
        
        /**
         * Indicates if the element inherits the scaling from an parent element.
         * @type {Boolean}
         * @memberof! css3d.element
         * @instance
         */
        this.inheritScaling = false;
        
        /**
         * Element will get centered in the container element. This makes it easier to position it in 3D space.
         * @type {Boolean}
         * @memberof! css3d.element
         * @instance
         */
        this.autoCenter = true;
        
        /**
         * Set the custom zIndex. Only used if browser doesn't support preserve-3d (IE10)
         * @type {Integer}
         * @memberof! css3d.element
         * @instance
         */
        this.zIndex = null;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Boolean} hasFilter
     * @param {DOMElement} containerElement
     * @returns {css3d.element}
     */
    element.prototype.init = function(hasFilter, containerElement)
    {
        if (!hasFilter) {
            this._createShaderElement();
        }

        if (null != this._domElement && this.autoCenter) {
            var containerWidth = containerElement.offsetWidth;
            var containerHeight = containerElement.offsetHeight;
            var elementWidth = this._domElement.offsetWidth;
            var elementHeight = this._domElement.offsetHeight;
            this._domElement.style.position = 'absolute';
            this._domElement.style.left = ((containerWidth - elementWidth) / 2) + 'px';
            this._domElement.style.top = ((containerHeight - elementHeight) / 2) + 'px';
        }

        return this;
    };

    element.prototype._createShaderElement = function()
    {
        // TODO: prevents IE10 from clicking links on element

        if (null == this._domElement) {
            return;
        }
        var shaderElement = document.createElement('div');
    	shaderElement.style.position = 'absolute';
    	shaderElement.style.top = '0';
    	shaderElement.style.left = '0';
    	shaderElement.style.width = '100%';
    	shaderElement.style.height = '100%';
        shaderElement.style.backgroundColor = '#000000';
        shaderElement.style.opacity = 0;
        // works only in safari and mozilla
        shaderElement.style.pointerEvents = 'none';
        shaderElement.className = 'css3d-shader';
        this._domElement.appendChild(shaderElement);
        this._shaderElement = shaderElement;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {DOMElement}
     */
    element.prototype.getDomElement = function()
    {
        return this._domElement;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {DOMElement}
     */
    element.prototype.getShaderElement = function()
    {
        return this._shaderElement;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {css3d.element} parent
     * @returns {css3d.element}
     */
    element.prototype.setParent = function(parent)
    {
        this._parent = parent;
        parent.addChild(this);
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {css3d.element} child
     * @returns {css3d.element}
     */
    element.prototype.addChild = function(child)
    {
        this._children.push(child);
        child._parent = this;
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {Array}
     */
    element.prototype.getChildren = function()
    {
        return this._children;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.element}
     */
    element.prototype.setChildrenDirty = function()
    {
        for (var i=0;i<this._children.length;i++) {
            this._children[i]._isDirty = true;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Boolean} value
     * @returns {css3d.element}
     */
    element.prototype.setBackfaceCulling = function(value)
    {
        this._backfaceCulling = value;
        if (value != this._backfaceCullingOld) {
            this.backfaceCullingDirty = true;
            this._backfaceCullingOld = value;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {Boolean}
     */
    element.prototype.getBackfaceCulling = function()
    {
        return this._backfaceCulling;
    }

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {Array}
     */
    element.prototype.getWorldMatrix = function()
    {
        return this._world;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.element}
     */
    element.prototype.setPivot = function(x, y, z)
    {
        this._pivot.x = x;
        this._pivot.y = y;
        this._pivot.z = z;
        if (!this._pivot.isZero()) {
            this._isPivotChanged = true;
        }
        else {
            this._isPivotChanged = false;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.getPivot = function()
    {
        return this._pivot;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.getPivotTransformed = function()
    {
        var transformed = this.getPivot().transform(this._world).toVector3();
        return transformed;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.element}
     */
    element.prototype.setScale = function(x, y, z)
    {
        this._scale.x = x;
        this._scale.y = y;
        this._scale.z = z;
        this._isDirty = true;        
        this._isScaled = (x == 1 && y == 1 && z == 1) ? false : true;
        this.setChildrenDirty();
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.getScale = function()
    {
        return this._scale;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} axis
     * @param {Number} angle
     * @returns {css3d.element}
     */
    element.prototype.setRotation = function(axis, angle)
    {
        this._isRotated = (angle == 0) ? false : true;
        if (this._isRotated) {
            this._rotation = css3d.matrix4.rotationAxis(axis, angle);
        }
        else {
            this._rotation = css3d.matrix4.identity();
        }
        this._isDirty = true;
        this.setChildrenDirty();
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.element}
     */
    element.prototype.setRotationXYZ = function(x, y, z)
    {
        x = x || 0;
        y = y || 0;
        z = z || 0;

        this._isRotated = (x == 0 && y == 0 && z == 0) ? false : true;

        var rotation = null;

        if (this._isRotated) {            
            rotation = css3d.matrix4.rotationZ(z);
            rotation = css3d.matrix4.multiply(rotation, css3d.matrix4.rotationY(y));
            rotation = css3d.matrix4.multiply(rotation, css3d.matrix4.rotationX(x));
        }
        else {
            rotation = css3d.matrix4.identity();
        }

        this._rotation = rotation;
        this._isDirty = true;
        this.setChildrenDirty();
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Array} m
     * @returns {css3d.element}
     */
    element.prototype.setRotationMatrix = function(m)
    {
        this._rotation = m;
        this._isDirty = true;
        this.setChildrenDirty();
        this._isRotated = true;        
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {Array}
     */
    element.prototype.getRotation = function()
    {
        return this._rotation;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {Array}
     */
    element.prototype.getTotalRotation = function()
    {
        var rotation = this._rotation;
        if (null != this._parent) {
            rotation = css3d.matrix4.multiply(this._parent.getTotalRotation(), rotation);
        }
        return rotation;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.element}
     */
    element.prototype.setTranslation = function(x, y, z)
    {
        this._translation.x = x;
        this._translation.y = y;
        this._translation.z = z;
        this._isDirty = true;
        this.setChildrenDirty();
        this._isTranslated = (x == 0 && y == 0 && z == 0) ? false : true;
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.getTranslation = function()
    {
        return this._translation;
    };
    
    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.getTotalTranslation = function()
    {
        return new css3d.vector3(this._world[3], this._world[7], this._world[11]);
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.backVector = function()
    {
        return css3d.matrix4.back(this._world).normalize();        
    };
    
    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.forwardVector = function()
    {
        return css3d.matrix4.forward(this._world).normalize();        
    };

    /**
     * Move forward
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} steps
     * @returns {css3d.element}
     */
    element.prototype.forward = function(steps)
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
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.rightVector = function()
    {
        return css3d.matrix4.right(this._world).normalize();
    };

    /**
     * Move left
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} steps
     * @returns {css3d.element}
     */
    element.prototype.left = function(steps)
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
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.vector3}
     */
    element.prototype.upVector = function()
    {
        return css3d.matrix4.up(this._world).normalize();
    };

    /**
     * Move up
     * 
     * @memberof! css3d.element
     * @instance
     * @param {Number} steps
     * @returns {css3d.element}
     */
    element.prototype.up = function(steps)
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
     * @memberof! css3d.element
     * @instance
     * @param {String} styleTransform
     * @param {String} styleBackfaceVisibility
     * @returns {css3d.element}
     */
    element.prototype.setMatrix = function(styleTransform, styleBackfaceVisibility)
    {
        if (null == this._domElement) {
            return this;
        }

        var m = css3d.matrix4.translation(this._translation.x, this._translation.y, this._translation.z);
        m = css3d.matrix4.multiply(m, css3d.matrix4.scale(this._scale.x, this._scale.y, this._scale.z));
        m = css3d.matrix4.multiply(m, this._rotation);

        var s = "matrix3d(";
        s += m[0].toFixed(10) + "," + m[4].toFixed(10) + "," + m[8].toFixed(10) + "," + m[12].toFixed(10) + ",";
        s += m[1].toFixed(10) + "," + m[5].toFixed(10) + "," + m[9].toFixed(10) + "," + m[13].toFixed(10) + ",";
        s += m[2].toFixed(10) + "," + m[6].toFixed(10) + "," + m[10].toFixed(10) + "," + m[14].toFixed(10) + ",";
        s += m[3].toFixed(10) + "," + m[7].toFixed(10) + "," + m[11].toFixed(10) + "," + m[15].toFixed(10);
        s += ")";

        this._domElement.style[styleTransform] = s;

        // backface culling
        var backfaceCulling = 'visible';
        if (this.getBackfaceCulling()) {
            backfaceCulling = 'hidden';
        }
        this._domElement.style[styleBackfaceVisibility] = backfaceCulling;
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {css3d.vector3} from
     * @param {css3d.vector3} to
     * @param {Number} t    0-1
     * @returns {css3d.element}
     */
    element.prototype.lerpScale = function(from, to, t)
    {
        this.setScale(
            css3d.math.lerp(from.x, to.x, t),
            css3d.math.lerp(from.y, to.y, t),
            css3d.math.lerp(from.z, to.z, t)
        );
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {css3d.vector3} from
     * @param {css3d.vector3} to
     * @param {Number} t    0-1
     * @returns {css3d.element}
     */
    element.prototype.lerpTranslation = function(from, to, t)
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
     * @memberof! css3d.element
     * @instance
     * @param {Array} fromMatrix
     * @param {css3d.quaternion} toQuaternion
     * @param {Number} t    0-1
     * @returns {css3d.element}
     */
    element.prototype.lerpRotation = function(fromMatrix, toQuaternion, t)
    {
        var fromQuaternion = css3d.quaternion.prototype.fromMatrix4(fromMatrix);
        var out = css3d.quaternion.prototype.slerp(fromQuaternion, toQuaternion, t);
        this.setRotationMatrix(out.toMatrix4());
        return this;
    };

    /**
     * 
     * @memberof! css3d.element
     * @instance
     * @param {css3d.vector3} fromScale
     * @param {css3d.vector3} toScale
     * @param {css3d.vector3} fromTranslation
     * @param {css3d.vector3} toTranslation
     * @param {Array} fromRotationMatrix
     * @param {css3d.quaternion} toQuaternion
     * @param {Number} t    0-1
     * @returns {css3d.element}
     */
    element.prototype.lerp = function(fromScale, toScale, fromTranslation, toTranslation, fromRotationMatrix, toQuaternion, t)
    {
        if (t == null) {
            return this;
        }
        if (fromScale && toScale) {
            this.lerpScale(fromScale, toScale, t);
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
     * @memberof! css3d.element
     * @instance
     * @param {css3d.vector3} toScale
     * @param {css3d.vector3} toTranslation
     * @param {css3d.quaternion} toQuaternion
     * @returns {Function}
     */
    element.prototype.getLerpFunction = function(toScale, toTranslation, toQuaternion)
    {
        var fromScale = this.getScale().clone();
        var fromTranslation = this.getTranslation().clone();
        var fromRotation = this.getRotation();

        var self = this;

        return function(t)
        {
            self.lerp(fromScale, toScale, fromTranslation, toTranslation, fromRotation, toQuaternion, t);
        };
    };

    /**
     * Build the world matrix
     * 
     * @memberof! css3d.element
     * @instance
     * @returns {css3d.element}
     */
    element.prototype.update = function()
    {
        if (this._isDirty) {
            this._world = css3d.matrix4.translation(this._translation.x, this._translation.y, this._translation.z);
            if (this._isScaled) {
                this._world = css3d.matrix4.multiply(this._world, css3d.matrix4.scale(this._scale.x, this._scale.y, this._scale.z));
            }
            if (this._isRotated) {
                if (this._isPivotChanged) {
                    this._world = css3d.matrix4.multiply(this._world, css3d.matrix4.translation(this._pivot.x, this._pivot.y, this._pivot.z));
                }
                this._world = css3d.matrix4.multiply(this._world, this._rotation);
                if (this._isPivotChanged) {
                    this._world = css3d.matrix4.multiply(this._world, css3d.matrix4.translation(-this._pivot.x, -this._pivot.y, -this._pivot.z));
                }
            }

            if (null != this._parent) {
                if (!this.inheritScaling) {
                    if (this._parent._isScaled) {
                        this._world = css3d.matrix4.multiply(
                            css3d.matrix4.scale(1/this._parent.getScale().x, 1/this._parent.getScale().y, 1/this._parent.getScale().z),
                            this._world
                        );
                    }
                }
                // TODO: condition if parent is dirty?
                this._parent.update(); // this seems to be needed if you only call engine.update().render()
                this._world = css3d.matrix4.multiply(this._parent.getWorldMatrix(), this._world);
            }
            
            // transform normal
            // isn't it always the forward vector?
            this.normalWorld = this.normal.transform(this.getTotalRotation());
            this.normalWorld = this.normalWorld.toVector3().normalize();

            this._isDirty = false;

            // TODO: reset other dirty flags ?
        }
        return this;
    };

    return element;

}());
