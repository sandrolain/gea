
import Router from "../lib/router.mjs";
import html, {Component} from "./html.mjs";

export class RouterComponent extends Component
{
	render(router, children)
	{
		if(!(router instanceof Router))
		{
			throw new Error("First parameter must be a Router instance");
		}

		this.router = router;

		return children;
	}
}


export class Route extends Component
{
	render({router, path}, children)
	{
		if(!(router instanceof Router))
		{
			throw new Error("\"router\" must be an instance of Router");
		}

		if(path && typeof path !== "string")
		{
			throw new Error("\"path\" must be a non empty string");
		}

		this.router = router;

		this.router.addRoute({
			path,
			callback: (params, data) =>
			{
				this.setState({
					routeMatch: true,
					params,
					data
				});
			},
			callbackUnmatch: (params, data) =>
			{
				this.setState({
					routeMatch: false,
					params,
					data
				});
			}
		})

		return html`${function()
		{
			if(this.getState("routeMatch"))
			{
				return children;
			}

			return null;
		}}`;
	}
}

export class RouteAnchor extends Component
{
	render({router, path, title, data = {}, tag = "a", on = "click"}, children)
	{
		if(!(router instanceof Router))
		{
			throw new Error("\"router\" must be an instance of Router");
		}

		if(path && typeof path !== "string")
		{
			throw new Error("\"path\" must be a non empty string");
		}

		this.router = router;
		this.path	= path;
		this.title	= title;
		this.data	= data;

		return html`<${tag} href="#" ${{
			href: (tag === "a" ? "#" : null),
			title: title,
			[on]: (e) =>
			{
				e.preventDefault();

				this.router.navigate({
					path: this.path,
					title: this.title,
					data: this.data
				});
			}
		}}>${children}</${tag}>`;
	}
}
