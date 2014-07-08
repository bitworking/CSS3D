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
        this.x = x || 0;
        this.y = y || 0;
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

    return vector3;

}(css3d));