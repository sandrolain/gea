
export interface SWRegisterOptions {
  url?: string;
  scope?: string;
  debug?: boolean;
  onUpdate?: (sw: ServiceWorker) => any;
}

export default class SWRegister {
  static isSupported (): boolean {
    return ("serviceWorker" in navigator);
  }

  static exec (settings: SWRegisterOptions = {}): void {
    if(this.isSupported()) {
      let swController: ServiceWorker;

      settings = Object.assign({
        url: "sw.js",
        scope: "/",
        debug: false
      }, settings);

      navigator.serviceWorker.register(settings.url, { scope: settings.scope }).then((reg) => {
        settings.debug && console.info("[SW]", "Registered");

        const swNewController = reg.installing || reg.active;

        if(!swController) {
          location.reload();

          return;
        }

        swController = swNewController;

        reg.addEventListener("updatefound", () => {
          settings.debug && console.info("[SW]", "Update Found");

          // const swNewController = reg.installing || sw.controller || reg.active;
          const swNewController = reg.installing || reg.active;

          swNewController.onstatechange = (): void => {
            settings.debug && console.log("[SW]", "onstatechange", swNewController.state, navigator.serviceWorker.controller);

            if(swNewController.state === "activated" && navigator.serviceWorker.controller) {
              settings.onUpdate && settings.onUpdate(navigator.serviceWorker.controller);
            }
          };
        });

        reg.update();

      }).catch((e) => {
        settings.debug && console.error("[SW]", "Registration failed", e);
      });

      swController = navigator.serviceWorker.controller;

      settings.debug && console.info("[SW]", "Active Controller:", swController);

      let refreshing = false;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        settings.debug && console.info("[SW]", "Controller Change:", navigator.serviceWorker.controller);

        if(!swController && refreshing) {
          refreshing = true;

          location.reload();
        } else {
          swController = navigator.serviceWorker.controller;
        }
      });

      // navigator.serviceWorker.addEventListener("message", (event) => {
      //   const data = event.data;
      // });
    }
  }

  static addToCache (list: string[]): boolean {
    if(this.isSupported()) {
      navigator.serviceWorker.controller.postMessage({
        request: "add-to-cache",
        payload: list
      });
      return true;
    }

    return false;
  }
}
