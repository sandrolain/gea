import html, { Component, ComponentProps, ComponentChild, FunctionComponent } from "./html";
import { mergeDeep } from "./utils";

////////////////////////////////////////////////////////////////+
// Tag Component

// TODO: define attrs type
// TODO: define style type
export type TagComponent = (attrs: Record<string, any>, style: any) => FunctionComponent;

const tagComponentsMap = new Map();

class ElComponent extends Component {
  render (props: ComponentProps, children: ComponentChild[]): ComponentChild {
    return children.shift();
  }
}

const getTagCreator = (tagName: string): TagComponent => {
  if(tagComponentsMap.has(tagName)) {
    return tagComponentsMap.get(tagName);
  }

  // TODO: define attrs type
  // TODO: define style type
  const fn = (attrs = {}, style: any = null): FunctionComponent => {
    if(style) {
      attrs = mergeDeep(attrs, { style });
    }

    return function (props: ComponentProps, ...children: ComponentChild[]): Component {
      const actAttrs = mergeDeep({}, attrs, props || {});

      return new ElComponent(props, html`<${tagName} ${actAttrs}>${children}</${tagName}>`);
    };
  };

  tagComponentsMap.set(tagName, fn);

  return fn;
};

const tag = new Proxy({}, {
  get: (target: any, name: string): TagComponent => {
    return getTagCreator(name);
  }
});


export default tag;
