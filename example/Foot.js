import html, {Component} from "../src/dom/html.mjs";

import * as styles from "./styles.js";

import globalState from "./globalState.js";


export default class Page extends Component
{
	render(props, children)
	{
		return html`${globalState}
			<div ${styles.footerStyle}>Global Count:
				${() =>
				{
					return this.state.counter;
				}}
			</div>
		`;
	}
}
