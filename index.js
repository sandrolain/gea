
const hl = (parts, ...args) =>
{
	const html		= [];
	const propsMap	= new Map();
	const $$nodes	= new Map();
	var	uid			= 0;

	const getUniqueId = function()
	{
		return `hluid-${++uid}`;
	};

	const getNodePlaceholder = ($node) =>
	{
		const id = getUniqueId();

		$$nodes.set(id, $node);

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
			arg = arg();
			
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
							val = val();
							
							valType = typeof arg;
						}

						if(valType == "object")
						{
							if(val instanceof HTMLElement || val instanceof Text || val instanceof DocumentFragment)
							{
								arrRes.push(getNodePlaceholder(val));
							}
						}
						else if(valType == "string" || valType == "number")
						{
							arrRes.push(`${val}`);
						}
					}

					html.push(arrRes.join(""));
				}
				else if(arg instanceof HTMLElement || arg instanceof Text || arg instanceof DocumentFragment)
				{
					html.push(getNodePlaceholder(arg));
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


	const getClassNames = (className) =>
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
				return className.map((item) => getClassNames(item)).reduce((res, item) => res.concat(item), []);
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
	};

	const getStyles = function(style)
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
				return style.reduce((res, item) => Object.assign(res, getStyles(item)), {});
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
	};

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
					let classList = getClassNames(value);

					for(let cls of classList)
					{
						$node.classList.add(cls);
					}
				}
				else if(name == "style")
				{
					let style = getStyles(value);

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
	
	for(let [id, $newNode] of $$nodes.entries())
	{
		let $placeholderNode = $temp.querySelector(`[data-hlid="${id}"]`);
		
		$placeholderNode.parentNode.insertBefore($newNode, $placeholderNode);

		$placeholderNode.parentNode.removeChild($placeholderNode);
	}

	// Obtain refs
	const $$refNodes	= $temp.querySelectorAll(`[ref]`);
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


	// Create final DOM fragment
	const $fragment = document.createDocumentFragment();
	const $$childs	= [];

	$temp.childNodes.forEach(($node) =>
	{
		$fragment.appendChild($node);

		$$childs.push($node);
	});

	// TODO: pass old value
	const fireChangeEvent = (keys) =>
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
					state: stateProxy,
					refs: refsProxy
				}
			});
		
			for(let $node of $$childs)
			{
				$node.dispatchEvent(event);

				let $$allChilds = $node.querySelectorAll('*');

				for(let $child of $$allChilds)
				{
					$child.dispatchEvent(event);
				}
			}
		}
	};

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

			fireChangeEvent([name]);
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

	$fragment.refs	= refsProxy;
	$fragment.state	= stateProxy;

	$fragment.setState = (obj) =>
	{
		const keys = [];

		for(let key in obj)
		{
			stateObj.set(key, obj[key]);

			keys.push(key);
		}

		fireChangeEvent(keys);
	};

	
	

	return $fragment;
};
	
	