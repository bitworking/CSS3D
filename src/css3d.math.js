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

