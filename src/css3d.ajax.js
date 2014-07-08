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