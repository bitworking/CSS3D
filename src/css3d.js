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
