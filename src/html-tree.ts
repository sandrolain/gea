import { Component, ComponentFragment, ComponentProps, ComponentChild } from "./html";

export class TreeComponent extends Component {
  // TODO: specific interface for  DOMTree and childrenList
  private domTree: any;

  constructor ({ domTree, children }: { domTree: any; children: ComponentChild[]}) {
    super({}, ...children);

    this.domTree = domTree;
  }

  render (props: ComponentProps, children: ComponentChild[]): ComponentFragment {
    return ComponentFragment.from(children);
  }
}

// TODO: DOM tree type
const tree = (domTree: any): () => TreeComponent => {
  const fn = function (): TreeComponent {
    return new TreeComponent({
      domTree,
      children: ComponentFragment.getNodesFromTree(domTree)
    });
  };

  return fn;
};

export default tree;
