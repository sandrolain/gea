import { request } from "./http";
import html, { Component, ComponentProps, ComponentChild, FunctionComponent } from "./html";
import { Sheet } from "./css";

////////////////////////////////////////////////////////////////
// Template Component

const tplComponentsMap: Map<string, FunctionComponent> = new Map();

interface TplComponentOptions {
  props: ComponentProps;
  name: string;
  script: string;
  style: string;
  child: ComponentChild;
}

class TplComponent extends Component {
  public readonly name: string;

  constructor ({ props, name, script, style, child }: TplComponentOptions) {
    super(props, child);

    this.name = name;

    if(script) {
      const fn = new Function("component", "refs", "ids", "state", "style", script);

      fn.call(this, this, this.refs, this.ids, this.state, style);
    }
  }

  render (props: ComponentProps, children: ComponentChild[]): ComponentChild {
    return children.shift();
  }
}


const getComponentFromTemplate = (name: string): FunctionComponent => {
  if(tplComponentsMap.has(name)) {
    return tplComponentsMap.get(name);
  }

  const $template = document.querySelector(`template#${name}`);

  const tagName  = $template.getAttribute("data-tag-name");

  // var clone = document.importNode($template.content, true);

  const viewRE  = /<view[\s\S]*?>([\s\S]*)?<\/view>/i;
  const scriptRE  = /<script[\s\S]*?>([\s\S]*)?<\/script>/i;
  const styleRE  = /<style[\s\S]*?>([\s\S]*)?<\/style>/i;

  const tplHTML     = $template.innerHTML;

  const matchView   = tplHTML.match(viewRE);
  const matchScript = tplHTML.match(scriptRE);
  const matchStyle  = tplHTML.match(styleRE);

  let   viewHTML: string[]    = null;
  const script: string      = matchScript ? matchScript[1] : null;
  const style: string       = matchStyle ? matchStyle[1] : null;

  if(style) {
    Sheet.getStyleSheet({ sheetName: `template-${name}`, media: "screen", content: style });
  }

  // tplHTML = tplHTML.trim();
  if(matchView[1]) {
    viewHTML = matchView[1].split(/\${children}/mi);
  }

  const fn: FunctionComponent = function (props: ComponentProps = {}, ...children: ComponentChild[]): TplComponent {
    return new TplComponent({
      props,
      name,
      script,
      style,
      child: html(viewHTML, [children])
    });
  };

  if(tagName) {
    Component.assignTagName(tagName, fn);
  }

  tplComponentsMap.set(name, fn);

  return fn;
};

const tpl = new Proxy({
  load: async (url: string): Promise<Record<string, FunctionComponent>> => {

    const html = await request(url, { parse: "text" });

    const $node = document.createElement("div");

    $node.innerHTML = html;

    const $$templates = Array.from($node.getElementsByTagName("template"));

    const result: Record<string, FunctionComponent> = {};

    for(const $template of $$templates) {
      document.body.appendChild($template);

      const name = $template.id;
      const comp = getComponentFromTemplate(name);

      result[name] = comp;
    }

    return result;
  }
}, {
  get: (target: any, name: string): FunctionComponent => {
    if(name in target) {
      return target[name];
    }

    return getComponentFromTemplate(name);
  }
});

export default tpl;
