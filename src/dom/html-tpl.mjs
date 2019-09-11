import {request} from "../lib/http.mjs";
import html, {Component} from "./html.mjs";
import {Sheet} from "./css.mjs";

////////////////////////////////////////////////////////////////
// Template Component

const tplComponentsMap = new Map();

class TplComponent extends Component
{
	constructor({props, name, script, style, children})
	{
		super(props, children);

		this.name = name;

		if(script)
		{
			const fn = new Function("component", "refs", "ids", "state", script);

			fn.call(this, this, this.refs, this.ids, this.state);
		}
	}

	render(props, children)
	{
		return children.shift();
	}
}


const getComponentFromTemplate = (name) =>
{
	if(tplComponentsMap.has(name))
	{
		return tplComponentsMap.get(name);
	}

	const $template = document.querySelector(`template#${name}`);

	const tagName	= $template.getAttribute("data-tag-name");

	// var clone = document.importNode($template.content, true);

	const viewRE	= /<view[\s\S]*?>([\s\S]*)?<\/view>/i;
	const scriptRE	= /<script[\s\S]*?>([\s\S]*)?<\/script>/i;
	const styleRE	= /<style[\s\S]*?>([\s\S]*)?<\/style>/i;

	const tplHTML 		= $template.innerHTML;

	const matchView		= tplHTML.match(viewRE);
	const matchScript	= tplHTML.match(scriptRE);
	const matchStyle	= tplHTML.match(styleRE);

	var viewHTML		= matchView ? matchView[1] : null;
	const script		= matchScript ? matchScript[1] : null;
	const style			= matchStyle ? matchStyle[1] : null;

	if(style)
	{
		Sheet.getStyleSheet({sheetName: `template-${name}`, media: "screen", content: style});
	}

	// tplHTML = tplHTML.trim();
	viewHTML = viewHTML.split(/\${children}/mi);

	const fn = function(props = {}, ...children)
	{
		return new TplComponent({
			props,
			name,
			script,
			style,
			children: html(viewHTML, [children])
		});
	};

	if(tagName)
	{
		Component.assignTagName(tagName, fn);
	}

	tplComponentsMap.set(name, fn);

	return fn;
};

const tpl = new Proxy({
	load: async (url) =>
	{

		const html = await request(url, {parse: "text"});

		const $node = document.createElement("div");

		$node.innerHTML = html;

		const $$templates = Array.from($node.getElementsByTagName("template"));

		const result = {};

		for(let $template of $$templates)
		{
			document.body.appendChild($template);

			let name = $template.id;

			let comp = getComponentFromTemplate(name);

			result[name] = comp;
		}

		return result;
	}
}, {
	get: (target, name) =>
	{
		if(name in target)
		{
			return target[name];
		}

		return getComponentFromTemplate(name);
	}
});

export default tpl;
