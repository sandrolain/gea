
interface RouteItem {
  path?: string;
  callback: RouteCallback;
  callbackUnmatch?: RouteCallback;
  caseInsensitive?: boolean;
  ereg?: RegExp;
  keys?: (string | number)[];
}

type RouteCallback = (params: Record<string, string>, data: any) => any;
type RoutesList = Map<string, RouteCallback | RouteItem> | Record<string, RouteCallback | RouteItem>;


interface RouterOptions {
  root?: string;
  routes?: RoutesList;
  noReplace?: boolean;
}

export default class Router {
  private noReplace: boolean = false;
  private routes: Map<string, RouteItem> = new Map();
  private root: string = "";
  private listening: boolean = false;

  constructor ({ root, routes, noReplace }: RouterOptions = {}) {
    this.noReplace  = !!noReplace;

    this.setRoot(root || "");

    if(routes) {
      this.addRoutes(routes);
    }

    this.listen();
  }

  setRoot (root: string = ""): void {
    this.root = this.clearSlashes(root);
  }

  private getFragment (uri: string): string {
    return this.clearSlashes(decodeURI(uri))
      .replace(/\?(.*)$/, "")
      .replace(new RegExp(`^${this.root}`), "");
  }

  private getCurrentFragment (): string {
    return this.getFragment(location.pathname + location.search);
  }

  private clearSlashes (path: string): string {
    return (path || "").toString().replace(/\/$/, "");
  }

  addRoutes (routes: RoutesList): void {
    if(routes instanceof Map) {
      for(const [path, callback] of routes) {
        const route: RouteItem = typeof callback === "object" ? callback : { callback: callback };

        route.path = path;

        this.addRoute(route);
      }
    } else {
      for(const path in routes) {
        const callback = routes[path];
        const route: RouteItem    = typeof callback === "object" ? callback : { callback: callback };

        route.path = path;

        this.addRoute(route);
      }
    }
  }

  addRoute (route: RouteItem): Router {
    const { path, caseInsensitive } = route;

    route.keys = [];

    let routeExpr = path;

    const match = path.match(/:([^/]+)/g);

    if(match) {
      route.keys = match.map((k) => k.replace(/^:/, ""));
      routeExpr  = path.replace(/:([^/]+)/g, "([^/]*)");
    }

    route.ereg = new RegExp(`^${routeExpr}$`, (caseInsensitive ? "i" : ""));

    this.routes.set(path, route);

    return this;
  }

  removeRoute (path: string): Router {
    this.routes.delete(path);

    return this;
  }

  check (fragment: string, data: any): Router {
    fragment = fragment || this.getCurrentFragment();

    for(const route of this.routes.values()) {
      const match = fragment.match(route.ereg);

      if(match) {
        const params: Record<string, string> = {};
        const matches = Array.from(match);

        if(route.keys && route.keys.length > 0) {
          const keys = route.keys.slice(0);

          keys.unshift(0);

          for(let i = 0, len = keys.length; i < len; i++) {
            params[keys[i]] = matches[i];
          }
        }

        route.callback(params, data);
      } else if(route.callbackUnmatch) {
        route.callbackUnmatch({}, data);
      }
    }

    return this;
  }

  listen (): Router {
    if(!this.listening) {
      window.addEventListener("popstate", (e) => {
        this.check(null, e.state);
      });

      this.listening = true;
    }

    return this;
  }

  getFullPath (path: string): string {
    path = this.clearSlashes(path || "");

    return this.root + path;
  }

  navigate ({ path = "", title = null, data = null }: {path: string; title?: string; data?: any}): Router {
    path = this.clearSlashes(path || "");

    data = data || { path, title };

    const fullPath = this.root + path;
    const actPath  = this.getCurrentFragment();

    if(actPath === path) {
      if(this.noReplace) {
        return this;
      }

      history.replaceState(data, title, fullPath);
    } else {
      history.pushState(data, title, fullPath);
    }

    this.check(null, data);

    return this;
  }
}
