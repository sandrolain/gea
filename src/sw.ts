/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />

const settings = {
  cacheName: "cache-v2",
  resourcesToCache: ([] as string[]),
  saveInCache: true,
  cacheFirst: false,
  defaultImage: "./assets/sw-default-image.png",
  defaultHTML: "./assets/sw-offline.html",
  defaultFavicon: "./assets/sw-default-favicon.ico",
  defaultFallbackType: "image/svg+xml",
  defaultFallbackContent: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" stroke-linejoin="round">
    <path stroke="#DDD" stroke-width="25" d="M99,18 15,162H183z"/>
    <path stroke-width="17" fill="#FFF" d="M99,18 15,162H183z" stroke="#eee"/>
    <path d="M91,70a9,9 0 0,1 18,0l-5,50a4,4 0 0,1-8,0z" fill="#aaa"/>
    <circle cy="138" r="9" cx="100" fill="#aaa"/>
  </svg>`,
  debug: true
};

(self as any).importScripts("./sw/sw-runtime.js");
