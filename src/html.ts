/*
TODO:
- Web components
- Counter per numero chiamate call back
- Verificare possibilità di aggiornamento immediato call back nodi figli

- Docs:
https://cancerberosgx.github.io/javascript-documentation-examples/examples/typedoc-tutorial-basic/docs/docco/src/index.html
https://typedoc.org/

- NPM
https://codeburst.io/https-chidume-nnamdi-com-npm-module-in-typescript-12b3b22f0724
*/

import State, { StateChange } from "./State";
import * as DOM from "./dom";
import { PhasedCallback, PhasedResult, ConditionalCallback } from "./callbacks";
import { ClassRule } from "./css";

////////////////////////////////////////////////////////////////


export type ComponentProps        = Record<string, any>;
export type ComponentChild        = string | Component | ComponentFragment | Node;
export type FunctionComponent     = (props?: ComponentProps, ...children: ComponentChild[]) => Component;
export type ElementProperties     = Record<string, any>;
export type ComponentElement      = HTMLElement | SVGElement;
export type ComponentRenderResult = ComponentChild | ComponentChild[] | null;
export type ComponentClass        = {new(props?: ComponentProps, ...children: ComponentChild[]): Component};

interface ComponentCallbackInfo {
  inTag: boolean;
  id: string;
  $placeholder?: Node;
  callback: () => any;
  $$nodes?: Node[];
  result?: any;
  $target?: ComponentElement;
  components?: Component[];
}

export class ComponentFragment {
  private $$nodes: Node[];
  private refsMap: Map<string, Node>;
  private callbacksMap: Map<string, ComponentCallbackInfo>;
  public refs: Record<string, any>;
  public ids: Record<string, any>;
  public state: State;

  constructor ($container: Element, state?: State, refsMap?: Map<string, Node>, callbacksMap?: Map<string, ComponentCallbackInfo>) {
    this.$$nodes        = Array.from($container.childNodes);
    this.refsMap       = refsMap || ComponentFragment.getRefsMapFromDOMNode($container);
    this.callbacksMap  = callbacksMap || new Map();

    const refsProxy = new Proxy({}, {
      has: (target: {}, name: string): boolean => {
        return this.refsMap.has(name);
      },
      get: (target: {}, name: string): Node => {
        return this.refsMap.get(name);
      }
    });

    const idsProxy = new Proxy({}, {
      has: (target: {}, name: string): boolean => {
        // TODO: limitare ai soli nodi del Component
        return !!document.getElementById(name);
      },
      get: (target: {}, name: string): Node => {
        // TODO: limitare ai soli nodi del Component
        return document.getElementById(name);
      }
    });

    this.refs = refsProxy;
    this.ids  = idsProxy;

    this.assignState(state);
  }

  assignState (state: State): void {
    if(this.state) {
      this.state.unbindTarget(this);
    }

    this.state    = state || new State();

    this.state.bindTarget(this);
  }

  public update (opts?: StateChange): ComponentFragment {
    this.triggerCallbacks(opts);

    return this;
  }

  private triggerCallbacks ({ keys, oldState }: StateChange): void {
    keys = keys || this.state.getKeys();

    this.callbacksMap.forEach((callbackInfo) => {
      const res = callbackInfo.callback.call(this, {
        keys,
        oldState,
        state: this.state,
        refs: this.refs,
        ids: this.ids
      });

      if(this._isValidCallbackResult(res)) {
        if(res instanceof PhasedResult) {
          if(this._isValidCallbackResult(res.result)) {
            this._applyCallback(callbackInfo, res.result);
          }

          res.then((res) => {
            if(this._isValidCallbackResult(res)) {
              this._applyCallback(callbackInfo, res);
            }
          }).catch((e) => {
            console.error("Phased Callback Update Error", e);
          });
        } else if(res instanceof Promise) {
          res.then((res) => {
            if(this._isValidCallbackResult(res)) {
              this._applyCallback(callbackInfo, res);
            }
          }).catch((e) => {
            console.error("Promised Callback Update Error", e);
          });
        } else {
          this._applyCallback(callbackInfo, res);
        }
      }
    });
  }

  _isValidCallbackResult (res: any): boolean {
    const type = typeof res;
    return (type !== "undefined" && type !== "boolean" && !(type === "number" && isNaN(res)));
  }

  _applyCallback (callbackInfo: ComponentCallbackInfo, res: any): boolean {
    // Prevent multiple rendering of the same result
    if(callbackInfo.result !== res) {
      return false;
    }

    if(callbackInfo.inTag) {
      if(callbackInfo.$target) {
        // TODO: gestire aggiornamento listener
        ComponentFragment.applyPropsToDOMNode(callbackInfo.$target, res);

        return true;
      }

      return false;
    }


    ComponentFragment.batchMethod(callbackInfo.components, "willUnmount");
    DOM.removeNodes(callbackInfo.$$nodes);
    ComponentFragment.batchMethod(callbackInfo.components, "didUnmount");

    callbackInfo.components  = ComponentFragment.getComponentsFromResult(res);
    callbackInfo.result    = res;

    ComponentFragment.batchMethod(callbackInfo.components, "willMount");

    callbackInfo.$$nodes  = ComponentFragment.getNodesFromResult(res);

    DOM.insertNodesBefore(callbackInfo.$$nodes, callbackInfo.$placeholder);
    ComponentFragment.batchMethod(callbackInfo.components, "didMount");

    return true;
  }

  isAttached (): boolean {
    return document.body.contains(this.$$nodes[0]);
  }

  onStateChange ({ keys, oldState }: StateChange): boolean {
    if(!this.isAttached()) {
      return false;
    }

    const eventsList = ["statechange"].concat(keys.map((key) => {
      return `statechange:${key}`;
    }));

    for(const eventName of eventsList) {
      const event = new CustomEvent(eventName, {
        detail: {
          fragment: this,
          oldState,
          state: this.state,
          refs: this.refs,
          ids: this.ids
        }
      });

      for(const $node of this.refsMap.values()) {
        $node.dispatchEvent(event);
      }


      // for(let $node of this.$$nodes)
      // {
      //   $node.dispatchEvent(event);

      //   let $$allChilds = $node.querySelectorAll("*");

      //   for(let $child of $$allChilds)
      //   {
      //     $child.dispatchEvent(event);
      //   }
      // }
    }

    this.triggerCallbacks({ keys, oldState });

    return true;
  }

  setState (newState: Record<string, any>): void {
    this.state.setState(newState);
  }

  getState (key: string, def: any): any {
    return this.state.getState(key, def);
  }

  getNodes (): Node[] {
    return this.$$nodes.slice(0);
  }

  removeAllNodes (): void {
    for(const $node of this.$$nodes) {
      if($node.parentNode) {
        $node.parentNode.removeChild($node);
      }
    }
  }

  insertNodesBefore ($dest: Node): void {
    for(const $node of this.$$nodes) {
      $dest.parentNode.insertBefore($node, $dest);
    }
  }

  replaceWith (comp: ComponentFragment): void {
    const $first = this.$$nodes[0];
    comp.insertNodesBefore($first);
    this.removeAllNodes();
  }

  appendTo ($dest: Node | string): void {
    if(typeof $dest === "string") {
      $dest = document.querySelector($dest);
    }

    for(const $node of this.$$nodes) {
      $dest.appendChild($node);
    }
  }

  replaceTo ($dest: Node): void {
    if($dest.parentNode) {
      this.insertNodesBefore($dest);

      $dest.parentNode.removeChild($dest);
    }
  }

  getDOMFragment (): DocumentFragment {
    const $f = document.createDocumentFragment();

    for(const $node of this.$$nodes) {
      $f.appendChild($node);
    }

    return $f;
  }

  static isPhasedCallback (arg: any): boolean {
    return (arg instanceof PhasedCallback);
  }

  static isConditionalCallback (arg: any): boolean {
    return (arg instanceof ConditionalCallback);
  }

  static isCallback (arg: any): boolean {
    return this.isPhasedCallback(arg) || this.isConditionalCallback(arg);
  }

  static isState (arg: any): boolean {
    return !!arg.__is_state__;
  }

  static isDOMNode (arg: any): boolean {
    return (arg instanceof HTMLElement || arg instanceof Text || arg instanceof Comment || arg instanceof DocumentFragment);
  }

  static isComponent (arg: any): boolean {
    return (arg instanceof Component);
  }

  static isComponentFragment (arg: any): boolean {
    return (arg instanceof ComponentFragment);
  }

  static isComponentType (arg: any): boolean {
    return (arg instanceof ComponentFragment || arg instanceof Component);
  }

  static from (source: any): ComponentFragment {
    if(source instanceof ComponentFragment) {
      return source;
    }

    if(source instanceof Component) {
      return source.fragment;
    }

    const $temp = document.createElement("div");

    const addNode = (src: any): void => {
      const type = typeof src;

      if(type === "string" || type === "number") {
        $temp.innerHTML += src;
      } else if(this.isDOMNode(src)) {
        $temp.appendChild(src);
      } else if(src instanceof Array) {
        for(const item of src) {
          addNode(item);
        }
      }
    };

    addNode(source);

    return new ComponentFragment($temp);
  }


  static getClassNamesList (className: any): string[] {
    const type = typeof className;

    if(type === "string") {
      return className.split(/\s+/).map((cls: string) => cls.trim()).filter((cls: string) => !!cls);
    }

    if(type === "object") {
      if(className instanceof Array) {
        return className.map((item) => this.getClassNamesList(item)).reduce((res, item) => res.concat(item), []);
      } else {
        const res = [];

        for(const cls in className) {
          if(className[cls]) {
            res.push(cls);
          }
        }

        return res;
      }
    }

    return [];
  }


  static getStyles (style: any): Record<string, string> {
    const type = typeof style;

    if(type === "string") {
      return style.split(";").map((row: string) => row.trim().split(":")).reduce((res: Record<string, string>, item: string) => {
        const key = item[0].trim();

        if(key && key !== "") {
          res[key] = (item[1] || "").trim();
        }

        return res;
      }, {});
    }

    if(type === "object") {
      if(style instanceof Array) {
        return style.reduce((res, item) => Object.assign(res, this.getStyles(item)), {});
      } else {
        const res: Record<string, string> = {};

        for(let propName in style) {
          let propValue = style[propName];

          if(typeof propValue === "number") {
            propValue = `${propValue}px`;
          }

          propName =  propName.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

          res[propName] = propValue;
        }

        return res;
      }
    }

    return {};
  }

  static getComponentsFromResult (res: any): Component[] {
    if(ComponentFragment.isComponent(res)) {
      return [res];
    }

    if(res instanceof Array) {
      let ret: Component[] = [];
      for(const val of res) {
        ret = ret.concat(this.getComponentsFromResult(val));
      }
      return ret;
    }

    return [];
  }

  static getNodesFromResult (res: any): Node[] {
    const argType = typeof res;

    if(res === null || argType === "undefined") {
      return [];
    }

    if(argType === "string" || argType === "number") {
      return [document.createTextNode(res.toString())];
    }

    if(res instanceof Array) {
      let ret: Node[] = [];
      for(const val of res) {
        ret = ret.concat(this.getNodesFromResult(val));
      }
      return ret;
    }

    if(ComponentFragment.isDOMNode(res)) {
      return res;
    }

    if(ComponentFragment.isComponentType(res)) {
      return res.getNodes();
    }

    if(argType === "object") {
      return this.getNodesFromTree(res);
    }

    return [];
  }

  static getNodesFromTree (domTree: any): Node[] {
    if(domTree instanceof Array) {
      let res: Node[] = [];

      for(const treeItem of domTree) {
        res = res.concat(this.getNodesFromTree(treeItem));
      }

      return res;
    }

    const type = typeof domTree;

    if(type === "string" || type === "number") {
      return [document.createTextNode(`${domTree}`)];
    }

    // If the value is already a DOM node return it directly
    if(ComponentFragment.isDOMNode(domTree)) {
      return [domTree];
    }

    let $el;

    // If tagName is omitted or is  equal to "#", create new DOM fragment
    if(!domTree.tagName || domTree.tagName === "#") {
      $el = document.createDocumentFragment();
    } else {
      $el = document.createElement(domTree.tagName);
    }

    if(domTree.properties) {
      for(const name in domTree.properties) {
        $el[name] = domTree.properties[name];
      }
    }

    const directProperties = ["className", "innertText", "innerHTML", "textContent"];

    for(const propName of directProperties) {
      if(propName in domTree) {
        $el[propName] = domTree[propName];
      }
    }

    if(domTree.attributes) {
      for(const name in domTree.attributes) {
        $el.setAttribute(name, domTree.attributes[name]);
      }
    }

    if(domTree.events) {
      for(const name in domTree.events) {
        $el.addEventListener(name, domTree.events[name]);
      }
    }

    if(domTree.children) {
      if(domTree.children instanceof Array) {
        for(const childVdom of domTree.children) {
          const $$nodes = this.getNodesFromTree(childVdom);

          for(const $node of $$nodes) {
            $el.appendChild($node);
          }
        }
      } else {
        const $$nodes = this.getNodesFromTree(domTree.children);

        for(const $node of $$nodes) {
          $el.appendChild($node);
        }
      }
    }


    return [$el];
  }

  static getNodesFromHTML (html: string): Node[] {
    const $temp = document.createElement("div");

    $temp.innerHTML = html;

    return Array.from($temp.childNodes);
  }

  private static _uid = 0;

  static getUniqueId (): string {
    return `hl${++this._uid}`;
  }

  static batchMethod (list: any, method: string, ...args: any[]): void {
    if(list) {
      for(const item of list) {
        item[method](...args);
      }
    }
  }

  static getRefsMapFromDOMNode ($node: Element): Map<string, Node> {
    const refsMap    = new Map();
    const $$refNodes = Array.from($node.querySelectorAll("[ref]"));

    for(const $refNode of $$refNodes) {
      const refName = $refNode.getAttribute("ref");

      if(refName) {
        refsMap.set(refName, $refNode);
      }
    }

    return refsMap;
  }

  static applyPropsToDOMNode ($node: ComponentElement, props: ElementProperties[] | ElementProperties): void {
    if(props instanceof Array) {
      for(const prop of props) {
        this.applyPropsToDOMNode($node, prop);
      }
    } else if(typeof props === "object") {
      for(const name in props) {
        const value     = props[name];
        const valueType = typeof value;

        if(valueType !== "undefined" && valueType !== null) {
          if(valueType === "function") {
            const eventNames = name.split(";");

            for(const eventName of eventNames) {
              $node.addEventListener(eventName, value);
            }
          } else if(name === "className") {
            const classList = ComponentFragment.getClassNamesList(value);

            for(const cls of classList) {
              $node.classList.add(cls);
            }
          } else if(name === "style") {
            const style = ComponentFragment.getStyles(value);

            for(const styleProp in style) {
              $node.style.setProperty(styleProp, style[styleProp]);
            }
          } else if(valueType === "boolean") {
            if(value) {
              $node.setAttribute(name, name);
            } else {
              $node.removeAttribute(name);
            }
          } else if(valueType === "string" || valueType === "number") {
            $node.setAttribute(name, `${value}`);
          } else if(value instanceof Date) {
            $node.setAttribute(name, value.toISOString());
          } else {
            try {
              $node.setAttribute(name, JSON.stringify(value));
            } catch(e) {
              console.error(e);
            }
          }
        }
      }
    }
  }
}


export class Component {
  private props: ComponentProps;
  private children: ComponentChild[];
  public fragment: ComponentFragment;

  constructor (props: ComponentProps, ...children: ComponentChild[]) {
    this.props    = props || {};
    this.children = children || [];

    this.init();
  }

  init (): void {
    const render = this.render(this.props, this.children);

    this.fragment = ComponentFragment.from(render);

    if(this.fragment) {
      this.fragment.update();
    }
  }

  // eslint-disable-next-line
  render (props: ComponentProps, children: ComponentChild[]): ComponentRenderResult {
    return null;
  }

  get ids (): Record<string, any> {
    return this.fragment.ids;
  }

  get refs (): Record<string, any> {
    return this.fragment.refs;
  }

  get state (): State {
    return this.fragment.state;
  }

  setState (state: Record<string, any>): void {
    this.fragment.setState(state);
  }

  getState (key: string, def: any): any {
    return this.fragment.getState(key, def);
  }

  getDOMFragment (): DocumentFragment {
    return this.fragment.getDOMFragment();
  }

  getNodes (): Node[] {
    return this.fragment.getNodes();
  }

  detach (): boolean {
    if(this.isAttached()) {
      this.willUnmount();
      DOM.removeNodes(this.getNodes());
      this.didUnmount();

      return true;

      return false;
    }
  }

  appendTo ($node: ComponentElement): void {
    this.detach();
    this.willMount();
    this.fragment.appendTo($node);
    this.didMount();
  }

  isAttached (): boolean {
    return this.fragment.isAttached();
  }

  willUnmount (): void | boolean {
    return true;
  }

  didUnmount (): void | boolean  {
    return true;
  }

  willMount (): void | boolean {
    return true;
  }

  didMount (): void | boolean {
    return true;
  }

  private static componentsTags: Map<string, ComponentClass | FunctionComponent> = new Map();

  static assignTagName (tagName: string, component: ComponentClass | FunctionComponent): void {
    this.componentsTags.set(tagName, component);
  }

  static replaceComponentTagsIntoNode ($node: Element): Set<Component> {
    const result: Set<Component> = new Set();

    if(this.componentsTags) {
      for(const [tag, CompoConstr] of this.componentsTags.entries()) {
        const $$tagNodes = DOM.byTagName($node, tag);

        for(const $tagNode of $$tagNodes) {
          const props     = DOM.getAttributesObject($tagNode);
          const childs    = DOM.getChildren($tagNode);
          const compoInst = new (CompoConstr as ComponentClass)(props, ...childs);

          DOM.replaceWithNode($tagNode, compoInst.getDOMFragment());

          result.add(compoInst);
        }
      }
    }

    return result;
  }
}

const html = (parts: TemplateStringsArray | string[], ...args: any[]): ComponentFragment => {

  const html: string[]     = [];
  const propsMap: Map<string, ComponentElement[]> = new Map();
  const nodesMap = new Map();
  const cbcksMap: Map<string, ComponentCallbackInfo> = new Map();
  let   state    = new State();

  const getNodePlaceholder = ($node: ComponentChild, id?: string): string => {
    id = id || ComponentFragment.getUniqueId();

    nodesMap.set(id, $node);

    return `<div data-hlid="${id}"></div>`;
  };

  const getPropsPlaceholder = (props: any, id: string): string => {
    id = id || ComponentFragment.getUniqueId();

    const propsList = propsMap.get(id) || [];

    propsList.push(props);

    propsMap.set(id, propsList);

    return ` data-hlid="${id}" `;
  };

  const getCbcksPlaceholder = (callback: () => any, inTag: boolean, id: string): string => {
    id = id || ComponentFragment.getUniqueId();

    if(inTag) {
      cbcksMap.set(id, {
        inTag,
        id: id,
        callback: callback
      });

      return getPropsPlaceholder(callback, id);
    }

    const plc = document.createComment(id);

    cbcksMap.set(id, {
      inTag,
      id: id,
      $placeholder: plc,
      callback: callback,
      $$nodes: []
    });

    return getNodePlaceholder(plc, id);
  };

  let lastInTag: boolean = false;
  let lastTagId: string;

  const applyArgumentToPosition = (arg: any, prevStr: string, nextStr: string): {value: string; inTag?: boolean} | false => {
    const closeOrContinueTag = !!(nextStr && nextStr.match(/^([^<]*>.*|[^><]+)$/m));
    const hasClosedTag       = !!prevStr.match(/>/m);
    const inTag              = !!(
      (prevStr.match(/<[^>]+$/m)
        || (lastInTag
          && prevStr.match(/^[^><]+$/m)))
      && closeOrContinueTag
    );
    const alreadyInTag = (inTag && lastInTag && !hasClosedTag);
    const tagId        = alreadyInTag ? lastTagId : ComponentFragment.getUniqueId();

    lastInTag = inTag;
    lastTagId = tagId;

    const checkArgType = (arg: any): {value: string; inTag?: boolean} | false => {
      const argType = typeof arg;

      if(argType === "function") {
        if(arg.prototype instanceof Component) {
          arg = new arg();

          return {
            value: getNodePlaceholder(arg),
            inTag
          };
        }

        return {
          value: getCbcksPlaceholder(arg, inTag, tagId),
          inTag
        };
      }

      if(argType === "undefined" || arg === null) {
        return false;
      }

      if(argType === "boolean") {
        return arg;
      }

      if(argType === "string" || argType === "number") {
        return {
          value: arg,
          inTag
        };
      }

      if(arg instanceof Array) {
        const arrRes = arg.map((val) => {
          const resVal = checkArgType(val);

          return resVal ? resVal.value : "";
        });

        return {
          value: arrRes.join(""),
          inTag
        };
      }

      if(ComponentFragment.isCallback(arg)) {
        return {
          value: getCbcksPlaceholder(arg, inTag, tagId),
          inTag
        };
      }

      if(ComponentFragment.isState(arg)) {
        state = arg;

        return false;
      }

      if(ComponentFragment.isDOMNode(arg)) {
        return {
          value: getNodePlaceholder(arg),
          inTag
        };
      }

      if(ComponentFragment.isComponentFragment(arg)) {
        return {
          value: getNodePlaceholder(arg.getDOMFragment()),
          inTag
        };
      }

      if(ComponentFragment.isComponent(arg)) {
        return {
          value: getNodePlaceholder(arg),
          inTag
        };
      }

      if(arg instanceof ClassRule) {
        return {
          value: getPropsPlaceholder({ className: arg.className }, tagId),
          inTag
        };
      }

      // TODO: Promise case?

      if(argType === "object") {
        return {
          value: getPropsPlaceholder(arg, tagId),
          inTag
        };
      }

      return false;
    };

    return checkArgType(arg);
  };

  for(let i = 0, len = parts.length; i < len; i++) {
    const str = parts[i],
      nextStr = parts[i + 1];

    html.push(str);

    const resArg = applyArgumentToPosition(args.shift(), str, nextStr);

    html.push(resArg ? resArg.value : "");
  }

  // Convert HTML pieces to DOM Node
  const $temp = document.createElement("div");

  $temp.innerHTML = html.join("").trim();


  for(const [id, row] of cbcksMap.entries()) {
    if(row.inTag) {
      const $node = $temp.querySelector(`[data-hlid="${id}"]`) as ComponentElement;

      if($node) {
        row.$target = $node;
      }
    }
  }


  for(const [id, props] of propsMap.entries()) {
    const $node = $temp.querySelector(`[data-hlid="${id}"]`) as ComponentElement;

    ComponentFragment.applyPropsToDOMNode($node, props);
  }

  // Obtain refs bofore add child fragments
  const refsMap    = ComponentFragment.getRefsMapFromDOMNode($temp);

  for(const [id, $newNode] of nodesMap.entries()) {
    const $placeholderNode = $temp.querySelector(`[data-hlid="${id}"]`);

    if(ComponentFragment.isComponent($newNode)) {
      $newNode.willMount();

      const $fragment = $newNode.getDOMFragment();

      $placeholderNode.parentNode.insertBefore($fragment, $placeholderNode);

      $newNode.didMount();
    } else {
      $placeholderNode.parentNode.insertBefore($newNode, $placeholderNode);
    }

    $placeholderNode.parentNode.removeChild($placeholderNode);
  }

  Component.replaceComponentTagsIntoNode($temp);

  return new ComponentFragment($temp, state, refsMap, cbcksMap);
};

export default html;
