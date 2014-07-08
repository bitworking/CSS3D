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
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
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