/**
 * CSS 3D engine
 * 
 * @category    css3d
 * @package     css3d
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d
 * @class
 * @param {DOMElement} containerElement
 * @param {css3d.scene} scene
 * @returns {css3d}
 */
var css3d = (function(document)
{
    /**
     * 
     * @param {DOMElement} containerElement
     * @param {css3d.scene} scene
     * @returns {css3d}
     */
    var css3d = function(containerElement, scene)
    {
        this._containerElement = containerElement;
        this._prefix = null;

        this._styleTransform = null;
        this._styleBackfaceVisibility = null;
        this._styleFilter = null;
        this._styleTransformStyle = null;
        this._stylePerspective = null;

        this._needDepthSorting = false;
        this._hasFilter = true;

        this._scene = scene;
        this._viewMatrix = null;        
        this._isRendering = false;
        this._renderId = null;
        this._lastCalledTime = 0;

        /**
         * Current version
         * @memberof! css3d
         * @instance
         */
        this.version = '0.9.1';
        
        /**
         * Browser supports CSS 3D
         * @type {Boolean}
         * @memberof! css3d
         * @instance
         */
        this.browserSupports3d = this._init();
        
        /**
         * Set the render callback
         * @type {Function}
         * @memberof! css3d
         * @instance
         */
        this.onRender = null;        
    };

    css3d.prototype._init = function()
    {
        if (!this._browserSupports3d()) {            
            return false;
        }

        this._prefix = this._getPrefix();
        if (null == this._prefix) {            
            return false;
        }
        this._initContainer();
        this._getNeedDepthSorting();
        this._getHasFilter();

        this._initElements();
        return true;
    };

    css3d.prototype._browserSupports3d = function()
    {
        if (!window.getComputedStyle) {
            return false;
        }
        var el = document.createElement('p'),
            supports3d,
            transforms = {
                'webkitTransform':'-webkit-transform',
                'oTransform':'-o-transform',
                'msTransform':'-ms-transform',
                'mozTransform':'-moz-transform',
                'transform':'transform'
            };
        document.body.insertBefore(el, null);
        for (var t in transforms) {
            if (el.style[t] !== undefined) {
                el.style[t] = "translate3d(1px,1px,1px)";
                supports3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
            }
        }
        document.body.removeChild(el);
        return (supports3d !== undefined && supports3d.length > 0 && supports3d !== "none");
    };

    css3d.prototype._getPrefix = function()
    {
        var prefixTests = ['transform', 'msTransform', 'mozTransform', 'webkitTransform', 'oTransform'];
        var prefixes = ['', 'ms', 'moz', 'webkit', 'o'];
        var result = null;
        for (var i = 0; i < prefixTests.length; ++i) {
            if (typeof this._containerElement.style[prefixTests[i]] != 'undefined') {
                result = prefixes[i];
                break;
            }
        }
        if (null != result) {
            this._styleTransform = (result == '') ? 'transform' : result+'Transform';
            this._styleBackfaceVisibility = (result == '') ? 'backfaceVisibility' : result+'BackfaceVisibility';
            this._styleFilter = (result == '') ? 'filter' : result+'Filter';
            this._styleTransformStyle = (result == '') ? 'transformStyle' : result+'TransformStyle';
            this._stylePerspective = (result == '') ? 'perspective' : result+'Perspective';
        }
        return result;
    };

    css3d.prototype._initContainer = function()
    {
        this._containerElement.style[this._styleTransformStyle] = 'preserve-3d';
        if (null != this._scene) {
            this._containerElement.style[this._stylePerspective] = this._scene.getCamera().perspective+'px';
        }
    };

    css3d.prototype._initElements = function()
    {
        if (null != this._scene) {
            var elements = this._scene.getElements();
            for (var i=0;i<elements.length;i++) {
                elements[i].init(this._hasFilter, this._containerElement);
            }
        }
    };

    css3d.prototype._getNeedDepthSorting = function()
    {
        var st = window.getComputedStyle(this._containerElement, null),
            transform = st.getPropertyValue("-webkit-transform-style") ||
            st.getPropertyValue("-moz-transform-style") ||
            st.getPropertyValue("-ms-transform-style") ||
            st.getPropertyValue("-o-transform-style") ||
            st.getPropertyValue("transform-style");

        if (transform !== 'preserve-3d') {
            this._needDepthSorting = true;
        }
    };

    css3d.prototype._getHasFilter = function()
    {
        this._containerElement.style[this._styleFilter] = 'brightness(1)';
        var st = window.getComputedStyle(this._containerElement, null),
            filter = st.getPropertyValue("-webkit-filter") ||
            st.getPropertyValue("-moz-filter") ||
            st.getPropertyValue("-ms-filter") ||
            st.getPropertyValue("-o-filter") ||
            st.getPropertyValue("filter");
        this._containerElement.style[this._styleFilter] = 'none';
        if (filter !== 'brightness(1)') {
            this._hasFilter = false;
            return false;
        }
        return true;
    };

    /**
     * 
     * @memberof! css3d
     * @param {css3d.scene} scene
     * @returns {css3d}
     */
    css3d.prototype.setScene = function(scene)
    {
        this._scene = scene;
        this._initElements();
        this._initContainer();
        return this;
    };

    /**
     * 
     * @memberof! css3d
     * @returns {css3d.scene}
     */
    css3d.prototype.getScene = function()
    {
        return this._scene;
    };

    css3d.prototype._zSortElements = function()
    {
        var world, worldView, projected;

        var elements = this._scene.getElements();
        for (var i=0;i<elements.length;i++) {
            if (null == elements[i].getDomElement()) {
                continue;
            }
            if (null != elements[i].zIndex) {
                elements[i].getDomElement().style.zIndex = elements[i].zIndex;
                continue;
            }

            world = elements[i].getWorldMatrix();            

            worldView = css3d.matrix4.multiply(this._viewMatrix, world);
            projected = elements[i].getPivot().transform(worldView);

            elements[i].worldView = worldView;
            elements[i].getDomElement().style.zIndex = Math.round(projected.z * 10);
	}
    };

    /**
     * Update the scene
     * 
     * @memberof! css3d
     * @returns {css3d}
     */
    css3d.prototype.update = function()
    {
        this._scene.update();
        return this;
    };

    /**
     * Render the scene
     * 
     * @memberof! css3d
     * @returns {css3d}
     */
    css3d.prototype.render = function()
    {
        this._viewMatrix = this._scene.getCamera().getViewMatrix();

        // zSort models
        if (this._needDepthSorting) {
            this._zSortElements();
        }

        // render elements
        var elements = this._scene.getElements();
        for (var i=0;i<elements.length;i++) {
            this.renderElement(elements[i]);
        }

        return this;
    };

    /**
     * 
     * @memberof! css3d
     * @param {css3d.element} element
     * @returns {css3d}
     */
    css3d.prototype.renderElement = function(element)
    {
        if (null == element.getDomElement()) {
            return this;
        }

        var m;
        if (null != element.worldView) {
            m = element.worldView;
        }
        else {
            m = css3d.matrix4.multiply(this._viewMatrix, element.getWorldMatrix());
        }
 
        // css matrix3d is the transpose of css3d.matrix4
        var s = "matrix3d(";
        s += m[0].toFixed(10) + "," + m[4].toFixed(10) + "," + m[8].toFixed(10) + "," + m[12].toFixed(10) + ",";
        s += m[1].toFixed(10) + "," + m[5].toFixed(10) + "," + m[9].toFixed(10) + "," + m[13].toFixed(10) + ",";
        s += m[2].toFixed(10) + "," + m[6].toFixed(10) + "," + m[10].toFixed(10) + "," + m[14].toFixed(10) + ",";
        s += m[3].toFixed(10) + "," + m[7].toFixed(10) + "," + m[11].toFixed(10) + "," + m[15].toFixed(10);
        s += ")";

        element.getDomElement().style[this._styleTransform] = s;

        // backface culling
        if (element.backfaceCullingDirty) {
            var backfaceCulling = 'visible';
            if (element.getBackfaceCulling()) {
                backfaceCulling = 'hidden';
            }
            element.getDomElement().style[this._styleBackfaceVisibility] = backfaceCulling;
            element.backfaceCullingDirty = false;
        }

        // shading
        if (element.shading) {
            //var projected = element.normal.transform(element.getTotalRotation());
            //projected = projected.toVector3().normalize();
            var projected = element.normalWorld;            
            var dot = Math.abs(projected.dot(this._scene.getLight())).toFixed(10);
            dot = dot * this._scene.getShadingIntensity() + (1-this._scene.getShadingIntensity());
            if (this._hasFilter) {
                element.getDomElement().style[this._styleFilter] = 'brightness('+dot+')';
            }
            else if (null != element.getShaderElement()){
                // slow in safari 5.1.7
                element.getShaderElement().style.opacity = 1 - dot;
                //element.getShaderElement().style.backgroundColor = 'rgba(0, 0, 0, '+(dot)+')';
            }
        }
        
        return this;
    };

    css3d.prototype._requestAnimationFrame = function()
    {
        return (
            window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(/* function */ callback)
            {
                return window.setTimeout(callback, 1000 / 60);
            }
        );
    };

    css3d.prototype._cancelAnimationFrame = function()
    {
        return (
            window.cancelAnimationFrame                 ||
            window.webkitCancelRequestAnimationFrame    ||
            window.mozCancelRequestAnimationFrame       ||
            window.oCancelRequestAnimationFrame         ||
            window.msCancelRequestAnimationFrame        ||
            window.clearTimeout
        );
    };

    /**
     * Start rendering
     * 
     * @memberof! css3d
     * @returns {css3d}
     */
    css3d.prototype.startRender = function()
    {
        if (!this._isRendering) {
            this._isRendering = true;
            window.requestAnimationFrame = this._requestAnimationFrame();
            this._renderLoop();
        }
        return this;
    };

    /**
     * Stop rendering
     * 
     * @memberof! css3d
     * @returns {css3d}
     */
    css3d.prototype.stopRender = function()
    {
        if (this._isRendering) {
            window.cancelAnimationFrame = this._cancelAnimationFrame();
            cancelAnimationFrame(this._renderId);
            this._isRendering = false;
            this._lastCalledTime = 0;
        }
        return this;
    };

    css3d.prototype._renderLoop = function()
    {
        // calc time
        var time = new Date().getTime();
        if(!this._lastCalledTime) {
            this._lastCalledTime = time;
        }
        var delta = 0.06 * (time - this._lastCalledTime); // 0.06 * = / (1000/60);
        this._lastCalledTime = time;
        // calc time end

        this.update().render();
        
        var self = this;
        this._renderId = requestAnimationFrame(function(){css3d.prototype._renderLoop.call(self);});

        if (null != this.onRender) {
            this.onRender(delta);
        }
    };


    return css3d;

}(document));

/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.ajax
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @namespace
 */
css3d.ajax = (function()
{

    var _private = {};
    var _public = {};

    _private.x = function()
    {
        try {
            return new XMLHttpRequest();
        }
        // IE
        catch (e) {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP");
            }
            catch (e) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                }
                catch (e) {
                    return false;
                }
            }
        }
        return false;
    };

    _private.statechange = function(data)
    {
        if (data.xmlHttp.readyState == 4) {
            if (data.responsefnc != null) {
                data.responsefnc(data.xmlHttp.responseText);
            }
        }
        return;
    };

    _private.active = function(data)
    {
        switch (data.xmlHttp.readyState) {
            case 1: case 2: case 3:
            return true;
            break;
            // case 4 and 0
            default:
            return false;
            break;
        }
    };

    /**
     * 
     * @function send
     * @memberof! css3d.ajax
     * @param {String} url
     * @param {Function} responsefnc
     * @param {String} method
     * @param {String} arguments
     * @param {Number} timeout
     * @param {Boolean} cache
     */
    _public.send = function(url, responsefnc, method, arguments, timeout, cache)
    {
        var xmlHttp = _private.x();
        if (!xmlHttp) {
            throw new Error('No ajax support');
        }

        var timeout = timeout || 5000;
        var errorfnc = function(){throw new Error('Ajax error');}

        if (!cache) {
            var now = new Date();
            var time = now.getTime();
            if (method == 'GET') {
                url = url + '&__t__=' + time;
            }
            else if (method == 'POST') {
                arguments = arguments + '&__t__=' + time;
            }
        }

        var data = {};
        data.xmlHttp = xmlHttp;
        data.responsefnc = responsefnc;
        data.errorfnc = errorfnc;

        xmlHttp.onreadystatechange = function(){_private.statechange(data)};
        xmlHttp.open(method, url, true);
        if (method == 'POST') {
            xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xmlHttp.send(arguments);

        data.timeout = window.setTimeout(
            function()
            {
                if (_private.active(data)) {
                    data.xmlHttp.abort();
                    throw new Error('Ajax timeout');
                    return;
                }
            },
            timeout
        );
    };

    /**
     * 
     * @function get
     * @memberof! css3d.ajax
     * @param {String} url
     * @param {Function} responsefnc
     * @param {Number} timeout
     */
    _public.get = function(url, responsefnc, timeout)
    {
        _public.send(url, responsefnc, 'GET', null, timeout);
    };

    /**
     * Synchronous Get
     * 
     * @function getS
     * @memberof! css3d.ajax
     * @param {String} url
     * @returns {String}
     */
    _public.getS = function(url)
    {
        var xmlHttp = _private.x();
        if (!xmlHttp) {
            throw new Error('No ajax support');
        }
        xmlHttp.open('GET', url, false);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    };

    /**
     * 
     * @function post
     * @memberof! css3d.ajax
     * @param {String} url
     * @param {Function} responsefnc
     * @param {String} arguments
     * @param {Number} timeout     
     */
    _public.post = function(url, responsefnc, arguments, timeout)
    {
        _public.send(url, responsefnc, 'POST', arguments, timeout)
    };

    /**
     * Synchronous Post
     * 
     * @function postS
     * @memberof! css3d.ajax
     * @param {String} url
     * @param {String} arguments
     * @returns {String}
     */
    _public.postS = function(url, arguments)
    {
        var xmlHttp = _private.x();
        if (!xmlHttp) {
            throw new Error('No ajax support');
        }
        xmlHttp.open('POST', url, false);
        xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xmlHttp.send(arguments);
        return xmlHttp.responseText;
    };

    return _public;

}());
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
/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.collision
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.collision
 * @class
 * @param {Array} elements
 * @returns {css3d.collision}
 */
css3d.collision = (function()
{
    /**
     * 
     * @param {Array} elements
     * @returns {css3d.collision}
     */
    var collision = function(elements)
    {        
        this._elements = elements;
    }
    
    /**
     * 
     * @memberof! css3d.collision
     * @instance
     * @param {css3d.vector3} position
     * @param {css3d.vector3} normal
     * @param {Number} distance
     * @returns {Array}
     */
    collision.prototype.getCollisions = function(position, normal, distance)
    {
        var collisionPoint = new css3d.vector3(
            position.x + (normal.x * distance),
            position.y + (normal.y * distance),
            position.z + (normal.z * distance)
        );

        var elementPosition, elementDistance, elementSize, planeDistance;
        var collisionElements = [];
	
        for (var i=0;i<this._elements.length;i++) {            
            if (null == this._elements[i]._domElement) {
                continue;
            }    
            
            elementPosition = this._elements[i].getTotalTranslation();
            elementDistance = css3d.vector3.prototype.distance(elementPosition, collisionPoint);
            elementSize = Math.max(
                this._elements[i]._domElement.offsetWidth / 2,
                this._elements[i]._domElement.offsetHeight / 2
            );
 
            if (elementDistance < elementSize) {
                elementPosition.sub(collisionPoint);
                planeDistance = css3d.vector3.prototype.dot2(this._elements[i].normalWorld, elementPosition);
                //console.log(planeDistance);
                      
                //if (planeDistance <= 0) {
                if (Math.abs(planeDistance) < distance) { // normally <= 0, but if the steps are too large the collision is missed
                    //this._elements[i]._domElement.style.border = '1px solid red';                    
                    collisionElements.push(this._elements[i]);
                }                
            }
            else {
                //this._elements[i]._domElement.style.border = 'none';
            }            
        }        
        return collisionElements;        
    }

    return collision;
}());



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

/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.elementFactory
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @namespace
 */
css3d.elementFactory = {

    /**
     * 
     * @param {DOMElement} container
     * @param {css3d.scene} scene
     * @param {Number} size
     * @param {String|null} id
     * @param {String|null} className
     * @param {Boolean|null} backfaceCulling
     * @param {Boolean|null} shading
     * @returns {css3d.element} This is the parent element
     */
    cube : function(container, scene, size, id, className, backfaceCulling, shading)
    {
        var translation = size/2;

        var elementGroup = new css3d.element();
        elementGroup.setTranslation(0, 0, -translation);

        var backDiv = document.createElement('div');
        backDiv.style.position = 'absolute';
        backDiv.style.width = size+'px';
        backDiv.style.height = size+'px';
        container.appendChild(backDiv);

        var frontDiv = document.createElement('div');
        frontDiv.style.position = 'absolute';
        frontDiv.style.width = size+'px';
        frontDiv.style.height = size+'px';
        container.appendChild(frontDiv);

        var leftDiv = document.createElement('div');
        leftDiv.style.position = 'absolute';
        leftDiv.style.width = size+'px';
        leftDiv.style.height = size+'px';
        container.appendChild(leftDiv);

        var rightDiv = document.createElement('div');
        rightDiv.style.position = 'absolute';
        rightDiv.style.width = size+'px';
        rightDiv.style.height = size+'px';
        container.appendChild(rightDiv);

        var topDiv = document.createElement('div');
        topDiv.style.position = 'absolute';
        topDiv.style.width = size+'px';
        topDiv.style.height = size+'px';
        container.appendChild(topDiv);

        var bottomDiv = document.createElement('div');
        bottomDiv.style.position = 'absolute';
        bottomDiv.style.width = size+'px';
        bottomDiv.style.height = size+'px';
        container.appendChild(bottomDiv);

        if (id) {
            backDiv.id = id+'-back';
            frontDiv.id = id+'-front';
            leftDiv.id = id+'-left';
            rightDiv.id = id+'-right';
            topDiv.id = id+'-top';
            bottomDiv.id = id+'-bottom';
        }
        if (className) {
            backDiv.className = className+' '+className+'-back';
            frontDiv.className = className+' '+className+'-front';
            leftDiv.className = className+' '+className+'-left';
            rightDiv.className = className+' '+className+'-right';
            topDiv.className = className+' '+className+'-top';
            bottomDiv.className = className+' '+className+'-bottom';
        }

        backfaceCulling = (backfaceCulling == null) ? true : backfaceCulling;
        shading = (shading == null) ? true : shading;

        var back = new css3d.element(backDiv);
        back.setBackfaceCulling(backfaceCulling);
        back.shading = shading;
        back.setTranslation(0, 0, -translation);
        back.setRotation({x:0, y:1, z:0}, Math.PI);
        back.inheritScaling = true;

        var front = new css3d.element(frontDiv);
        front.setBackfaceCulling(backfaceCulling);
        front.shading = shading;
        front.setTranslation(0, 0, translation);
        front.inheritScaling = true;

        var left = new css3d.element(leftDiv);
        left.setBackfaceCulling(backfaceCulling);
        left.shading = shading;
        left.setRotation({x:0, y:1, z:0}, -Math.PI/2);
        left.setTranslation(-translation, 0, 0);
        left.inheritScaling = true;

        var right = new css3d.element(rightDiv);
        right.setBackfaceCulling(backfaceCulling);
        right.shading = shading;
        right.setRotation({x:0, y:1, z:0}, Math.PI/2);
        right.setTranslation(translation, 0, 0);
        right.inheritScaling = true;

        var top = new css3d.element(topDiv);
        top.setBackfaceCulling(backfaceCulling);
        top.shading = shading;
        top.setRotation({x:1, y:0, z:0}, Math.PI/2);
        top.setTranslation(0, -translation, 0);
        top.inheritScaling = true;

        var bottom = new css3d.element(bottomDiv);
        bottom.setBackfaceCulling(backfaceCulling);
        bottom.shading = shading;
        bottom.setRotation({x:1, y:0, z:0}, -Math.PI/2);
        bottom.setTranslation(0, translation, 0);
        bottom.inheritScaling = true;

        back.setParent(elementGroup);
        front.setParent(elementGroup);
        left.setParent(elementGroup);
        right.setParent(elementGroup);
        top.setParent(elementGroup);
        bottom.setParent(elementGroup);

        scene.addElement(elementGroup);
        scene.addElement(back);
        scene.addElement(front);
        scene.addElement(left);
        scene.addElement(right);
        scene.addElement(top);
        scene.addElement(bottom);

        return elementGroup;
    },
    
    /**
     * 
     * @param {DOMElement} container
     * @param {css3d.scene} scene
     * @param {Number} width
     * @param {Number} height
     * @param {Number} depth
     * @param {String|null} id
     * @param {String|null} className
     * @param {Boolean|null} backfaceCulling
     * @param {Boolean|null} shading
     * @param {Boolean|null} addTopAndBottom
     * @returns {css3d.element} This is the parent element
     */
    cuboid : function(container, scene, width, height, depth, id, className, backfaceCulling, shading, addTopAndBottom)
    {
        var translationX = width/2;
        var translationY = height/2;
        var translationZ = depth/2;
        
        addTopAndBottom = (addTopAndBottom == null) ? true : addTopAndBottom;

        var elementGroup = new css3d.element();
        elementGroup.setTranslation(0, 0, -translationZ);

        var backDiv = document.createElement('div');
        backDiv.style.position = 'absolute';
        backDiv.style.width = width+'px';
        backDiv.style.height = height+'px';
        container.appendChild(backDiv);

        var frontDiv = document.createElement('div');
        frontDiv.style.position = 'absolute';
        frontDiv.style.width = width+'px';
        frontDiv.style.height = height+'px';
        container.appendChild(frontDiv);

        var leftDiv = document.createElement('div');
        leftDiv.style.position = 'absolute';
        leftDiv.style.width = depth+'px';
        leftDiv.style.height = height+'px';
        container.appendChild(leftDiv);

        var rightDiv = document.createElement('div');
        rightDiv.style.position = 'absolute';
        rightDiv.style.width = depth+'px';
        rightDiv.style.height = height+'px';
        container.appendChild(rightDiv);

        if (addTopAndBottom) {
            var topDiv = document.createElement('div');
            topDiv.style.position = 'absolute';
            topDiv.style.width = width+'px';
            topDiv.style.height = depth+'px';
            container.appendChild(topDiv);

            var bottomDiv = document.createElement('div');
            bottomDiv.style.position = 'absolute';
            bottomDiv.style.width = width+'px';
            bottomDiv.style.height = depth+'px';
            container.appendChild(bottomDiv);
        }

        if (id) {
            backDiv.id = id+'-back';
            frontDiv.id = id+'-front';
            leftDiv.id = id+'-left';
            rightDiv.id = id+'-right';
            if (addTopAndBottom) {
                topDiv.id = id+'-top';
                bottomDiv.id = id+'-bottom';
            }
        }
        if (className) {
            backDiv.className = className+' '+className+'-back';
            frontDiv.className = className+' '+className+'-front';
            leftDiv.className = className+' '+className+'-left';
            rightDiv.className = className+' '+className+'-right';
            if (addTopAndBottom) {
                topDiv.className = className+' '+className+'-top';
                bottomDiv.className = className+' '+className+'-bottom';
            }
        }

        backfaceCulling = (backfaceCulling == null) ? true : backfaceCulling;
        shading = (shading == null) ? true : shading;

        var back = new css3d.element(backDiv);
        back.setBackfaceCulling(backfaceCulling);
        back.shading = shading;
        back.setTranslation(0, 0, -translationZ);
        back.setRotation({x:0, y:1, z:0}, Math.PI);
        back.inheritScaling = true;

        var front = new css3d.element(frontDiv);
        front.setBackfaceCulling(backfaceCulling);
        front.shading = shading;
        front.setTranslation(0, 0, translationZ);
        front.inheritScaling = true;

        var left = new css3d.element(leftDiv);
        left.setBackfaceCulling(backfaceCulling);
        left.shading = shading;
        left.setRotation({x:0, y:1, z:0}, -Math.PI/2);
        left.setTranslation(-translationX, 0, 0);
        left.inheritScaling = true;

        var right = new css3d.element(rightDiv);
        right.setBackfaceCulling(backfaceCulling);
        right.shading = shading;
        right.setRotation({x:0, y:1, z:0}, Math.PI/2);
        right.setTranslation(translationX, 0, 0);
        right.inheritScaling = true;

        if (addTopAndBottom) {
            var top = new css3d.element(topDiv);
            top.setBackfaceCulling(backfaceCulling);
            top.shading = shading;
            top.setRotation({x:1, y:0, z:0}, Math.PI/2);
            top.setTranslation(0, -translationY, 0);
            top.inheritScaling = true;

            var bottom = new css3d.element(bottomDiv);
            bottom.setBackfaceCulling(backfaceCulling);
            bottom.shading = shading;
            bottom.setRotation({x:1, y:0, z:0}, -Math.PI/2);
            bottom.setTranslation(0, translationY, 0);
            bottom.inheritScaling = true;
        }

        back.setParent(elementGroup);
        front.setParent(elementGroup);
        left.setParent(elementGroup);
        right.setParent(elementGroup);
        if (addTopAndBottom) {
            top.setParent(elementGroup);
            bottom.setParent(elementGroup);
        }
        
        scene.addElement(elementGroup);
        scene.addElement(back);
        scene.addElement(front);
        scene.addElement(left);
        scene.addElement(right);
        if (addTopAndBottom) {
            scene.addElement(top);
            scene.addElement(bottom);
        }
        
        return elementGroup;
    },

    /**
     * Build cube from DOM Elements
     * 
     * @param {css3d.scene} scene
     * @param {Number} size
     * @param {DOMElement} backE
     * @param {DOMElement} frontE
     * @param {DOMElement} leftE
     * @param {DOMElement} rightE
     * @param {DOMElement} topE
     * @param {DOMElement} bottomE
     * @param {Boolean|null} backfaceCulling
     * @param {Boolean|null} shading
     * @returns {css3d.element} This is the parent element
     */
    cubeElements : function(scene, size, backE, frontE, leftE, rightE, topE, bottomE, backfaceCulling, shading)
    {
        var translation = size/2;

        var elementGroup = new css3d.element();
        elementGroup.setTranslation(0, 0, -translation);

        backE.style.position = 'absolute';
        frontE.style.position = 'absolute';
        leftE.style.position = 'absolute';
        rightE.style.position = 'absolute';
        topE.style.position = 'absolute';
        bottomE.style.position = 'absolute';

        backfaceCulling = (backfaceCulling == null) ? true : backfaceCulling;
        shading = (shading == null) ? true : shading;

        var back = new css3d.element(backE);
        back.setBackfaceCulling(backfaceCulling);
        back.shading = shading;
        back.setTranslation(0, 0, -translation);
        back.setRotation({x:0, y:1, z:0}, Math.PI);
        back.inheritScaling = true;

        var front = new css3d.element(frontE);
        front.setBackfaceCulling(backfaceCulling);
        front.shading = shading;
        front.setTranslation(0, 0, translation);
        front.inheritScaling = true;

        var left = new css3d.element(leftE);
        left.setBackfaceCulling(backfaceCulling);
        left.shading = shading;
        left.setRotation({x:0, y:1, z:0}, -Math.PI/2);
        left.setTranslation(-translation, 0, 0);
        left.inheritScaling = true;

        var right = new css3d.element(rightE);
        right.setBackfaceCulling(backfaceCulling);
        right.shading = shading;
        right.setRotation({x:0, y:1, z:0}, Math.PI/2);
        right.setTranslation(translation, 0, 0);
        right.inheritScaling = true;

        var top = new css3d.element(topE);
        top.setBackfaceCulling(backfaceCulling);
        top.shading = shading;
        top.setRotation({x:1, y:0, z:0}, Math.PI/2);
        top.setTranslation(0, -translation, 0);
        top.inheritScaling = true;

        var bottom = new css3d.element(bottomE);
        bottom.setBackfaceCulling(backfaceCulling);
        bottom.shading = shading;
        bottom.setRotation({x:1, y:0, z:0}, -Math.PI/2);
        bottom.setTranslation(0, translation, 0);
        bottom.inheritScaling = true;

        back.setParent(elementGroup);
        front.setParent(elementGroup);
        left.setParent(elementGroup);
        right.setParent(elementGroup);
        top.setParent(elementGroup);
        bottom.setParent(elementGroup);

        scene.addElement(elementGroup);
        scene.addElement(back);
        scene.addElement(front);
        scene.addElement(left);
        scene.addElement(right);
        scene.addElement(top);
        scene.addElement(bottom);

        return elementGroup;
    },

    /* test with container element and native css transformation */
    cube2 : function(container, css3dInstance, scene, size, id, className)
    {
        var translation = size/2;

        var mainDiv = document.createElement('div');
        mainDiv.style.position = 'absolute';
        mainDiv.style[css3dInstance._styleTransformStyle] = 'preserve-3d';
        container.appendChild(mainDiv);

        var backDiv = document.createElement('div');
        backDiv.style.position = 'absolute';
        mainDiv.appendChild(backDiv);

        var frontDiv = document.createElement('div');
        frontDiv.style.position = 'absolute';
        mainDiv.appendChild(frontDiv);

        var leftDiv = document.createElement('div');
        leftDiv.style.position = 'absolute';
        mainDiv.appendChild(leftDiv);

        var rightDiv = document.createElement('div');
        rightDiv.style.position = 'absolute';
        mainDiv.appendChild(rightDiv);

        var topDiv = document.createElement('div');
        topDiv.style.position = 'absolute';
        mainDiv.appendChild(topDiv);

        var bottomDiv = document.createElement('div');
        bottomDiv.style.position = 'absolute';
        mainDiv.appendChild(bottomDiv);

        if (id) {
            mainDiv.id = id+'-main';
            backDiv.id = id+'-back';
            frontDiv.id = id+'-front';
            leftDiv.id = id+'-left';
            rightDiv.id = id+'-right';
            topDiv.id = id+'-top';
            bottomDiv.id = id+'-bottom';
        }
        if (className) {
            mainDiv.className = className+' '+className+'-main';
            backDiv.className = className+' '+className+'-back';
            frontDiv.className = className+' '+className+'-front';
            leftDiv.className = className+' '+className+'-left';
            rightDiv.className = className+' '+className+'-right';
            topDiv.className = className+' '+className+'-top';
            bottomDiv.className = className+' '+className+'-bottom';
        }

        var main = new css3d.element(mainDiv);
        main.setTranslation(0, 0, -translation);
        main.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);
        
        var back = new css3d.element(backDiv);
        back.setBackfaceCulling(true);
        back.setTranslation(0, 0, -translation);
        back.setRotation({x:0, y:1, z:0}, Math.PI);
        back.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);
        
        var front = new css3d.element(frontDiv);
        front.setBackfaceCulling(true);
        front.setTranslation(0, 0, translation);
        front.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);

        var left = new css3d.element(leftDiv);
        left.setBackfaceCulling(true);
        left.setRotation({x:0, y:1, z:0}, -Math.PI/2);
        left.setTranslation(-translation, 0, 0);
        left.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);

        var right = new css3d.element(rightDiv);
        right.setBackfaceCulling(true);
        right.setRotation({x:0, y:1, z:0}, Math.PI/2);
        right.setTranslation(translation, 0, 0);
        right.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);

        var top = new css3d.element(topDiv);
        top.setBackfaceCulling(true);
        top.setRotation({x:1, y:0, z:0}, Math.PI/2);
        top.setTranslation(0, -translation, 0);
        top.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);

        var bottom = new css3d.element(bottomDiv);
        bottom.setBackfaceCulling(true);
        bottom.setRotation({x:1, y:0, z:0}, -Math.PI/2);
        bottom.setTranslation(0, translation, 0);
        bottom.setMatrix(css3dInstance._styleTransform, css3dInstance._styleBackfaceVisibility);

        scene.addElement(main);

        return main;
    },

    /**
     * 
     * @param {DOMElement} container
     * @param {css3d.scene} scene
     * @param {Number} size
     * @param {Integer} tiles
     * @param {String|null} id
     * @param {String|null} className
     * @param {Boolean|null} backfaceCulling
     * @param {Boolean|null} shading
     * @returns {css3d.element} This is the parent element 
     */
    plane : function(container, scene, size, tiles, id, className, backfaceCulling, shading)
    {
        var tileSize = size/tiles;
        var sizeHalf = (size/2);

        var elementGroup = new css3d.element();
        scene.addElement(elementGroup);

        backfaceCulling = (backfaceCulling == null) ? true : backfaceCulling;
        shading = (shading == null) ? true : shading;
        
        var tmp;
        var tmp2;

        // rows
        for (var i=0;i<tiles;i++) {
            // tiles
            for (var j=0;j<tiles;j++) {
                tmp = document.createElement('div');
                tmp.style.position = 'absolute';
                tmp.style.width = tileSize+'px';
                tmp.style.height = tileSize+'px';
                container.appendChild(tmp);
                if (id) {
                    tmp.id = id+'-'+i+'-'+j;
                }
                if (className) {
                    tmp.className = className+' '+className+'-'+i+'-'+j;
                }
                tmp2 = new css3d.element(tmp);
                tmp2.setBackfaceCulling(backfaceCulling);
                tmp2.shading = shading;
                tmp2.setTranslation(-sizeHalf + (j * tileSize), -sizeHalf + (i * tileSize), 0);
                tmp2.inheritScaling = true;
                tmp2.setParent(elementGroup);
                scene.addElement(tmp2);
            }
        }

        return elementGroup;
    },

    /**
     * 
     * @param {DOMElement} container
     * @param {css3d.scene} scene
     * @param {Number} size
     * @param {String|null} id
     * @param {String|null} className
     * @returns {css3d.element} This is the parent element 
     */
    skybox : function(container, scene, size, id, className)
    {
        var translation = (size-2)/2;

        var elementGroup = new css3d.element();

        var backDiv = document.createElement('div');
        backDiv.style.position = 'absolute';
        backDiv.style.width = size+'px';
        backDiv.style.height = size+'px';
        container.appendChild(backDiv);

        var frontDiv = document.createElement('div');
        frontDiv.style.position = 'absolute';
        frontDiv.style.width = size+'px';
        frontDiv.style.height = size+'px';
        container.appendChild(frontDiv);

        var leftDiv = document.createElement('div');
        leftDiv.style.position = 'absolute';
        leftDiv.style.width = size+'px';
        leftDiv.style.height = size+'px';
        container.appendChild(leftDiv);

        var rightDiv = document.createElement('div');
        rightDiv.style.position = 'absolute';
        rightDiv.style.width = size+'px';
        rightDiv.style.height = size+'px';
        container.appendChild(rightDiv);

        var topDiv = document.createElement('div');
        topDiv.style.position = 'absolute';
        topDiv.style.width = size+'px';
        topDiv.style.height = size+'px';
        container.appendChild(topDiv);

        var bottomDiv = document.createElement('div');
        bottomDiv.style.position = 'absolute';
        bottomDiv.style.width = size+'px';
        bottomDiv.style.height = size+'px';
        container.appendChild(bottomDiv);

        if (id) {
            backDiv.id = id+'-back';
            frontDiv.id = id+'-front';
            leftDiv.id = id+'-left';
            rightDiv.id = id+'-right';
            topDiv.id = id+'-top';
            bottomDiv.id = id+'-bottom';
        }
        if (className) {
            backDiv.className = className+' '+className+'-back';
            frontDiv.className = className+' '+className+'-front';
            leftDiv.className = className+' '+className+'-left';
            rightDiv.className = className+' '+className+'-right';
            topDiv.className = className+' '+className+'-top';
            bottomDiv.className = className+' '+className+'-bottom';
        }

        var backfaceCulling = true;
        var shading = false;

        var back = new css3d.element(backDiv);
        back.setBackfaceCulling(backfaceCulling);
        back.shading = shading;
        back.setTranslation(0, 0, -translation);
        back.inheritScaling = true;

        var front = new css3d.element(frontDiv);
        front.setBackfaceCulling(backfaceCulling);
        front.shading = shading;
        front.setTranslation(0, 0, translation);
        front.setRotation({x:0, y:1, z:0}, Math.PI);
        front.inheritScaling = true;

        var left = new css3d.element(leftDiv);
        left.setBackfaceCulling(backfaceCulling);
        left.shading = shading;
        left.setRotation({x:0, y:1, z:0}, Math.PI/2);
        left.setTranslation(-translation, 0, 0);
        left.inheritScaling = true;

        var right = new css3d.element(rightDiv);
        right.setBackfaceCulling(backfaceCulling);
        right.shading = shading;
        right.setRotation({x:0, y:1, z:0}, -Math.PI/2);
        right.setTranslation(translation, 0, 0);
        right.inheritScaling = true;

        var top = new css3d.element(topDiv);
        top.setBackfaceCulling(backfaceCulling);
        top.shading = shading;
        top.setRotation({x:1, y:0, z:0}, -Math.PI/2);
        top.setTranslation(0, -translation, 0);
        top.inheritScaling = true;

        var bottom = new css3d.element(bottomDiv);
        bottom.setBackfaceCulling(backfaceCulling);
        bottom.shading = shading;
        bottom.setRotation({x:1, y:0, z:0}, Math.PI/2);
        bottom.setTranslation(0, translation, 0);
        bottom.inheritScaling = true;

        back.setParent(elementGroup);
        front.setParent(elementGroup);
        left.setParent(elementGroup);
        right.setParent(elementGroup);
        top.setParent(elementGroup);
        bottom.setParent(elementGroup);

        scene.addElement(elementGroup);
        scene.addElement(back);
        scene.addElement(front);
        scene.addElement(left);
        scene.addElement(right);
        scene.addElement(top);
        scene.addElement(bottom);

        return elementGroup;
    },
    
    /**
     * Import an obj file
     * 
     * @param {DOMElement} container
     * @param {css3d.scene} scene
     * @param {String} objFile  Path to obj file
     * @param {String|null} className
     * @param {Boolean|null} backfaceCulling
     * @param {Boolean|null} shading
     * @param {Boolean|null} clockwise  The face winding direction
     * @param {String} textureFile  Path to texture file
     * @param {Integer} textureSize Texture size (The texture has to be a square)
     * @returns {css3d.element} This is the parent element 
     */
    fromObj : function(container, scene, objFile, className, backfaceCulling, shading, clockwise, textureFile, textureSize)
    {

        className = className || 'model';
        backfaceCulling = (backfaceCulling == null) ? true : backfaceCulling;
        shading = (shading == null) ? true : shading;
        clockwise = (clockwise == null) ? false : clockwise;
        textureFile = (textureFile == null) ? '' : textureFile;
        textureSize = (textureSize == null) ? 1024 : textureSize;        

        var objContent = css3d.ajax.getS(objFile);

        var vertices = [];
        var faces = [];
        var colors = [];
        colors[0] = [204, 204, 204];
        var textureCoordinates = [];
        var faceMatches = [];

        var findColors = /c ([0-9]*) ([0-9]*) ([0-9]*)/gim;
        var findVertices = /v ([0-9\-.]*) ([0-9\-.]*) ([0-9\-.]*)/gim;
        //var findFaces1 = /f ([0-9\-.]*).*? ([0-9\-.]*).*? ([0-9\-.]*).*? ([0-9\-.]*)(.*)$/gim;
        var findFaces1 = /f ([0-9\-.]*) ([0-9\-.]*) ([0-9\-.]*) ([0-9\-.]*)(.*)$/gim;
        var findFaces2 = /f ([0-9\-.]*).*?\/([0-9\-.]*).*? ([0-9\-.]*).*?\/([0-9\-.]*).*? ([0-9\-.]*).*?\/([0-9\-.]*).*? ([0-9\-.]*).*?\/([0-9\-.]*)(.*)$/gim;        
        var findFaceColor = /[0-9\/.]* ([0-9])$/;
        var findTextureCoordinates = /vt ([0-9\-.]*) ([0-9\-.]*) ([0-9\-.]*)/gim;

        var matches = false;

        /*
        while (matches = findColors.exec(objContent)) {
            colors.push([parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])]);
        }
        */
       
        while (matches = findVertices.exec(objContent)) {
            vertices.push([parseFloat(matches[1])*-1, parseFloat(matches[2]), parseFloat(matches[3])]);
        }
        
        while (matches = findTextureCoordinates.exec(objContent)) {
            textureCoordinates.push([parseFloat(matches[1]), parseFloat(matches[2]), parseFloat(matches[3])]);
        }
 
        var elementGroup = new css3d.element();

        var count = 0;
        
        while (matches = findFaces1.exec(objContent)) {
            faceMatches.push(matches);
        }
        
        while (matches = findFaces2.exec(objContent)) {
            faceMatches.push(matches);
        }

        var i=0
        while (matches = faceMatches[i++]) {
            
            if (matches.length < 5) {
                continue;
            }
       
            if (matches.length >= 9) {
                var f0 = Math.abs(parseInt(matches[1]))-1;
                var f1 = Math.abs(parseInt(matches[3]))-1;
                var f2 = Math.abs(parseInt(matches[5]))-1;
                var f3 = Math.abs(parseInt(matches[7]))-1;
                
                var ft0 = Math.abs(parseInt(matches[2]))-1;
                var ft1 = Math.abs(parseInt(matches[4]))-1;
                var ft2 = Math.abs(parseInt(matches[6]))-1;
                var ft3 = Math.abs(parseInt(matches[8]))-1;
                
                var vt0 = new css3d.vector3(textureCoordinates[ft0][0], textureCoordinates[ft0][1], textureCoordinates[ft0][2]);
                var vt1 = new css3d.vector3(textureCoordinates[ft1][0], textureCoordinates[ft1][1], textureCoordinates[ft1][2]);
                var vt2 = new css3d.vector3(textureCoordinates[ft2][0], textureCoordinates[ft2][1], textureCoordinates[ft2][2]);
                var vt3 = new css3d.vector3(textureCoordinates[ft3][0], textureCoordinates[ft3][1], textureCoordinates[ft3][2]);
            }
            else if (matches.length >= 5) {
                var f0 = Math.abs(parseInt(matches[1]))-1;
                var f1 = Math.abs(parseInt(matches[2]))-1;
                var f2 = Math.abs(parseInt(matches[3]))-1;
                var f3 = Math.abs(parseInt(matches[4]))-1;
            }
                  
            var v0 = new css3d.vector3(vertices[f0][0], vertices[f0][1], vertices[f0][2]);
            var v1 = new css3d.vector3(vertices[f1][0], vertices[f1][1], vertices[f1][2]);
            var v2 = new css3d.vector3(vertices[f2][0], vertices[f2][1], vertices[f2][2]);
            var v3 = new css3d.vector3(vertices[f3][0], vertices[f3][1], vertices[f3][2]);
            
            // get normal    
            var normal = css3d.vector3.prototype.cross(
                css3d.vector3.prototype.sub2(v1, v0),
                css3d.vector3.prototype.sub2(v2, v0)
            ).normalize();
    
            if (!clockwise) {
                normal.x = -normal.x;
                normal.y = -normal.y;
                normal.z = -normal.z;
            }
            
            // build rotation matrix
            var xAxis = css3d.vector3.prototype.cross(normal, css3d.vector3.prototype.sub2(v1, v0).normalize()).normalize();
            var yAxis = css3d.vector3.prototype.cross(normal, xAxis);
            var zAxis = normal;

            var rotationMatrix = [
                xAxis.x, yAxis.x, zAxis.x, 0,
                xAxis.y, yAxis.y, zAxis.y, 0,
                xAxis.z, yAxis.z, zAxis.z, 0,
                0, 0, 0, 1
            ];
           
            // get dimension
            var width = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2) + Math.pow(v2.z - v1.z, 2)).toFixed(4);            
            var height = Math.sqrt(Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2) + Math.pow(v1.z - v0.z, 2)).toFixed(4);                       

            // get position
            var x = ((v0.x + v1.x + v2.x + v3.x) / 4.0);
            var y = ((v0.y + v1.y + v2.y + v3.y) / 4.0);
            var z = ((v0.z + v1.z + v2.z + v3.z) / 4.0);
 
            // build element
            var div = document.createElement('div');
            div.className = className+' '+className+'-'+count;
            div.style.position = 'absolute';
            div.style.width = width+'px';
            div.style.height = height+'px';
            div.style.backgroundColor = '#ccc';
            
            // texture mapping
            if (matches.length >= 9) {
                var tx0 = vt0.x * textureSize;
                var ty0 = textureSize - (vt0.y * textureSize); 
                var tx1 = vt1.x * textureSize;
                var ty1 = textureSize - (vt1.y * textureSize); 
                var tx2 = vt2.x * textureSize;
                var ty2 = textureSize - (vt2.y * textureSize); 
                var tx3 = vt3.x * textureSize;
                var ty3 = textureSize - (vt3.y * textureSize);
       
                var vWidth = tx3 - tx1;
                if (vWidth < 0) {
                    vWidth = tx1 - tx3;
                    tx1 = tx2;
                }                
                var vHeight = ty3 - ty1;
                if (vHeight < 0) {
                    vHeight = ty1 - ty3;
                    ty1 = ty2;
                }
                
                var scaleX = width/vWidth;
                var scaleY = height/vHeight;
                
                // TODO:
                // there is a problem with texture rotation
                // some elements are 90 or 180 degrees rotated
                div.style.backgroundPosition = (-tx1*scaleX).toFixed(4)+'px '+(-ty1*scaleY).toFixed(4)+'px';
                div.style.backgroundImage = 'url("'+textureFile+'")';
                div.style.backgroundSize = (textureSize*scaleX).toFixed(4)+'px '+(textureSize*scaleY).toFixed(4)+'px';
            }            
            
            container.appendChild(div);
            
            var element = new css3d.element(div);
            element.setBackfaceCulling(backfaceCulling);
            element.shading = shading;
            element.setTranslation(x, y, z);
            element.setRotationMatrix(rotationMatrix);
            element.inheritScaling = true;            
            element.setParent(elementGroup);
            scene.addElement(element);

            count++;
        }        
       
        console.log('obj file loaded. ' + count + ' faces');
        
        elementGroup.setScale(-1, -1, 1);        
        
        scene.addElement(elementGroup);
        
        return elementGroup;
        
    }
    
    



};
/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.math
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @namespace
 */
css3d.math = {};

/**
 * 
 * @param {Number} value1
 * @param {Number} value2
 * @param {Number} amount 0-1
 * @returns {Number}
 */
css3d.math.lerp = function(value1, value2, amount)
{
    return value1 + (value2 - value1) * amount;
};

/**
 * 
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
css3d.math.randomNumber = function(min, max)
{
    return Math.random() * (max - min) + min;
};

/**
 * 
 * @param {Number} min
 * @param {Number} max
 * @returns {Integer}
 */
css3d.math.randomInteger = function(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/* http://forum.thegamecreators.com/?m=forum_view&t=193433&b=41&msg=2307919#m2307919 */
/* http://sol.gfxile.net/interpolation/ */

/**
 * 
 * @namespace
 */
css3d.math.interpolation = {};

/**
 * 
 * @param {Number} t 0-1
 * @returns {Number}
 */
css3d.math.interpolation.hermite = function(t)
{
    return css3d.math.lerp(0, 1, t * t * (3.0 - 2.0 * t))
};

/**
 * 
 * @param {Number} t 0-1
 * @returns {Number}
 */
css3d.math.interpolation.sinerp = function(t)
{
    return css3d.math.lerp(0, 1, Math.sin(t * Math.PI * 0.5))
};

/**
 * 
 * @param {Number} t 0-1
 * @returns {Number}
 */
css3d.math.interpolation.bounce = function(t)
{
    return 1 - Math.abs(Math.sin(5.5*(t+1)*(t+1)) * (1-t));
};

/**
 * 
 * @param {Number} t 0-1
 * @returns {Number}
 */
css3d.math.interpolation.berp = function(t)
{
    return (Math.sin(t * Math.PI * (0.2 + 2.5 * t * t * t)) * Math.pow(1.01 - t, 2.2) + t) * (1.0 + (1.2 * (1.0 - t)));
};

/**
 * 
 * @param {Number} t 0-1
 * @returns {Number}
 */
css3d.math.interpolation.smoothStep = function(t)
{
    var v = t/1;
    return -2*v * v *v + 3*v * v;
};


/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.matrix4
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @namespace
 */
css3d.matrix4 = {

    D2R : (Math.PI/180),

    /**
     * 
     * @returns {Array}
     */
    identity : function()
    {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    },

    /**
     * 
     * @param {Array} a
     * @param {Array} b
     * @returns {Array}
     */
    multiply : function(a, b)
    {
        return [
            a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
            a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
            a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
            a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],

            a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12],
            a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13],
            a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
            a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],

            a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12],
            a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13],
            a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
            a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],

            a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12],
            a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13],
            a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
            a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15]
        ];
    },

    /**
     * 
     * @param {Number} angle
     * @returns {Array}
     */
    rotationX : function(angle)
    {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [
            1, 0,  0, 0,
            0, c, -s, 0,
            0, s,  c, 0,
            0, 0,  0, 1
        ];
    },

    /**
     * 
     * @param {Number} angle
     * @returns {Array}
     */
    rotationY : function(angle)
    {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [
            c, 0, s, 0,
            0, 1, 0, 0,
           -s, 0, c, 0,
            0, 0, 0, 1
        ];
    },

    /**
     * 
     * @param {Number} angle
     * @returns {Array}
     */
    rotationZ : function(angle)
    {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [
            c, -s, 0, 0,
            s,  c, 0, 0,
            0,  0, 1, 0,
            0,  0, 0, 1
        ];
    },

    /**
     * 
     * @param {css3d.vector3} axis
     * @param {Number} angle
     * @returns {Array}
     */
    rotationAxis : function(axis, angle)
    {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var t = 1 - c;
        var x = axis.x, y = axis.y, z = axis.z;
        var tx = t * x, ty = t * y;
        return [
            tx * x + c,     tx * y - s * z, tx * z + s * y, 0,
            tx * y + s * z, ty * y + c,     ty * z - s * x, 0,
            tx * z - s * y, ty * z + s * x, t * z * z + c,  0,
            0,              0,              0,              1
        ];
    },

    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {Array}
     */
    scale : function(x, y, z)
    {
        return [
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ];
    },

    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {Array}
     */
    translation : function(x, y, z)
    {
        return [
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        ];
    },

    /**
     * 
     * @param {Array} matrix
     * @returns {css3d.vector3}
     */
    right : function(matrix)
    {
        return new css3d.vector3(matrix[0], matrix[4], matrix[8]);
    },

    /**
     * 
     * @param {Array} matrix
     * @returns {css3d.vector3}
     */
    up : function(matrix)
    {
        return new css3d.vector3(-matrix[1], -matrix[5], -matrix[9]);
    },

    /**
     * 
     * @param {Array} matrix
     * @returns {css3d.vector3}
     */
    back : function(matrix)
    {
        return new css3d.vector3(matrix[2], matrix[6], matrix[10]);
    },
    
    /**
     * 
     * @param {Array} matrix
     * @returns {css3d.vector3}
     */
    forward : function(matrix)
    {
        return new css3d.vector3(-matrix[2], -matrix[6], -matrix[10]);
    },

    /**
     * 
     * @param {Number} left
     * @param {Number} right
     * @param {Number} bottom
     * @param {Number} top
     * @param {Number} near
     * @param {Number} far
     * @returns {Array}
     */
    frustum : function(left, right, bottom, top, near, far)
    {
        var rMl = right - left;
        var tMb = top - bottom;
        var fMn = far - near;
        var n2 = 2 * near;
        return [
            n2/rMl, 0,      (right+left)/rMl, 0,
            0,      n2/tMb, (top+bottom)/tMb, 0,
            0,      0,      -(far+near)/fMn,  -2*(far*near)/fMn,
            0,      0,      -1,               0

        ];
    },

    /**
     * 
     * @param {Number} fov
     * @param {Number} width
     * @param {Number} height
     * @param {Number} near
     * @param {Number} far
     * @returns {Array}
     */
    projection : function(fov, width, height, near, far)
    {
        var radians = fov * this.D2R;
    	var halfHeight = (Math.tan(radians/2)*near);
    	var halfAspectRatio = halfHeight*(width/height);
    	return this.frustum(-halfAspectRatio, halfAspectRatio, -halfHeight, halfHeight, near, far);
    },

    /**
     * 
     * @param {css3d.vector3} eye
     * @param {css3d.vector3} target
     * @param {css3d.vector3} up
     * @returns {Array}
     */
    lookAt : function(eye, target, up)
    {
        //http://msdn.microsoft.com/en-us/library/windows/desktop/bb281710(v=vs.85).aspx

        var _target = new css3d.vector3(target.x, target.y, target.z);
        var _eye = new css3d.vector3(eye.x, eye.y, eye.z);

        var zaxis = _eye.sub(_target).normalize();
        var xaxis = css3d.vector3.prototype.cross(zaxis, up).normalize();
        var yaxis = css3d.vector3.prototype.cross(zaxis, xaxis);
        /*
        return [
            xaxis.x, yaxis.x, zaxis.x, eye.x,
            xaxis.y, yaxis.y, zaxis.y, eye.y,
            xaxis.z, yaxis.z, zaxis.z, eye.z,
            0,       0,       0,       1
        ];
        */
        return [
            xaxis.x, yaxis.x, zaxis.x, 0,
            xaxis.y, yaxis.y, zaxis.y, 0,
            xaxis.z, yaxis.z, zaxis.z, 0,
            0,       0,       0,       1
        ];
    },

    /**
     * 
     * @param {Array} m
     * @returns {Array}
     */
    transpose : function(m)
    {
        return [
            m[0], m[4], m[8],  m[12],
            m[1], m[5], m[9],  m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
        ];
    },
 
    /**
     * Works if matrix only contains rotation and translation part
     * 
     * @param {Array} m
     * @returns {Array}
     */
    fastInverse : function(m)
    {
        // http://harinadha.wordpress.com/tag/model-view-matrix-inverse/

        var x = -m[3]*m[0] + -m[7]*m[4] + -m[11]*m[8];
        var y = -m[3]*m[1] + -m[7]*m[5] + -m[11]*m[9];
        var z = -m[3]*m[2] + -m[7]*m[6] + -m[11]*m[10];

        return [
            m[0], m[4], m[8],  x,
            m[1], m[5], m[9],  y,
            m[2], m[6], m[10], z,
            0,    0,    0,     1
        ];
    },

    /**
     * Matrix has to be a rotation matrix
     * 
     * @param {Array} m
     * @returns {Object} {'axis':{css3d.vector3}, 'angle':{Number}}
     */
    toAxisAngle : function(m)
    {              
        var quaternion = css3d.quaternion.prototype.fromMatrix4(m);
        return quaternion.toAxisAngle();
    },
    
    /**
     * 
     * @param {Array} m
     * @returns {String}
     */
    toString : function(m)
    {
        var out = '';
        out += m[0].toFixed(2)+',\t'+m[1].toFixed(2)+',\t'+m[2].toFixed(2)+',\t'+m[3].toFixed(2)+','+"\n";
        out += m[4].toFixed(2)+',\t'+m[5].toFixed(2)+',\t'+m[6].toFixed(2)+',\t'+m[7].toFixed(2)+','+"\n";
        out += m[8].toFixed(2)+',\t'+m[9].toFixed(2)+',\t'+m[10].toFixed(2)+',\t'+m[11].toFixed(2)+','+"\n";
        out += m[12].toFixed(2)+',\t'+m[13].toFixed(2)+',\t'+m[14].toFixed(2)+',\t'+m[15].toFixed(2);
        out += '';
        return out;
    }
    
    



};

/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.quaternion
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.quaternion
 * @class
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} w
 * @returns {css3d.quaternion}
 */
css3d.quaternion = (function()
{

    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {Number} w
     * @returns {css3d.quaternion}
     */
    var quaternion = function(x, y, z, w)
    {
        /**
         * x value
         * @type {Number}
         * @memberof! css3d.quaternion
         * @instance
         */
        this.x = x || 0;
        /**
         * y value
         * @type {Number}
         * @memberof! css3d.quaternion
         * @instance
         */
        this.y = y || 0;
        /**
         * z value
         * @type {Number}
         * @memberof! css3d.quaternion
         * @instance
         */
        this.z = z || 0;
        /**
         * w value
         * @type {Number}
         * @memberof! css3d.quaternion
         * @instance
         */
        this.w = w || 1;

        this.TOLERANCE = 0.00001;
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.normalize = function()
    {
        var mag2 = this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
        if (Math.abs(mag2) > this.TOLERANCE && Math.abs(mag2 - 1) > this.TOLERANCE) {
            var mag = Math.sqrt(mag2);
            this.x /= mag;
            this.y /= mag;
            this.z /= mag;
            this.w /= mag;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.getConjugate = function()
    {
        return new css3d.quaternion(-this.x, -this.y, -this.z, this.w);
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {css3d.quaternion} rq
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.multiply = function(rq)
    {
        return new css3d.quaternion(
            this.w * rq.x + this.x * rq.w + this.y * rq.z - this.z * rq.y,
            this.w * rq.y + this.y * rq.w + this.z * rq.x - this.x * rq.z,
            this.w * rq.z + this.z * rq.w + this.x * rq.y - this.y * rq.x,
            this.w * rq.w - this.x * rq.x - this.y * rq.y - this.z * rq.z
        );
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {css3d.vector3} v
     * @returns {css3d.vector3}
     */
    quaternion.prototype.multiplyVector = function(v)
    {
        var vn = new css3d.vector3(v.x, v.y, v.z);
    	vn.normalize();

        var vecQuat = new css3d.quaternion();
    	vecQuat.x = vn.x;
    	vecQuat.y = vn.y;
    	vecQuat.z = vn.z;
    	vecQuat.w = 0;
        
    	var resQuat = vecQuat.multiply(this.getConjugate());
    	resQuat = this.multiply(resQuat);

    	return new css3d.vector3(resQuat.x, resQuat.y, resQuat.z);
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {css3d.vector3} axis
     * @param {Number} angle
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.fromAxisAngle = function(axis, angle)
    {
        angle *= 0.5;
        var sinAngle = Math.sin(angle);

        return new css3d.quaternion(
            axis.x * sinAngle,
            axis.y * sinAngle,
            axis.z * sinAngle,
            Math.cos(angle)
        );
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.fromXYZ = function(x, y, z)
    {
        x *= 0.5;
        y *= 0.5;
        z *= 0.5;

        var sinp = Math.sin(y);
        var siny = Math.sin(z);
        var sinr = Math.sin(x);
        var cosp = Math.cos(y);
        var cosy = Math.cos(z);
        var cosr = Math.cos(x);

        return new css3d.quaternion(
            sinr * cosp * cosy - cosr * sinp * siny,
            cosr * sinp * cosy + sinr * cosp * siny,
            cosr * cosp * siny - sinr * sinp * cosy,
            cosr * cosp * cosy + sinr * sinp * siny
        ).normalize();
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {Array} m
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.fromMatrix4 = function(m)
    {
        var tr = m[0] + m[5] + m[10];

        var q = new css3d.quaternion();

        if (tr > 0) {
            var s = Math.sqrt(tr+1) * 2;
            q.w = 0.25 * s;
            q.x = (m[9] - m[6]) / s;
            q.y = (m[2] - m[8]) / s;
            q.z = (m[4] - m[1]) / s;
        }
        else if ((m[0] > m[5])&(m[0] > m[10])) {
            var s = Math.sqrt(1 + m[0] - m[5] - m[10]) * 2;
            q.w = (m[9] - m[6]) / s;
            q.x = 0.25 * s;
            q.y = (m[1] + m[4]) / s;
            q.z = (m[2] + m[8]) / s;
        }
        else if (m[5] > m[10]) {
            var s = Math.sqrt(1 + m[5] - m[0] - m[10]) * 2;
            q.w = (m[2] - m[8]) / s;
            q.x = (m[1] + m[4]) / s;
            q.y = 0.25 * s;
            q.z = (m[6] + m[9]) / s;
        }
        else {
            var s = Math.sqrt(1 + m[10] - m[0] - m[5]) * 2;
            q.w = (m[4] - m[1]) / s;
            q.x = (m[2] + m[8]) / s;
            q.y = (m[6] + m[9]) / s;
            q.z = 0.25 * s;
        }
        return q;
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {Array}
     */
    quaternion.prototype.toMatrix4 = function()
    {
        var x2 = this.x * this.x;
        var y2 = this.y * this.y;
        var z2 = this.z * this.z;
        var xy = this.x * this.y;
        var xz = this.x * this.z;
        var yz = this.y * this.z;
        var wx = this.w * this.x;
        var wy = this.w * this.y;
        var wz = this.w * this.z;

        // TODO: transpose ?
        return [
            1 - 2 * (y2 + z2), 2 * (xy - wz)    , 2 * (xz + wy)    , 0,
            2 * (xy + wz)    , 1 - 2 * (x2 + z2), 2 * (yz - wx)    , 0,
            2 * (xz - wy)    , 2 * (yz + wx)    , 1 - 2 * (x2 + y2), 0,
            0                , 0                , 0                , 1
        ];
    };

    /**
     * http://nic-gamedev.blogspot.de/2011/11/quaternion-math-getting-local-axis.html
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {css3d.vector3}
     */
    quaternion.prototype.right = function()
    {
        return new css3d.vector3(
            1 - 2 * (this.y * this.y + this.z * this.z),
            2 * (this.x * this.y + this.w * this.z),
            2 * (this.x * this.z - this.w * this.y)
        );
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {css3d.vector3}
     */
    quaternion.prototype.up = function()
    {
        return new css3d.vector3(
            2 * (this.x * this.y - this.w * this.z),
            1 - 2 * (this.x * this.x + this.z * this.z),
            2 * (this.y * this.z + this.w * this.x)
        );
    };

    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {css3d.vector3}
     */
    quaternion.prototype.forward = function()
    {
        return new css3d.vector3(
            2 * (this.x * this.z + this.w * this.y),
            2 * (this.y * this.x - this.w * this.x),
            1 - 2 * (this.x * this.x + this.y * this.y)
        );
    };

    /**
     * if t=0 then qm=qa, if t=1 then qm=qb
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @param {css3d.quaternion} qa
     * @param {css3d.quaternion} qb
     * @param {Number} t 0-1
     * @returns {css3d.quaternion}
     */
    quaternion.prototype.slerp = function(qa, qb, t)
    {
        // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

    	// quaternion to return
    	var qm = new css3d.quaternion();
    	// Calculate angle between them.
    	var cosHalfTheta = qa.w * qb.w + qa.x * qb.x + qa.y * qb.y + qa.z * qb.z;

        if (cosHalfTheta < 0) {
            qb.w = -qb.w; qb.x = -qb.x; qb.y = -qb.y; qb.z = qb.z;
            cosHalfTheta = -cosHalfTheta;
        }

    	// if qa=qb or qa=-qb then theta = 0 and we can return qa
    	if (Math.abs(cosHalfTheta) >= 1) {
            qm.w = qa.w;qm.x = qa.x;qm.y = qa.y;qm.z = qa.z;            
            return qm;
    	}

    	// Calculate temporary values.
    	var halfTheta = Math.acos(cosHalfTheta);
    	var sinHalfTheta = Math.sqrt(1 - cosHalfTheta*cosHalfTheta);

    	// if theta = 180 degrees then result is not fully defined
    	// we could rotate around any axis normal to qa or qb
    	if (Math.abs(sinHalfTheta) < 0.001) {
            qm.w = (qa.w * 0.5 + qb.w * 0.5);
            qm.x = (qa.x * 0.5 + qb.x * 0.5);
            qm.y = (qa.y * 0.5 + qb.y * 0.5);
            qm.z = (qa.z * 0.5 + qb.z * 0.5);            
            return qm;
    	}

    	var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    	var ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    	//calculate Quaternion.
    	qm.w = (qa.w * ratioA + qb.w * ratioB);
    	qm.x = (qa.x * ratioA + qb.x * ratioB);
    	qm.y = (qa.y * ratioA + qb.y * ratioB);
    	qm.z = (qa.z * ratioA + qb.z * ratioB);        
    	return qm;
    };
    
    /**
     * 
     * @memberof! css3d.quaternion
     * @instance
     * @returns {Object} {'axis':{css3d.vector3}, 'angle':{Number}}
     */
    quaternion.prototype.toAxisAngle = function()
    {
        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm
        
        if (this.w > 1) this.normalize();
        var angle = 2 * Math.acos(this.w);
        var s = Math.sqrt(1-this.w*this.w);
        var axis = new css3d.vector3();
        if (s < 0.001) {            
            axis.x = this.x;
            axis.y = this.y;
            axis.z = this.z;
        } 
        else {
            axis.x = this.x / s;
            axis.y = this.y / s;
            axis.z = this.z / s;
        }
        return {
            'axis': axis,
            'angle': angle
        };
    };


    return quaternion;

}());
/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.scene
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.scene
 * @class
 * @returns {css3d.scene}
 */
css3d.scene = (function()
{

    /**
     * 
     * @returns {css3d.scene}
     */
    var scene = function()
    {
        this._elements = [];
        this._camera = new css3d.camera();
        this._light = new css3d.vector3(0, 0, -1).normalize();
        this._shadingIntensity = 0.7;
        
        this.depthCueing = true;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @returns {Array}
     */
    scene.prototype.getElements = function()
    {
        return this._elements;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @param {css3d.element} element
     * @returns {css3d.scene}
     */
    scene.prototype.addElement = function(element)
    {
        this._elements.push(element);
        return this;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @param {String} id
     * @returns {css3d.element|null}
     */
    scene.prototype.getElementById = function(id)
    {
        for (var i=0;i<this._elements.length;i++) {
            if (null != this._elements[i]._domElement && this._elements[i]._domElement.id == id) {
                return this._elements[i];
            }
        }
        return null;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @returns {css3d.camera}
     */
    scene.prototype.getCamera = function()
    {
        return this._camera;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @returns {css3d.vector3}
     */
    scene.prototype.getLight = function()
    {
        return this._light;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @returns {Number}
     */
    scene.prototype.getShadingIntensity = function()
    {
        return this._shadingIntensity;
    };

    /**
     * 
     * @memberof! css3d.scene
     * @instance
     * @returns {css3d.scene}
     */
    scene.prototype.update = function()
    {
        var elements = this._elements;

        // create element world matrix
        for (var i=0;i<elements.length;i++) {
            elements[i].update();
        }

        // create camera view matrix
        this._camera.update();

        return this;
    };

    return scene;

}());
/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.vector3
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.vector3
 * @class
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @returns {css3d.vector3}
 */
css3d.vector3 = (function(css3d)
{
    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.vector3}
     */
    var vector3 = function(x, y, z)
    {
        /**
         * x value
         * @type {Number}
         * @memberof! css3d.vector3
         * @instance
         */
        this.x = x || 0;
        /**
         * y value
         * @type {Number}
         * @memberof! css3d.vector3
         * @instance
         */ 
        this.y = y || 0;
        /**
         * z value
         * @type {Number}
         * @memberof! css3d.vector3
         * @instance
         */
        this.z = z || 0;
    };
    
    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {css3d.vector3}
     */
    vector3.prototype.set = function(x, y, z)
    {
	this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        return this;
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @returns {Number}
     */
    vector3.prototype.magnitude = function()
    {
	return Math.sqrt((this.x*this.x)+(this.y*this.y)+(this.z*this.z));
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @returns {css3d.vector3}
     */
    vector3.prototype.normalize = function()
    {
        var m = this.magnitude();
        if (m !== 0) {
            this.x /= m;
            this.y /= m;
            this.z /= m;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {css3d.vector3} b
     * @returns {Number}
     */
    vector3.prototype.dot = function(b)
    {
        return (this.x * b.x) + (this.y * b.y) + (this.z * b.z);
    };
    
    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {css3d.vector3} a
     * @param {css3d.vector3} b
     * @returns {Number}
     */
    vector3.prototype.dot2 = function(a, b)
    {        
        return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);        
    };

    /**
     * A vector which is perpendicular to both of the vectors
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {css3d.vector3} a
     * @param {css3d.vector3} b
     * @returns {css3d.vector3}
     */
    vector3.prototype.cross = function(a, b)
    {
        var c = new css3d.vector3(
            a.y*b.z - a.z*b.y,
            a.z*b.x - a.x*b.z,
            a.x*b.y - a.y*b.x
        );
        return c;
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {css3d.vector3} b
     * @returns {css3d.vector3}
     */
    vector3.prototype.sub = function(b)
    {
        this.x -= b.x;
        this.y -= b.y;
        this.z -= b.z;
        return this;
    };
    
    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {css3d.vector3} a
     * @param {css3d.vector3} b
     * @returns {css3d.vector3}
     */
    vector3.prototype.sub2 = function(a, b)
    {
        var c = new css3d.vector3(
            a.x - b.x,
            a.y - b.y,
            a.z - b.z
        );
        return c;
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @param {Array} matrix4
     * @returns {css3d.vector4}
     */
    vector3.prototype.transform = function(matrix4)
    {
        return new css3d.vector4(
            this.x * matrix4[0] + this.y * matrix4[1] + this.z * matrix4[2] + matrix4[3],
            this.x * matrix4[4] + this.y * matrix4[5] + this.z * matrix4[6] + matrix4[7],
            this.x * matrix4[8] + this.y * matrix4[9] + this.z * matrix4[10] + matrix4[11],
            this.x * matrix4[12] + this.y * matrix4[13] + this.z * matrix4[14] + matrix4[15]
        );
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @returns {css3d.vector3}
     */
    vector3.prototype.clone = function()
    {
        return new css3d.vector3(this.x, this.y, this.z);
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @returns {String}
     */
    vector3.prototype.toString = function()
    {
        return this.x.toFixed(2)+','+this.y.toFixed(2)+','+this.z.toFixed(2);
    };

    /**
     * 
     * @memberof! css3d.vector3
     * @instance
     * @returns {Boolean}
     */
    vector3.prototype.isZero = function()
    {
        return (this.x == 0 && this.y == 0 && this.z == 0);
    };
    
    vector3.prototype.distance = function(a, b)
    {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    };

    return vector3;

}(css3d));
/**
 * CSS 3D engine
 *
 * @category    css3d
 * @package     css3d.vector4
 * @author      Jan Fischer, bitWorking <info@bitworking.de>
 * @copyright   2014 Jan Fischer
 * @license     http://www.opensource.org/licenses/mit-license.html  MIT License
 */

/**
 * 
 * @name css3d.vector4
 * @class
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @param {Number} w
 * @returns {css3d.vector4}
 */
css3d.vector4 = (function()
{
    /**
     * 
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {Number} w
     * @returns {css3d.vector4}
     */
    var vector4 = function(x, y, z, w)
    {
        /**
         * x value
         * @type {Number}
         * @memberof! css3d.vector4
         * @instance
         */
        this.x = x || 0;
        /**
         * y value
         * @type {Number}
         * @memberof! css3d.vector4
         * @instance
         */
        this.y = y || 0;
        /**
         * z value
         * @type {Number}
         * @memberof! css3d.vector4
         * @instance
         */
        this.z = z || 0;
        /**
         * w value
         * @type {Number}
         * @memberof! css3d.vector4
         * @instance
         */
        this.w = w || 1;
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @returns {css3d.vector4}
     */
    vector4.prototype.homogenize = function()
    {
        if (this.w !== 1) {
            this.x /= this.w;
            this.y /= this.w;
            this.z /= this.w;
            this.w = 1;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @returns {Number}
     */
    vector4.prototype.magnitude = function()
    {
        return Math.sqrt((this.x*this.x)+(this.y*this.y)+(this.z*this.z) +(this.w*this.w));
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @returns {css3d.vector4}
     */
    vector4.prototype.normalize = function()
    {
        var m = this.magnitude();
        if (m !== 0) {
            this.x /= m;
            this.y /= m;
            this.z /= m;
            this.w /= m;
        }
        return this;
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @param {css3d.vector4} b
     * @returns {Number}
     */
    vector4.prototype.dot = function(b)
    {
        // angle between 2 vectors
        return (this.x * b.x) + (this.y * b.y) + (this.z * b.z) + (this.w + b.w);
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @param {css3d.vector4} a
     * @param {css3d.vector4} b
     * @returns {css3d.vector4}
     */
    vector4.prototype.cross = function(a, b)
    {
        // a vector which is perpendicular to both of the vectors
        var a = new css3d.vector4(a.x, a.y, a.z, a.w).homogenize();
        var b = new css3d.vector4(b.x, b.y, b.z, b.w).homogenize();
        var c = new css3d.vector4(
            a.y*b.z - a.z*b.y,
            a.z*b.x - a.x*b.z,
            a.x*b.y - a.y*b.x,
            1
        );
        c.normalize();
        return c;
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @param {Array} matrix4
     * @returns {css3d.vector4}
     */
    vector4.prototype.transform = function(matrix4)
    {
        return new css3d.vector4(
            this.x * matrix4[0] + this.y * matrix4[1] + this.z * matrix4[2] + this.w * matrix4[3],
            this.x * matrix4[4] + this.y * matrix4[5] + this.z * matrix4[6] + this.w * matrix4[7],
            this.x * matrix4[8] + this.y * matrix4[9] + this.z * matrix4[10] + this.w * matrix4[11],
            this.x * matrix4[12] + this.y * matrix4[13] + this.z * matrix4[14] + this.w * matrix4[15]
        );
    };

    /**
     * 
     * @memberof! css3d.vector4
     * @instance
     * @returns {css3d.vector3}
     */
    vector4.prototype.toVector3 = function()
    {
        return new css3d.vector3(this.x, this.y, this.z);
    };

    
    return vector4;

}());
