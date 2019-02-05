
export class ComponentFragment
{
	constructor($container, callbacksMap)
	{
		this.$$nodes		= Array.from($container.childNodes);
		this.callbacksMap	= callbacksMap || new Map();

		// Obtain refs
		const $$refNodes	= $container.querySelectorAll(`[ref]`);
		const refsMap			= new Map();

		for(let $refNode of $$refNodes)
		{
			let refName		= $refNode.getAttribute('ref');

			if(refName)
			{
				refsMap.set(refName, $refNode);
			}
			
			$refNode.removeAttribute('ref');
		}

		const stateMap = new Map();

		const stateProxy = new Proxy(stateMap, {
			has: (target, name) =>
			{
				return target.has(name);
			},
			get: (target, name) =>
			{
				return target.get(name);
			},
			set: (target, name, value) =>
			{
				const newState = {};
				newState[name] = value;

				this.setState(newState);
			},
			deleteProperty: (target, name) =>
			{
				return target.delete(name);
			}
		});

		const refsProxy = new Proxy(refsMap, {
			has: (target, name) =>
			{
				return target.has(name);
			},
			get: (target, name) =>
			{
				return target.get(name);
			}
		});


		this.stateMap	= stateMap;
		this.state		= stateProxy;
		this.refsMap	= refsMap;
		this.refs		= refsProxy;

		this.updateCallbacks();
	}

	update()
	{
		this.updateCallbacks();

		return this;
	}

	updateCallbacks()
	{
		this.callbacksMap.forEach((row) =>
		{
			const res = row.callback.call(this, this.state, this.refs);

			if(res !== false)
			{
				for(let $node of row.$$nodes)
				{
					if($node.parentNode)
					{
						$node.parentNode.removeChild($node);
					}
				}

				row.result	= res;

				row.$$nodes	= ComponentFragment.getNodesFromResult(res);

				for(let $node of row.$$nodes)
				{
					row.$placeholder.parentNode.insertBefore($node, row.$placeholder);
				}
			}
		});
	}

	fireChangeEvent(keys, oldState)
	{
		const eventsList = ['statechange'].concat(keys.map((key) =>
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
					refs: this.refs
				}
			});

			for(let $node of this.refsMap.values())
			{
				$node.dispatchEvent(event);
			}

		
			// for(let $node of this.$$nodes)
			// {
			// 	$node.dispatchEvent(event);

			// 	let $$allChilds = $node.querySelectorAll('*');

			// 	for(let $child of $$allChilds)
			// 	{
			// 		$child.dispatchEvent(event);
			// 	}
			// }
		}

		this.updateCallbacks();
	}

	setState(obj)
	{
		const keys		= [];
		const oldState	= {};

		for(let key in obj)
		{
			oldState[key] = this.stateMap.get(key);

			this.stateMap.set(key, obj[key]);

			keys.push(key);
		}

		this.fireChangeEvent(keys, oldState);
	}

	getState(key)
	{
		if(key instanceof Array)		
		{
			const res = {};

			for(let k in key)
			{
				res[k] = this.stateMap.get(k);
			}

			return res;
		}

		return this.stateMap.get(key);
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

	static isDOMNode(arg)
	{
		return (arg instanceof HTMLElement || arg instanceof Text || arg instanceof Comment || arg instanceof DocumentFragment);
	}

	static isComponent(arg)
	{
		return (arg instanceof ComponentFragment || arg instanceof Component);
	}

	static from(source)
	{
		const $temp = document.createElement("div");

		const addNode = function(src)
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
			return style.split(';').map((row) => row.trim().split(':')).reduce((res, item) =>
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

	static getNodesFromResult(res)
	{
		const argType = typeof res;

		if(res === null || argType == "undefined")
		{
			return [document.createTextNode(res + "")];
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
		
		if(ComponentFragment.isComponent(res))
		{
			return res.getNodes();
		}

		return [];
	}

	static getUniqueId()
	{
		if(!this._uid)
		{
			this._uid = 0;
		}

		return `hluid-${++this._uid}`;
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

		if(render instanceof ComponentFragment)
		{
			this.fragment = render;
		}
		else if(render instanceof Component)
		{
			this.fragment = render.fragment;
		}
		else
		{
			this.fragment = ComponentFragment.from(render);
		}

		if(this.fragment)
		{
			this.fragment.updateCallbacks();
		}
	}

	render()
	{
		return null;
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

	appendTo($node)
	{
		return this.fragment.appendTo($node);
	}

	getNodes()
	{
		return this.fragment.getNodes();
	}
}

const html = (parts, ...args) =>
{
	const html		= [];
	const propsMap	= new Map();
	const nodesMap	= new Map();
	const cbcksMap	= new Map();

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
			}
			else
			{
				return {value: getCbcksPlaceholder(arg)};
			}
			
			argType = typeof arg;
		}

		if(argType == "undefined" || argType == "boolean" || arg === null)
		{
			return false;
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
		
		if(ComponentFragment.isDOMNode(arg))
		{
			return {value: getNodePlaceholder(arg)};
		}
		
		if(ComponentFragment.isComponent(arg))
		{
			return {value: getNodePlaceholder(arg.getDOMFragment())};
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
					$node.addEventListener(name, value);
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
				else
				{
					$node.setAttribute(name, value);
				}
			}
		}

		$node.removeAttribute('data-hlid');
	}
	
	for(let [id, $newNode] of nodesMap.entries())
	{
		let $placeholderNode = $temp.querySelector(`[data-hlid="${id}"]`);
		
		$placeholderNode.parentNode.insertBefore($newNode, $placeholderNode);

		$placeholderNode.parentNode.removeChild($placeholderNode);
	}
	
	return new ComponentFragment($temp, cbcksMap);
};
	
export default html;
