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


