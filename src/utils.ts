// ref. https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Simple array check.
 * @param item
 * @returns {boolean}
 */
export function isArray(item: any): boolean {
  return item && Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }

        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

// ref. https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
export function escapeRegExp(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export type ForEachIterable =
  | Map<any, any>
  | Array<any>
  | Set<any>
  | Record<string, any>;

export function forEach(
  obj: ForEachIterable,
  cb: (value: any, key: any) => any
): void {
  if (obj) {
    if (obj instanceof Map || obj instanceof Array || obj instanceof Set) {
      obj.forEach(cb);
    } else if (typeof obj === "object") {
      for (const key in obj) {
        cb.call(obj, obj[key], key);
      }
    }
  }
}

// TODO: map function like forEach: return same type of input

export const intersect = (arrA: any[], arrB: any[]): any[] => {
  return arrA.filter(x => arrB.includes(x));
};

export const mapToObject = (map: Map<string, any>): Record<string, any> => {
  const obj: Record<string, any> = {};

  map.forEach((value: any, key: string) => {
    obj[key] = value;
  });

  return obj;
};
