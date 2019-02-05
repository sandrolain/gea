import html, {Component} from "../index.js";

import MenuItem from "./MenuItem.js";
import Page from "./Page.js";

const pageHome = new Page({}, "Home Page");
const pageDocs = new Page({}, "Docs Page");

export default class App extends Component
{
	render()
	{
		const changeRight = (state) =>
		{
			switch(state.page)
			{
				default:
				case "home":
					return pageHome;
				break;
				case "docs":
					return pageDocs;
				break;
			}
		};

		return html`
			<div id="cnt">
				<div id="left">
					${new MenuItem({icon: "fas fa-home", label: "Home", click: () =>
					{
						this.setState({
							page: "home"
						});
					}})}
					${new MenuItem({icon: "fas fa-book", label: "Documentation", click: () =>
					{
						this.setState({
							page: "docs"
						});	
					}})}
				</div>
				<div id="right">
					${changeRight}
				</div>
			</div>
		`;
	}
}