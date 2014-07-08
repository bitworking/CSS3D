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