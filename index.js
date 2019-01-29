
export class ComponentFragment
{
	constructor($container)
	{
		this.$$nodes = Array.from($container.childNodes);


		// Obtain refs
		const $$refNodes	= $container.querySelectorAll(`[ref]`);
		const refs			= new Map();

		for(let $refNode of $$refNodes)
		{
			let refName		= $refNode.getAttribute('ref');

			if(refName)
			{
				refs.set(refName, $refNode);
			}
			
			$refNode.removeAttribute('ref');
		}

		const stateObj = new Map();

		const stateProxy = new Proxy(stateObj, {
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
				const oldValue = target.get(name);

				target.set(name, value);

				this.fireChangeEvent([name]);
			},
			deleteProperty: (target, name) =>
			{
				return target.delete(name);
			}
		});

		const refsProxy = new Proxy(refs, {
			has: (target, name) =>
			{
				return target.has(name);
			},
			get: (target, name) =>
			{
				return target.get(name);
			}
		});


		this.stateObj	= stateObj;
		this.state		= stateProxy;
		this.refs		= refsProxy;
	}

	// TODO: pass old value
	fireChangeEvent(keys)
	{
		const eventsList = ['statechange'].concat(keys.map((key) =>
		{
			return `statechange:${key}`;
		}));

		for(let eventName of eventsList)
		{
			const event = new CustomEvent(eventName, {
				detail: {
					// TODO: pass old state key:value
					state: this.state,
					refs: this.refs
				}
			});
		
			for(let $node of this.$$nodes)
			{
				$node.dispatchEvent(event);

				let $$allChilds = $node.querySelectorAll('*');

				for(let $child of $$allChilds)
				{
					$child.dispatchEvent(event);
				}
			}
		}
	}

	setState(obj)
	{
		const keys = [];

		for(let key in obj)
		{
			this.stateObj.set(key, obj[key]);

			keys.push(key);
		}

		this.fireChangeEvent(keys);
	}

	getState(key)
	{
		const res = {};

		if(key instanceof Array)		
		{
			for(let k in key)
			{
				res[k] = this.stateObj.get(k);
			}
		}
		else
		{
			res[key] = this.stateObj.get(key);
		}

		return res;
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
		return (arg instanceof HTMLElement || arg instanceof Text || arg instanceof DocumentFragment);
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
		const render = this.render();

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
	}

	render()
	{
		return null;
	}

	setState(state)
	{
		return this.fragment.setState();
	}

	getState(key)
	{
		return this.fragment.getState(key);
	}

	getDOMFragment()
	{
		return this.fragment.getDOMFragment();
	}
}

const html = (parts, ...args) =>
{
	const html		= [];
	const propsMap	= new Map();
	const nodesMap	= new Map();
	var	uid			= 0;

	const getUniqueId = function()
	{
		return `hluid-${++uid}`;
	};

	const getNodePlaceholder = ($node) =>
	{
		const id = getUniqueId();

		nodesMap.set(id, $node);

		return `<div data-hlid="${id}"></div>`;
	};

	const getPropsPlaceholder = (props) =>
	{
		const id = getUniqueId();

		propsMap.set(id, props);

		return ` data-hlid="${id}" `;
	};
	
	for(let str of parts)
	{
		html.push(str);
		
		let arg = args.shift();
		
		let argType = typeof arg;
		
		if(argType == "function")
		{
			if(arg.prototype instanceof Component)
			{
				arg = new arg();
			}
			else
			{
				arg = arg();
			}
			
			argType = typeof arg;
		}
		
		if(argType != "undefined" && arg !== null)
		{
			if(argType == "object")
			{
				if(arg instanceof Array)
				{
					let arrRes = [];
					
					for(let val of arg)
					{
						let valType = typeof val;

						if(valType == "function")
						{
							if(val.prototype instanceof Component)
							{
								val = new val();
							}
							else
							{
								val = val();
							}
							
							valType = typeof val;
						}

						if(valType == "object")
						{
							if(ComponentFragment.isDOMNode(val))
							{
								arrRes.push(getNodePlaceholder(val));
							}
							else if(ComponentFragment.isComponent(val))
							{
								arrRes.push(getNodePlaceholder(val.getDOMFragment()));
							}
						}
						else if(valType == "string" || valType == "number")
						{
							arrRes.push(`${val}`);
						}
					}

					html.push(arrRes.join(""));
				}
				else if(ComponentFragment.isDOMNode(arg))
				{
					html.push(getNodePlaceholder(arg));
				}
				else if(ComponentFragment.isComponent(arg))
				{
					html.push(getNodePlaceholder(arg.getDOMFragment()));
				}
				// NOTE: Promise case?
				else
				{
					html.push(getPropsPlaceholder(arg))
				}
			}
			else if(argType == "string" || argType == "number")
			{
				html.push(arg); 
			}
			
		}
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
	
	return new ComponentFragment($temp);
};
	
export default html;
