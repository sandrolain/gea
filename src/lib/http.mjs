
const objectToFormData = (body) =>
{
	const bodyFormData = new FormData();

	const processValue = (body, keyPrefix = "") =>
	{
		if(body instanceof Array)
		{
			for(let key = 0, len = body.length; key < len; key++)
			{
				let value = body[key];

				key = keyPrefix ? `${keyPrefix}[${key}]` : key.toString();

				if(typeof value == "object")
				{
					processValue(value, key);
				}
				else
				{
					bodyFormData.append(key, value);
				}
			}
		}

		for(let key in body)
		{
			let value = body[key];

			key = keyPrefix ? `${keyPrefix}[${key}]` : key;

			if(typeof value == "object")
			{
				processValue(value, key);
			}
			else
			{
				bodyFormData.append(key, value);
			}
		}
	};

	processValue(body);

	return bodyFormData;
};


export const request = (url, settings = {}) =>
{
	const {
		method,
		mode,
		headers,
		body,
		referrer,

		onprogress,
		parse
	} = settings;

	const options = {
		method: (method || "GET").toUpperCase(),
		mode: mode || "same-origin", // cors, no-cors, same-origin, or navigate
		referrer: referrer || "client", // no-referrer, client, or a URL
	};

	if(headers)
	{
		options.headers = new Headers(headers);
	}

	if(body, options.method == "POST")
	{
		if(body.constructor == Object)
		{
			options.body = objectToFormData(body);
		}
		else
		{
			options.body = body;
		}

	}

	const request = new Request(url, options);

	return fetch(request).then(async (response) =>
	{
		if(onprogress)
		{
			const reader = response.clone().body.getReader();
			const contentLength = +response.headers.get("Content-Length");

			let done = false,
				receivedLength = 0;

			do
			{
				let readed = await reader.read();

				done = readed.done;

				if(!done)
				{
					receivedLength += readed.value.length;

					onprogress({
						receivedLength,
						contentLength,
						progress: receivedLength / contentLength
					});
				}
			}
			while(!done);
		}

		if(["json", "text", "blob", "arrayBuffer", "formData"].indexOf(parse) > -1)
		{
			return response[parse]();
		}

		return response.blob();
	});
};


export const get = (url, options = {}) =>
{
	return request(url, Object.assign({}, options, {method: "GET"}));
};

export const post = (url, options = {}) =>
{
	return request(url, Object.assign({}, options, {method: "POST"}));
};
