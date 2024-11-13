# Labyrinth
A port of the classic labyrinth tabletop game to web with javascript and ammo.js for physics.

## Things I learned about Ammo.js
* There is no way to generate holes in a physics engine. The idea is that concave objects are the default, and if you have a convex object, it's gonna cost a lot of processing power and you're going to have to import its vertices individually like you would a mesh.
* Ammo.js is a port of the bullet physics engine. There isn't great documentation for ammo specifically, but the docs for bullet are fine, if a little c++. There are some exports from Bullet to Ammo that are missing, but they are mostly unneeded. 
* Enable.js takes all of the BS boilerplate out of ammo, so it's probably the preferred way of handling ammo. Maybe cannon.js does this as well, idk. 
* CSG, constructive solid geometry is another method to make holes. There's a library for it for three.js, but it turned out to be overkill.
* There is a holes property on THREE.Shape! You can add holes this way and then extrude the geometry.

