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

		this.callbacksMap.forEach((callbackInfo) =>
		{
			const res = callbackInfo.callback.call(this, {
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
						this._applyCallback(callbackInfo, res.result);
					}

					res.then((res) =>
					{
						if(this._isValidCallbackResult(res))
						{
							this._applyCallback(callbackInfo, res);
						}

					}).catch((e) =>
					{
						console.error("Phased Callback Update Error", e);
					});
				}
				else if(res instanceof Promise)
				{
					// this._applyCallback(callbackInfo, null);

					res.then((res) =>
					{
						if(this._isValidCallbackResult(res))
						{
							this._applyCallback(callbackInfo, res);
						}

					}).catch((e) =>
					{
						console.error("Promised Callback Update Error", e);
					});
				}
				else
				{
					this._applyCallback(callbackInfo, res);
				}
			}
		});
	}

	_isValidCallbackResult(res)
	{
		const type = typeof res;

		return (type !== "undefined" && type !== "boolean" && !(type == "number" && isNaN(res)));
	}

	_applyCallback(callbackInfo, res)
	{
		// Prevent multiple rendering of the same result
		if(callbackInfo.result === res)
		{
			return false;
		}

		if(callbackInfo.inTag)
		{
			if(callbackInfo.$target)
			{
				// TODO: gestire aggiornamento listener
				ComponentFragment.applyPropsToDOMNode(callbackInfo.$target, res, callbackInfo);
			}
		}
		else
		{
			ComponentFragment.batchMethod(callbackInfo.components, "willUnmount");
			ComponentFragment.detachNodes(callbackInfo.$$nodes);
			ComponentFragment.batchMethod(callbackInfo.components, "didUnmount");

			callbackInfo.components	= ComponentFragment.getComponentsFromResult(res);
			callbackInfo.result		= res;

			ComponentFragment.batchMethod(callbackInfo.components, "willMount");

			callbackInfo.$$nodes	= ComponentFragment.getNodesFromResult(res);

			ComponentFragment.appendBefore(callbackInfo.$placeholder, callbackInfo.$$nodes);
			ComponentFragment.batchMethod(callbackInfo.components, "didMount");
		}
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

	getState(key, def)
	{
		return this.state.getState(key, def);
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
		return arg.__is_state__;
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

		return `hl${++this._uid}`;
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

	static applyPropsToDOMNode($node, props, callbackInfo = null)
	{
		if(props instanceof Array)
		{
			for(let prop of props)
			{
				this.applyPropsToDOMNode($node, prop);
			}
		}
		else if(typeof props == "object")
		{
			for(let name in props)
			{
				let value     = props[name];
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
					else if(valueType == "string" || valueType == "number")
					{
						$node.setAttribute(name, `${value}`);
					}
					else if(value instanceof Date)
					{
						$node.setAttribute(name, value.toISOString());
					}
					else
					{
						try {
							$node.setAttribute(name, JSON.stringify(value));
						}
						catch(e)
						{
							console.error(e);
						}
					}
				}
			}
		}
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

	getState(key, def)
	{
		return this.fragment.getState(key, def);
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

	const getNodePlaceholder = ($node, id) =>
	{
		id = id || ComponentFragment.getUniqueId();

		nodesMap.set(id, $node);

		return `<div data-hlid="${id}"></div>`;
	};

	const getPropsPlaceholder = (props, id) =>
	{
		id = id || ComponentFragment.getUniqueId();

		const propsList = propsMap.get(id) || [];

		propsList.push(props);

		propsMap.set(id, propsList);

		return ` data-hlid="${id}" `;
	};

	const getCbcksPlaceholder = (callback, inTag, id) =>
	{
		id = id || ComponentFragment.getUniqueId();

		if(inTag)
		{
			cbcksMap.set(id, {
				inTag,
				id: id,
				callback: callback
			});

			return getPropsPlaceholder(callback, id);
		}

		const plc = document.createComment(id);

			cbcksMap.set(id, {
				inTag,
				id: id,
				$placeholder: plc,
				callback: callback,
				$$nodes: []
			});

			return getNodePlaceholder(plc, id);
	};

	let lastInTag = false;
	let lastTagId = null;

	const applyArgumentToPosition = (arg, prevStr, nextStr) =>
	{
		let argType	= typeof arg;
		let closeOrContinueTag = !!(nextStr && nextStr.match(/^([^<]*>.*|[^><]+)$/m));
		let hasClosedTag = !!prevStr.match(/>/m);
		let inTag	= !!(
			(prevStr.match(/<[^>]+$/m)
				|| (lastInTag
					&& prevStr.match(/^[^><]+$/m)))
			&& closeOrContinueTag
		);
		let alreadyInTag = (inTag && lastInTag && !hasClosedTag);

		let tagId = alreadyInTag ? lastTagId : ComponentFragment.getUniqueId();

		lastInTag = inTag;
		lastTagId = tagId;

		const checkArgType = (arg) =>
		{
			if(argType == "function")
			{
				if(arg.prototype instanceof Component)
				{
					arg = new arg();

					return {
						value: getNodePlaceholder(arg),
						inTag
					};
				}

				return {
					value: getCbcksPlaceholder(arg, inTag, tagId),
					inTag
				};
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
				return {
					value: arg,
					inTag
				};
			}

			if(arg instanceof Array)
			{
				let arrRes = arg.map((val) =>
				{
					let resVal = checkArgType(val);

					return resVal ? resVal.value : "";
				});

				return {
					value: arrRes.join(""),
					inTag
				};
			}

			if(ComponentFragment.isCallback(arg))
			{
				return {
					value: getCbcksPlaceholder(arg, inTag, tagId),
					inTag
				};
			}

			if(ComponentFragment.isState(arg))
			{
				state = arg;

				return false;
			}

			if(ComponentFragment.isDOMNode(arg))
			{
				return {
					value: getNodePlaceholder(arg),
					inTag
				};
			}

			if(ComponentFragment.isComponentFragment(arg))
			{
				return {
					value: getNodePlaceholder(arg.getDOMFragment()),
					inTag
				};
			}

			if(ComponentFragment.isComponent(arg))
			{
				return {
					value: getNodePlaceholder(arg),
					inTag
				};
			}

			if(arg instanceof ClassRule)
			{
				return {
					value: getPropsPlaceholder({className: arg.className}, tagId),
					inTag
				};
			}

			// TODO: Promise case?

			if(argType == "object")
			{
				return {
					value: getPropsPlaceholder(arg, tagId),
					inTag
				};
			}

			return false;
		};

		return checkArgType(arg);
	};

	for(let i = 0, len = parts.length; i < len; i++)
	{
		let str = parts[i],
			nextStr = parts[i + 1];

		html.push(str);

		let resArg = applyArgumentToPosition(args.shift(), str, nextStr);

		html.push(resArg ? resArg.value : "");
	}

	// Convert HTML pieces to DOM Node
	const $temp = document.createElement("div");

	$temp.innerHTML = html.join("").trim();


	for(let [id, row] of cbcksMap.entries())
	{
		if(row.inTag)
		{
			let $node = $temp.querySelector(`[data-hlid="${id}"]`);

			if($node)
			{
				row.$target = $node;
			}
		}
	}






	for(let [id, props] of propsMap.entries())
	{
		let $node = $temp.querySelector(`[data-hlid="${id}"]`);

		ComponentFragment.applyPropsToDOMNode($node, props);

		// $node.removeAttribute("data-hlid");
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






