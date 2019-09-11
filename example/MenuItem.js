import html, {Component} from "../src/dom/html.mjs";
import globalState from "./globalState.js";

export default class MenuItem extends Component
{
	render(props, children)
	{
		return html`${globalState}
			<div class="menu-item" ${{click: () =>
			{
				props.click();

				this.state.counter++;
			}}}>
				<i class="${props.icon || "fas fa-dot-circle"}"></i>
				${props.label}
			</div>
		`;
	}

	didMount()
	{
		console.log("MenuItem mounted!");
	}
}
