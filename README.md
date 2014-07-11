CSS3D
=====

CSS 3D engine

### Features
* No need for browser prefixes
* Shading
* Because a matrix is calculated for every element it works in IE10, too
* Full camera movements
* Import obj files
* matrix4, quaternion, vector3, vector4
* Different interpolations
* Render loop with requestAnimationFrame and callback
* Easy setup and progressive enhancement
* No dependency to other javascript libraries

```javascript
var engine = new css3d(document.getElementById('container'));         
var scene = new css3d.scene();
var content = new css3d.element(document.getElementById('content'));
content.setRotationXYZ(Math.PI / 8, 0, 0);
scene.addElement(content);
engine.setScene(scene);
engine.update().render();
```

### TODO
* Collision detection
* Build scene from json
* Depth cueing
* Animation system
* ~~Use textures/uvw coordinates from obj file~~
* Billboard element
* Speed/memory optimization

### More infos
http://css3d.bitworking.de/
