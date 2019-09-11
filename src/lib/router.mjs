
export default class Router
{
	constructor({root, routes, noReplace} = {})
	{
		this.noReplace	= !!noReplace;
		this.routes		= new Map();

		this.setRoot(root || "");

		if(routes)
		{
			this.addRoutes(routes);
		}

		this.listen();
	}

	setRoot(root = "")
	{
		this.root = this.clearSlashes(root);
	}

	getFragment(uri)
	{
		return this.clearSlashes(decodeURI(uri))
			.replace(/\?(.*)$/, "")
			.replace(new RegExp("^" + this.root), "");
	}

	getCurrentFragment()
	{
		return this.getFragment(location.pathname + location.search);
	}

	clearSlashes(path)
	{
		return (path || "").toString().replace(/\/$/, "");
	}

	addRoutes(routes)
	{
		if(routes instanceof Map)
		{
			for(let [path, callback] of routes)
			{
				let route = typeof callback == "object" ? callback : {callback: callback};

				route.path = path;

				this.addRoute(route);
			}
		}
		else
		{
			for(let path in routes)
			{
				let callback 	= routes[path];
				let route		= typeof callback == "object" ? callback : {callback: callback};

				route.path = path;

				this.addRoute(route);
			}
		}
	}

	addRoute(route)
	{
		var {path, caseInsensitive} = route;

		route.keys = [];

		var routeExpr = path;

		const m = path.match(/:([^/]+)/g);

		if(m)
		{
			route.keys = m.map((k) =>
			{
				return k.replace(/^:/, "");
			});

			routeExpr = path.replace(/:([^/]+)/g, "([^/]*)");
		}

		route.ereg = new RegExp(`^${routeExpr}$`, (caseInsensitive ? "i" : ""));

		this.routes.set(path, route);

		return this;
	}

	removeRoute(path)
	{
		this.routes.delete(path);

		return this;
	}

	check(fg, data)
	{
		fg = fg || this.getCurrentFragment();

		for(let route of this.routes.values())
		{
			let m = fg.match(route.ereg);

			if(m)
			{
				var params = {};

				var matches = Array.from(m);

				if(route.keys && route.keys.length > 0)
				{
					let keys = route.keys.slice(0);

					keys.unshift(0);

					for(let i = 0, len = keys.length; i < len; i++)
					{
						params[keys[i]] = matches[i];
					}
				}

				route.callback(params, data);
			}
			else if(route.callbackUnmatch)
			{
				route.callbackUnmatch({}, data);
			}
		}

		return this;
	}

	listen()
	{
		if(!this._listening)
		{
			window.addEventListener("popstate", (e) =>
			{
				this.check(null, e.state);
			});

			this._listening = true;
		}

		return this;
	}

	getFullPath(path)
	{
		path = this.clearSlashes(path || "");

		return this.root + path;
	}

	navigate({path = "", title = null, data = null})
	{
		path = this.clearSlashes(path || "");

		data = data || {path, title};

		const fullPath	= this.root + path;
		const actPath	= this.getCurrentFragment();

		if(actPath == path)
		{
			if(this.noReplace)
			{
				return this;
			}

			history.replaceState(data, title, fullPath);
		}
		else
		{
			history.pushState(data, title, fullPath);
		}

		this.check(null, data);

		return this;
	}
}
