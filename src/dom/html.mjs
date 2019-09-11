import State from "../lib/State.mjs";
import * as DOM from "../lib/dom.mjs";
import {PhasedCallback, PhasedResult, ConditionalCallback} from "../lib/callbacks.mjs";
import {ClassRule} from "./css.mjs";

////////////////////////////////////////////////////////////////

export class ComponentFragment
{
	constructor($container, state, refsMap, callbacksMap)
	{
		this.$$nodes		= Array.from($container.childNodes);
		this.refsMap		= refsMap || ComponentFragment.getRefsMapFromDOMNode($container);
		this.callbacksMap	= callbacksMap || new Map();

		const refsProxy = new Proxy(this.refsMap, {
			has: (target, name) =>
			{
				return target.has(name);
			},
			get: (target, name) =>
			{
				return target.get(name);
			}
		});

		const idsProxy = new Proxy(this, {
			has: (target, name) =>
			{
				return !!document.getElementById(name);
			},
			get: (target, name) =>
			{
				return document.getElementById(name);
			}
		});


		this.refs		= refsProxy;
		this.ids		= idsProxy;

		this.assignState(state);

		// this.updateCallbacks();
	}

	assignState(state)
	{
		if(this.state)
		{
			this.state.unbindTarget(this);
		}

		this.state		= state || new State();

		this.state.bindTarget(this);
	}

	update(opts = {})
	{
		this.updateCallbacks(opts);

		return this;
	}

	updateCallbacks({keys, oldState})
	{
		keys = keys || this.state.getKeys();

		this.callbacksMap.forEach((row) =>
		{
			const res = row.callback.call(this, {
				keys,
				oldState,
				state: this.state,
				refs: this.refs,
				ids: this.ids
			});

			if(this._isValidCallbackResult(res))
			{
				if(res instanceof PhasedResult)
				{
					if(this._isValidCallbackResult(res.result))
					{
						this._applyCallback(row, res.result);
					}

					res.then((res) =>
					{
						if(this._isValidCallbackResult(res))
						{
							this._applyCallback(row, res);
						}

					}).catch((e) =>
					{
						console.error("Phased Callback Update Error", e);
					});
				}
				else if(res instanceof Promise)
				{
					// this._applyCallback(row, null);

					res.then((res) =>
					{
						if(this._isValidCallbackResult(res))
						{
							this._applyCallback(row, res);
						}

					}).catch((e) =>
					{
						console.error("Promised Callback Update Error", e);
					});
				}
				else
				{
					this._applyCallback(row, res);
				}
			}
		});
	}

	_isValidCallbackResult(res)
	{
		const type = typeof res;

		return (type !== "undefined" && type !== "boolean" && !(type == "number" && isNaN(res)));
	}

	_applyCallback(row, res)
	{
		// Prevent multiple rendering of the same result
		if(row.result === res)
		{
			return false;
		}

		ComponentFragment.batchMethod(row.components, "willUnmount");
		ComponentFragment.detachNodes(row.$$nodes);
		ComponentFragment.batchMethod(row.components, "didUnmount");

		row.components	= ComponentFragment.getComponentsFromResult(res);
		row.result		= res;

		ComponentFragment.batchMethod(row.components, "willMount");

		row.$$nodes	= ComponentFragment.getNodesFromResult(res);

		ComponentFragment.appendBefore(row.$placeholder, row.$$nodes);
		ComponentFragment.batchMethod(row.components, "didMount");
	}

	isAttached()
	{
		return document.body.contains(this.$$nodes[0]);
	}

	onChange({keys, oldState})
	{
		if(!this.isAttached())
		{
			return false;
		}

		const eventsList = ["statechange"].concat(keys.map((key) =>
		{
			return `statechange:${key}`;
		}));

		for(let eventName of eventsList)
		{
			const event = new CustomEvent(eventName, {
				detail: {
					fragment: this,
					oldState,
					state: this.state,
					refs: this.refs,
					ids: this.ids
				}
			});

			for(let $node of this.refsMap.values())
			{
				$node.dispatchEvent(event);
			}


			// for(let $node of this.$$nodes)
			// {
			// 	$node.dispatchEvent(event);

			// 	let $$allChilds = $node.querySelectorAll("*");

			// 	for(let $child of $$allChilds)
			// 	{
			// 		$child.dispatchEvent(event);
			// 	}
			// }
		}

		this.updateCallbacks({keys, oldState});
	}

	setState(newState)
	{
		this.state.setState(newState);
	}

	getState(key)
	{
		return this.state.getState(key);
	}

	getNodes()
	{
		return this.$$nodes.slice(0);
	}

	removeAllNodes()
	{
		for(let $node of this.$$nodes)
		{
			if($node.parentNode)
			{
				$node.parentNode.removeChild($node);
			}
		}
	}

	insertNodesBefore($dest)
	{
		for(let $node of this.$$nodes)
		{
			$dest.parentNode.insertBefore($node, $dest);
		}
	}

	replaceWith(comp)
	{
		if(comp instanceof ComponentFragment)
		{
			const $first = this.$$nodes[0];

			comp.insertNodesBefore($first);

			this.removeAllNodes();
		}
	}

	appendTo($dest)
	{
		if(typeof $dest == "string")
		{
			$dest = document.querySelector($dest);
		}

		for(let $node of this.$$nodes)
		{
			$dest.appendChild($node);
		}
	}

	replaceTo($dest)
	{
		if($dest.parentNode)
		{
			this.insertNodesBefore($dest);

			$dest.parentNode.removeChild($dest);
		}
	}

	getDOMFragment()
	{
		const $f = document.createDocumentFragment();

		for(let $node of this.$$nodes)
		{
			$f.appendChild($node);
		}

		return $f;
	}

	static isPhasedCallback(arg)
	{
		return (arg instanceof PhasedCallback);
	}

	static isConditionalCallback(arg)
	{
		return (arg instanceof ConditionalCallback);
	}

	static isCallback(arg)
	{
		return this.isPhasedCallback(arg) || this.isConditionalCallback(arg);
	}

	static isState(arg)
	{
		return (arg.constructor === State);
	}

	static isDOMNode(arg)
	{
		return (arg instanceof HTMLElement || arg instanceof Text || arg instanceof Comment || arg instanceof DocumentFragment);
	}

	static isComponent(arg)
	{
		return (arg instanceof Component);
	}

	static isComponentFragment(arg)
	{
		return (arg instanceof ComponentFragment);
	}

	static isComponentType(arg)
	{
		return (arg instanceof ComponentFragment || arg instanceof Component);
	}

	static from(source)
	{
		if(source instanceof ComponentFragment)
		{
			return source;
		}

		if(source instanceof Component)
		{
			return source.fragment;
		}

		const $temp = document.createElement("div");

		const addNode = (src) =>
		{
			const type = typeof src;

			if(type == "string"|| type == "number")
			{
				$temp.innerHTML += src;
			}
			else if(this.isDOMNode(src))
			{
				$temp.appendChild(src);
			}
			else if(src instanceof Array)
			{
				for(let item of src)
				{
					addNode(item);
				}
			}
		};

		addNode(source);

		return new ComponentFragment($temp);
	}


	static getClassNames(className)
	{
		var type = typeof className;

		if(type == "string")
		{
			return className.split(/\s+/).map((cls) => cls.trim()).filter((cls) => !!cls);
		}

		if(type == "object")
		{
			if(className instanceof Array)
			{
				return className.map((item) => this.getClassNames(item)).reduce((res, item) => res.concat(item), []);
			}
			else
			{
				let res = [];

				for(let cls in className)
				{
					if(className[cls])
					{
						res.push(cls);
					}
				}

				return res;
			}
		}

		return [];
	}


	static getStyles(style)
	{
		var type = typeof style;

		if(type == "string")
		{
			return style.split(";").map((row) => row.trim().split(":")).reduce((res, item) =>
			{
				let key = item[0].trim();

				if(key && key !== "")
				{
					res[key] = (item[1] || "").trim();
				}

				return res;
			}, {});
		}

		if(type == "object")
		{
			if(style instanceof Array)
			{
				return style.reduce((res, item) => Object.assign(res, this.getStyles(item)), {});
			}
			else
			{
				let res = {};

				for(let propName in style)
				{
					let propValue = style[propName];

					if(typeof propValue == "number")
					{
						propValue = `${propValue}px`;
					}

					propName =  propName.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

					res[propName] = propValue;
				}

				return res;
			}
		}

		return {};
	}

	static getComponentsFromResult(res)
	{
		if(ComponentFragment.isComponent(res))
		{
			return [res];
		}

		if(res instanceof Array)
		{
			let arrRes = res.map((val) =>
			{
				return this.getComponentsFromResult(val);
			});

			return [].concat.apply([], arrRes);
		}

		return [];
	}

	static getNodesFromResult(res)
	{
		const argType = typeof res;

		if(res === null || argType == "undefined")
		{
			return [];
		}

		if(argType == "string" || argType == "number")
		{
			return [document.createTextNode(res + "")];
		}

		if(res instanceof Array)
		{
			let arrRes = res.map((val) =>
			{
				return this.getNodesFromResult(val);
			});

			return [].concat.apply([], arrRes);
		}

		if(ComponentFragment.isDOMNode(res))
		{
			return res;
		}

		if(ComponentFragment.isComponentType(res))
		{
			return res.getNodes();
		}

		if(argType == "object")
		{
			return this.getNodesFromTree(res);
		}

		return [];
	}

	static getNodesFromTree(domTree)
	{
		if(domTree instanceof Array)
		{
			var res = [];

			for(const treeItem of domTree)
			{
				res = res.concat(this.getNodesFromTree(treeItem));
			}

			return res;
		}

		const type = typeof domTree;

		if(type == "string" || type == "number")
		{
			return [document.createTextNode(`${domTree}`)];
		}

		// If the value is already a DOM node return it directly
		if(ComponentFragment.isDOMNode(domTree))
		{
			return [domTree];
		}

		var $el;

		// If tagName is omitted or is  equal to "#", create new DOM fragment
		if(!domTree.tagName || domTree.tagName == "#")
		{
			$el = document.createDocumentFragment();
		}
		else
		{
			$el = document.createElement(domTree.tagName);
		}

		if(domTree.properties)
		{
			for(const name in domTree.properties)
			{
				$el[name] = domTree.properties[name];
			}
		}

		const directProperties = ["className", "innertText", "innerHTML", "textContent"];

		for(const propName of directProperties)
		{
			if(propName in domTree)
			{
				$el[propName] = domTree[propName];
			}
		}

		if(domTree.attributes)
		{
			for(const name in domTree.attributes)
			{
				$el.setAttribute(name, domTree.attributes[name]);
			}
		}

		if(domTree.events)
		{
			for(const name in domTree.events)
			{
				$el.addEventListener(name, domTree.events[name]);
			}
		}

		if(domTree.children)
		{
			if(domTree.children instanceof Array)
			{
				for(const childVdom of domTree.children)
				{
					const $$nodes = this.getNodesFromTree(childVdom);

					for(const $node of $$nodes)
					{
						$el.appendChild($node);
					}
				}
			}
			else
			{
				const $$nodes = this.getNodesFromTree(domTree.children);

				for(const $node of $$nodes)
				{
					$el.appendChild($node);
				}
			}
		}


		return [$el];
	}

	static getNodesFromHTML(html)
	{
		const $temp = document.createElement("div");

		$temp.innerHTML = html;

		return Array.from($temp.childNodes);
	}

	static getUniqueId()
	{
		if(!this._uid)
		{
			this._uid = 0;
		}

		return `hluid-${++this._uid}`;
	}

	static detachNodes($$nodes)
	{
		for(let $node of $$nodes)
		{
			if($node.parentNode)
			{
				$node.parentNode.removeChild($node);
			}
		}
	}

	static appendBefore($target, $$nodes)
	{
		if($target && $$nodes)
		{
			for(let $node of $$nodes)
			{
				$target.parentNode.insertBefore($node, $target);
			}
		}
	}

	static batchMethod(list, method, ...args)
	{
		if(list)
		{
			for(let item of list)
			{
				item[method](...args);
			}
		}
	}

	static getRefsMapFromDOMNode($node)
	{
		const refsMap		= new Map();
		const $$refNodes	= $node.querySelectorAll("[ref]");

		for(const $refNode of $$refNodes)
		{
			const refName = $refNode.getAttribute("ref");

			if(refName)
			{
				refsMap.set(refName, $refNode);
			}
		}

		return refsMap;
	}
}



export class Component
{
	constructor(props, ...children)
	{
		this.props		= props || {};
		this.children	= children || [];

		this.init();
	}

	init()
	{
		const render = this.render(this.props, this.children);

		this.fragment = ComponentFragment.from(render);

		if(this.fragment)
		{
			this.fragment.update();
		}
	}

	render()
	{
		return null;
	}

	get ids()
	{
		return this.fragment.ids;
	}

	get refs()
	{
		return this.fragment.refs;
	}

	get state()
	{
		return this.fragment.state;
	}

	setState(state)
	{
		return this.fragment.setState(state);
	}

	getState(key)
	{
		return this.fragment.getState(key);
	}

	getDOMFragment()
	{
		return this.fragment.getDOMFragment();
	}

	getNodes()
	{
		return this.fragment.getNodes();
	}

	detach()
	{
		if(this.isAttached())
		{
			this.willUnmount();

			ComponentFragment.detachNodes(this.getNodes());

			this.didUnmount();
		}
	}

	appendTo($node)
	{
		this.detach();

		this.willMount();

		this.fragment.appendTo($node);

		this.didMount();
	}

	isAttached()
	{
		return this.fragment.isAttached();
	}

	willUnmount()
	{

	}

	didUnmount()
	{

	}

	willMount()
	{

	}

	didMount()
	{

	}

	static assignTagName(tagName, component)
	{
		if(!this._componentsTags)
		{
			this._componentsTags = new Map();
		}

		this._componentsTags.set(tagName, component);
	}

	static replaceComponentTagsIntoNode($node)
	{
		const result = new Set();

		if(this._componentsTags)
		{
			for(let [tag, CompoConstr] of this._componentsTags.entries())
			{
				let $$tagNodes = DOM.byTagName($node, tag);

				for(let $tagNode of $$tagNodes)
				{
					let props     = DOM.getAttributesObject($tagNode);
					let childs    = DOM.getChildren($tagNode);
					let compoInst = new CompoConstr(props, ...childs);

					DOM.replaceWithNode($tagNode, compoInst.getDOMFragment());

					result.add(compoInst);
				}
			}
		}

		return result;
	}
}

const html = (parts, ...args) =>
{
	if(!(parts instanceof Array))
	{
		parts = [parts];
	}


	const html		= [];
	const propsMap	= new Map();
	const nodesMap	= new Map();
	const cbcksMap	= new Map();
	var state		= new State();

	const getNodePlaceholder = ($node) =>
	{
		const id = ComponentFragment.getUniqueId();

		nodesMap.set(id, $node);

		return `<div data-hlid="${id}"></div>`;
	};

	const getPropsPlaceholder = (props) =>
	{
		const id = ComponentFragment.getUniqueId();

		propsMap.set(id, props);

		return ` data-hlid="${id}" `;
	};

	const getCbcksPlaceholder = (callback) =>
	{
		const id = ComponentFragment.getUniqueId();

		const plc = document.createComment(id);

		cbcksMap.set(id, {
			$placeholder: plc,
			callback: callback,
			$$nodes: []
		});

		return getNodePlaceholder(plc);
	};

	const checkArgType = (arg) =>
	{
		let argType = typeof arg;

		if(argType == "function")
		{
			if(arg.prototype instanceof Component)
			{
				arg = new arg();

				return {value: getNodePlaceholder(arg)};
			}

			return {value: getCbcksPlaceholder(arg)};
		}

		if(argType == "undefined" || arg === null)
		{
			return false;
		}

		if(argType == "boolean")
		{
			return arg;
		}

		if(argType == "string" || argType == "number")
		{
			return {value: arg};
		}

		if(arg instanceof Array)
		{
			let arrRes = arg.map((val) =>
			{
				let resVal = checkArgType(val);

				return resVal ? resVal.value : "";
			});

			return {value: arrRes.join("")}
		}

		if(ComponentFragment.isCallback(arg))
		{
			return {value: getCbcksPlaceholder(arg)};
		}

		if(ComponentFragment.isState(arg))
		{
			state = arg;

			return false;
		}

		if(ComponentFragment.isDOMNode(arg))
		{
			return {value: getNodePlaceholder(arg)};
		}

		if(ComponentFragment.isComponentFragment(arg))
		{
			return {value: getNodePlaceholder(arg.getDOMFragment())};
		}

		if(ComponentFragment.isComponent(arg))
		{
			return {value: getNodePlaceholder(arg)};
		}

		if(arg instanceof ClassRule)
		{
			return {value: getPropsPlaceholder({
				className: arg.className
			})};
		}

		// NOTE: Promise case?

		if(argType == "object")
		{
			return {value: getPropsPlaceholder(arg)};
		}

		return false;
	};

	for(let str of parts)
	{
		html.push(str);

		let resArg = checkArgType(args.shift());

		html.push(resArg ? resArg.value : "");
	}


	// Convert HTML pieces to DOM Node

	const $temp = document.createElement("div");

	$temp.innerHTML = html.join("").trim();

	for(let [id, props] of propsMap.entries())
	{
		let $node = $temp.querySelector(`[data-hlid="${id}"]`);

		for(let name in props)
		{
			let value = props[name];

			let valueType = typeof value;

			if(valueType != "undefined" && valueType !== null)
			{
				if(valueType == "function")
				{
					const eventNames = name.split(";");

					for(let eventName of eventNames)
					{
						$node.addEventListener(eventName, value);
					}
				}
				else if(name == "className")
				{
					let classList = ComponentFragment.getClassNames(value);

					for(let cls of classList)
					{
						$node.classList.add(cls);
					}
				}
				else if(name == "style")
				{
					let style = ComponentFragment.getStyles(value);

					for(let styleProp in style)
					{
						$node.style.setProperty(styleProp, style[styleProp]);
					}
				}
				else if(valueType == "boolean")
				{
					if(value)
					{
						$node.setAttribute(name, name);
					}
					else
					{
						$node.removeAttribute(name);
					}
				}
				else
				{
					$node.setAttribute(name, value);
				}
			}
		}

		$node.removeAttribute("data-hlid");
	}


	// Obtain refs bofore add child fragments
	const refsMap		= ComponentFragment.getRefsMapFromDOMNode($temp);


	for(let [id, $newNode] of nodesMap.entries())
	{
		let $placeholderNode = $temp.querySelector(`[data-hlid="${id}"]`);

		if(ComponentFragment.isComponent($newNode))
		{
			$newNode.willMount();

			let $fragment = $newNode.getDOMFragment();

			$placeholderNode.parentNode.insertBefore($fragment, $placeholderNode);

			$newNode.didMount();
		}
		else
		{
			$placeholderNode.parentNode.insertBefore($newNode, $placeholderNode);
		}

		$placeholderNode.parentNode.removeChild($placeholderNode);
	}

	Component.replaceComponentTagsIntoNode($temp);

	return new ComponentFragment($temp, state, refsMap, cbcksMap);
};

export default html;






