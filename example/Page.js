import html, {Component} from "../src/dom/html.mjs";

import * as styles from "./styles.js";

export default class Page extends Component
{
	render(props, children)
	{
		return html`
			<div ${styles.pageStyle}>
				<h1 ${styles.titleStyle}>${children}</h1>
			</div>
		`;
	}

	didMount()
	{
		console.log("Page mounted!");
	}
}
