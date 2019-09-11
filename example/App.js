import html, {Component} from "../src/dom/html.mjs";
import {PhasedCallback, ConditionalCallback} from "../src/lib/callbacks.mjs";
import MenuItem from "./MenuItem.js";
import Page from "./Page.js";
import Foot from "./Foot.js";

const pageHome = new Page({}, "Home Page");
const pageDocs = new Page({}, "Docs Page");
const pageNotFound = new Page({}, "Page Not Found");

const loading = html`<div ${{style: {
	fontSize: 40,
	padding: "2em",
	textAlign: "center"
}}}>Loading …</div>`

export default class App extends Component
{
	render()
	{
		const changeRight = new PhasedCallback((data, resolve) =>
		{
			setTimeout(() =>
			{
				switch(data.state.page)
				{
					case undefined:
					case "home":
						return resolve(pageHome);

					case "docs":
						return resolve(pageDocs);
				}

				resolve(pageNotFound);
			}, 1000);

			return loading;
		});

		return html`
			<div id="cnt">
				<div id="left">
					${new MenuItem({icon: "fas fa-home", label: "Home", click: () =>
					{
						this.setState({
							page: "home"
						});
					}})}
					${new MenuItem({icon: "fas fa-building", label: "About", click: () =>
					{
						this.setState({
							page: "help"
						});
					}})}
					${new MenuItem({icon: "fas fa-book", label: "Documentation", click: () =>
					{
						this.setState({
							page: "docs"
						});
					}})}
					${new MenuItem({icon: "fas fa-question", label: "Help", click: () =>
					{
						this.setState({
							page: "help",
							foo: Math.random()
						});
					}})}
				</div>
				<div id="right">
					${changeRight}
					${new ConditionalCallback("foo", ({state}) =>
					{
						return state.foo;
					})}
				</div>
			</div>
			${Foot}
		`;
	}
}
