import html, {Component} from "../index.js";

export default class Page extends Component
{
	render(props, children)
	{
		return html`
			<div class="page">
				${children}
			</div>
		`;
	}
}