import html, {Component} from "./html.mjs";
import {mergeDeep} from "../lib/utils.mjs";

////////////////////////////////////////////////////////////////+
// Tag Component

const tagComponentsMap = new Map();

class ElComponent extends Component
{
	render(props, children)
	{
		return children.shift();
	}
}

const getTagCreator = (tagName) =>
{
	if(tagComponentsMap.has(tagName))
	{
		return tagComponentsMap.get(tagName);
	}

	const fn = (attrs = {}, style = null) =>
	{
		if(style)
		{
			attrs = mergeDeep(attrs, {style});
		}

		return function(props, ...children)
		{
			var actAttrs = mergeDeep({}, attrs, props || {});

			return new ElComponent(props, html`<${tagName} ${actAttrs}>${children}</${tagName}>`);
		};
	};

	tagComponentsMap.set(tagName, fn);

	return fn;
};

const tag = new Proxy({}, {
	get: (target, name) =>
	{
		return getTagCreator(name);
	}
});


export default tag;
