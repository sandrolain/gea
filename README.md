# HL

Experimental Javascript Template String Parser Like *lit-html* but with real DOM and without virtual DOM.
This function convert extendend HTML strings to DOM nodes.


## Description

The *hl* tag function requires an extended html string with simple objects, DOM nodes, functions or arrays and returns a Fragment DOM.


## Reasons

There are a number of functions, libraries and frameworks that manage the virtual DOM in various ways. In any case the webapp structure is created, however the native result for the browser is the same: a **Document Object Model**.
I think therefore that at the level of performance there is nothing better than using the real DOM directly rather than the virtual DOM, which then still acts on the real one.

Webapps have existed even before the various react, vue, etc ... only before that it was much more difficult to build and modify the structure of the webapp interface, and in this sense the various manipulation libraries came in handy like prototype.js, mootools, jquery, backbone.js, etc ... but anyway the various elements that needed special attention, like initializing properties, attributes and events, things that required to **break the structure into many small parts, modify them and then bring them together** to create the desired result. A laborious job that increased the complexity and the disorder of the code.

Thanks to **ES6, the template strings and tag functions** can ease the construction work of the interface using simple html structures, limiting the programming part to the only modification and interaction with the DOM nodes that require it.

This is an experiment that wants to re-bring the logic of the components to the native DOM, giving a slightly more genuine feeling.

If you are interested, however, you are free to use it and share it.


## ToDo

- [ ] Add some comments to the code


## Next Experiments

- [ ] Tag function for CSS structure to DOM text node