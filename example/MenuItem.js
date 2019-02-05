import html, {Component} from "../index.js";

export default class MenuItem extends Component
{
	render(props, children)
	{
		return html`
			<div class="menu-item" ${{click: props.click}}>
				<i class="${props.icon || "fas fa-dot-circle"}"></i>
				${props.label}
			</div>
		`;
	}
}