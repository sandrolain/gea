import {Component, ComponentFragment} from "./html.mjs";


class TreeComponent extends Component
{
	constructor({domTree, children})
	{
		super({}, children);

		this.domTree = domTree;
	}

	render(props, children)
	{
		return ComponentFragment.from(children);
	}
}


const tree = (domTree) =>
{
	const fn = function()
	{
		return new TreeComponent({
			domTree,
			children: ComponentFragment.getNodesFromTree(domTree)
		});
	};

	return fn;
};


export default tree;
