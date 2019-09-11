
self.addEventListener("message", function(event)
{
	const request = event.data.request,
		payload = event.data.payload || {};

	if (request === "settings")
	{
		Object.assign(settings, payload);
	}

	if(request === "add-to-cache")
	{
		addToCache(payload).then(() =>
		{
			self.clients.matchAll()
				.then(clients =>
					clients.forEach(client =>
						client.postMessage({request: "added-to-cache", payload })));
		});
	}
});

self.addEventListener("install", (event) =>
{
	settings.debug && console.info("[SW]", "Installing");
	settings.debug && console.info("[SW]", "Cache opening", settings.cacheName);

	const resourcesList = settings.resourcesToCache.slice(0);

	if(settings.defaultHTML) { resourcesList.push(settings.defaultHTML); }
	if(settings.defaultImage) { resourcesList.push(settings.defaultImage); }
	if(settings.defaultFavicon) { resourcesList.push(settings.defaultFavicon); }

    event.waitUntil(
		addToCache(resourcesList)
		.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", (event) =>
{
	settings.debug && console.info("[SW]", "Activated");

	event.waitUntil(
		caches.keys().then(cacheNames =>
			Promise.all(
				cacheNames.map(cacheName =>
				{
					if (cacheName != settings.cacheName)
					{
						settings.debug && console.info("[SW]", "Delete Cache:", cacheName);

						return caches.delete(cacheName);
					}
				})
			)).
			then(() =>
			{
				settings.debug && console.log("[SW]", "Claiming clients");

				return self.clients.claim();
			})

	);
});

self.addEventListener("fetch", (event) =>
{
	const request		= event.request;
	const url			= new URL(request.url);
	const sameOrigin	= (url.origin == location.origin);

	// TODO: Check "event.request.destination" for best response management
	// static assets cache first
	// xhr network first

	if(settings.cacheFirst && sameOrigin)
	{
		settings.debug && console.info("[SW]", "Try Response from Cache:", request.url);

		event.respondWith(responseFromCache(request));
	}
	else
	{
		settings.debug && console.info("[SW]", "Try Response from Fetch:", request.url);

		event.respondWith(fetchResponse(request));
	}

	// event.waitUntil(updateAndRefresh(request));
});

const addToCache = (resourcesList) =>
{
	settings.debug && console.info("[SW]", "Add to Cache", settings.cacheName, resourcesList);

	return caches.open(settings.cacheName)
		.then(cache => cache.addAll(resourcesList))
		.catch((e) =>
		{
			settings.debug && console.error("[SW]", "Cannot add to cache", e);
		});
};


const fetchResponse = (request) =>
{
	const url			= new URL(request.url);
	const sameOrigin	= (url.origin == location.origin);

	const requestClone	= request.clone();

	settings.debug && console.log("[SW]", "Request:", request.url, request);

	return fetch(requestClone, {mode: "no-cors"}).then((response) =>
	{
		settings.debug && console.log("[SW]", "Response:", request.url, response);

		if(response.ok || response.type == "opaque")
		{
			if(settings.saveInCache)
			{
				//  Open the cache
				return caches.open(settings.cacheName).then(function(cache)
				{
					const responseClone = response.clone();

					// Put the fetched response in the cache
					cache.put(request, responseClone);

					settings.debug && console.log("[SW]", "New Data Cached", request.url);

					// Return the response
					return response;
				});
			}

			return response;
		}

		settings.debug && console.error("[SW]", "Response not OK", request.url);

		if(response.type == "opaque")
		{
			return response;
		}

		if(settings.cacheFirst)
		{
			return handleDefault(request);
		}
		else
		{
			return responseFromCache(request);
		}
	})
	.catch((err) =>
	{
		settings.debug && console.error("[SW]", "Fetch Error:", err);

		if(settings.cacheFirst)
		{
			return handleDefault(request);
		}
		else
		{
			return responseFromCache(request);
		}
	});
};

const responseFromCache = (request) =>
{
	const requestClone	= request.clone();

	return caches.match(requestClone)
		.then((response) =>
		{
			settings.debug && console.log("[SW]", "Request to cache:", request.url, request);

			if (response)
			{
				settings.debug && console.info("[SW]", "Found in Cache:", request.url, response);

				return response;
			}

			if(settings.cacheFirst)
			{
				return fetchResponse(request);
			}
			else
			{
				return handleDefault(request, response);
			}
		});
};



////////////////////////////////////////////////////////////////
// Default Response for Fetch Errors

const handleDefault = (request, response) =>
{
	settings.debug && console.info("[SW]", "Handle Default:", request.url);
	settings.debug && console.info("[SW]", "Request method:", request.method);
	settings.debug && console.info("[SW]", "Request url:", request.url);
	settings.debug && console.info("[SW]", "Request destination:", request.destination);

	if(settings.defaultHTML && requestIsNavigation(request))
	{
		return caches.match(settings.defaultHTML);
	}

	if(settings.defaultFavicon && requestIsFavicon(request))
	{
		settings.debug && console.info("[SW]", "Response Default Favicon:", settings.defaultFavicon);

		return caches.match(settings.defaultFavicon);
	}
	else if(settings.defaultImage && requestIsImage(request))
	{
		settings.debug && console.info("[SW]", "Response Default Image:", settings.defaultImage);

		return caches.match(settings.defaultImage);
	}

	if(settings.defaultFallbackContent)
	{
		return Promise.resolve(new Response(settings.defaultFallbackContent, {
			headers: {
				"Content-Type": settings.defaultFallbackType
			}
		}));
	}

	return response;
};

const requestIsNavigation = (request) =>
{
	return (request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept").includes("text/html")));
};

const requestIsFavicon = (request) =>
{
	return requestIsImage(request) && request.url.match(/favicon\.ico$/);
};

const requestIsImage = (request) =>
{
    return (request.method === "GET" && request.destination === "image");
};


////////////////////////////////////////////////////////////////

const updateAndRefresh = (request) =>
{
	return updateCache(request).then(refreshClients);
};

const updateCache = (request) =>
{
	return caches.open(settings.cacheName).then((cache) =>
		fetch(request).then((response) =>
		{
			if(response.ok)
			{
				return cache.put(request, response.clone()).then(() =>
					response
				);
			}

			return response;
		})
	);
};

const refreshClients = (response) =>
{
	if(!response.ok)
	{
		return response;
	}

	return self.clients.matchAll().then((clients) =>
	{
		for(let client of clients)
		{
			let message = {
				type: "refresh",
				url: response.url,
				eTag: response.headers.get("ETag")
			};

			settings.debug && console.log(message);

			client.postMessage(JSON.stringify(message));
		}

		return response;
	});
};



