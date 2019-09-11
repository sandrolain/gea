export default class SWRegister
{
	static isSupported()
	{
		return ("serviceWorker" in navigator);
	}

	static exec(settings = {})
	{
		if (this.isSupported())
		{
			settings = Object.assign({
				url: "sw.js",
				scope: "/",
				debug: false
			}, settings);

			const sw = navigator.serviceWorker.register(settings.url, {
				scope: settings.scope
			}).then((reg) =>
			{
				settings.debug && console.info("[SW]", "Registered");

				const swNewController = reg.installing || sw.controller || reg.active;

				if(!swController)
				{
					location.reload();

					return;
				}


				swController = swNewController;


				reg.addEventListener("updatefound", () =>
				{
					settings.debug && console.info("[SW]", "Update Found");

					const swNewController = reg.installing || sw.controller || reg.active;

					swNewController.onstatechange = () =>
					{
						settings.debug && console.log("[SW]", "onstatechange", swNewController.state, navigator.serviceWorker.controller);

						if (swNewController.state === "activated" && navigator.serviceWorker.controller)
						{
							settings.onUpdate && settings.onUpdate(navigator.serviceWorker.controller);
						}
					};
				});

				reg.update();

			}).catch((e) =>
			{
				settings.debug && console.error("[SW]", "Registration failed", e);
			});

			var swController = navigator.serviceWorker.controller;

			settings.debug && console.info("[SW]", "Active Controller:", swController);

			var refreshing = false;

			navigator.serviceWorker.addEventListener("controllerchange", () =>
			{
				settings.debug && console.info("[SW]", "Controller Change:", navigator.serviceWorker.controller);

				if (!swController && refreshing)
				{
					refreshing = true;

					location.reload();
				}
				else
				{
					swController = navigator.serviceWorker.controller;
				}
			});

			navigator.serviceWorker.addEventListener("message", (event) =>
			{
				const data = event.data;

			});
		}
	}

	static addToCache(list)
	{
		if(this.isSupported())
		{
			return navigator.serviceWorker.controller.postMessage({
				request: "add-to-cache",
				payload: list
			});
		}

		return false;
	}
}
