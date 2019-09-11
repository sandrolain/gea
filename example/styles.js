import {Sheet} from "../src/dom/css.mjs";

const ss = Sheet.getStyleSheet();

export const pageStyle = ss.classRule({
	padding: 20
});

export const titleStyle = ss.classRule({
	fontSize: 30,
	fontWeight: "bold",
	marginTop: 0,
	marginBottom: 10,
	color: "#666666"
});

export const footerStyle = ss.classRule({
	padding: 20,
	textAlign: "center"
});


titleStyle.derivedRule("&:hover", {
	color: "#FF0000"
})
