
import Router from "./router";
import html, { Component, ComponentChild } from "./html";

export class RouterComponent extends Component {
  public router: Router;

  render (router: Router, children: ComponentChild[]): ComponentChild[] {
    if(!(router instanceof Router)) {
      throw new Error("First parameter must be a Router instance");
    }

    this.router = router;

    return children;
  }
}

interface RouteOptions {
  router: Router;
  path: string;
}

export class Route extends Component {
  public router: Router;

  render ({ router, path }: RouteOptions, children: ComponentChild[]): ComponentChild {
    if(!(router instanceof Router)) {
      throw new Error("\"router\" must be an instance of Router");
    }

    if(path && typeof path !== "string") {
      throw new Error("\"path\" must be a non empty string");
    }

    this.router = router;

    this.router.addRoute({
      path,
      callback: (params, data) => {
        this.setState({
          routeMatch: true,
          params,
          data
        });
      },
      callbackUnmatch: (params, data) => {
        this.setState({
          routeMatch: false,
          params,
          data
        });
      }
    });

    const fn = function (): ComponentChild[] | null {
      if(this.getState("routeMatch")) {
        return children;
      }

      return null;
    };

    return html`${fn}`;
  }
}

export interface RouteAnchorOptions {
  router: Router;
  path: string;
  title?: string;
  data?: any;
  tag: string;
  on: string;
}

export class RouteAnchor extends Component {
  public router: Router;
  public path: string;
  public title: string;
  public data: any;

  render ({ router, path, title, data = {}, tag = "a", on = "click" }: RouteAnchorOptions, children: ComponentChild[]): ComponentChild | ComponentChild[] {
    if(!(router instanceof Router)) {
      throw new Error("\"router\" must be an instance of Router");
    }

    if(path && typeof path !== "string") {
      throw new Error("\"path\" must be a non empty string");
    }

    this.router = router;
    this.path   = path;
    this.title  = title;
    this.data   = data;

    return html`<${tag} href="#" ${{
      href: (tag === "a" ? "#" : null),
      title: title,
      [on]: (e: Event): void => {
        e.preventDefault();

        this.router.navigate({
          path: this.path,
          title: this.title,
          data: this.data
        });
      }
    }}>${children}</${tag}>`;
  }
}
