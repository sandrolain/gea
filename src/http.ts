
const objectToFormData = (body: any): FormData => {
  const bodyFormData = new FormData();

  const processValue = (body: any, keyPrefix = ""): void => {
    if(body instanceof Array) {
      for(let i = 0, len = body.length; i < len; i++) {
        const value = body[i];
        const key: string = keyPrefix ? `${keyPrefix}[${i}]` : i.toString();

        if(typeof value === "object") {
          processValue(value, key);
        } else {
          bodyFormData.append(key, value);
        }
      }
    }

    for(let key in body) {
      const value = body[key];

      key = keyPrefix ? `${keyPrefix}[${key}]` : key;

      if(typeof value === "object") {
        processValue(value, key);
      } else {
        bodyFormData.append(key, value);
      }
    }
  };

  processValue(body);

  return bodyFormData;
};

export interface RequestOptions {
  method?: string;
  mode?: string;
  headers?: HeadersInit;
  body?: any;
  referrer?: "string";
  onprogress?: (progress: {receivedLength: number; contentLength: number; progress: number}) => void;
  parse?: string;
}


export const request = (url: string, settings: RequestOptions = {}): Promise<Response | any>  => {
  const {
    method,
    mode,
    headers,
    body,
    referrer,
    onprogress,
    parse
  } = settings;

  const options: Record<string, any> = {
    method: (method || "GET").toUpperCase(),
    mode: mode || "same-origin", // cors, no-cors, same-origin, or navigate
    referrer: referrer || "client" // no-referrer, client, or a URL
  };

  if(headers) {
    options.headers = new Headers(headers);
  }

  if(body && options.method === "POST") {
    if(body.constructor === Object) {
      options.body = objectToFormData(body);
    } else {
      options.body = body;
    }
  }

  return fetch(url, options).then(async (response) => {
    if(onprogress) {
      const reader = response.clone().body.getReader();
      const contentLength = +response.headers.get("Content-Length");

      let done = false,
        receivedLength = 0;

      do {
        const readed = await reader.read();

        done = readed.done;

        if(!done) {
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

    switch(parse) {
    case "text"       : return response.text();
    case "json"       : return response.json();
    case "blob"       : return response.blob();
    case "arrayBuffer": return response.arrayBuffer();
    case "formData"   : return response.formData();
    }

    return response;
  });
};

export const get = (url: string, options: RequestOptions = {}): Promise<Response | any> => {
  return request(url, Object.assign({}, options, { method: "GET" }));
};

export const post = (url: string, options: RequestOptions = {}): Promise<Response | any> => {
  return request(url, Object.assign({}, options, { method: "POST" }));
};
