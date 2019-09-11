// ref. https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item)
{
	return (item && typeof item === "object" && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources)
{
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, {
					[key]: {}
				});
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, {
					[key]: source[key]
				});
			}
		}
	}

	return mergeDeep(target, ...sources);
}


// ref. https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript

export function escapeRegExp(text)
{
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


export function forEach(obj, cb)
{
	if(obj)
	{
		if(obj instanceof Map || obj instanceof Array || obj instanceof Set)
		{
			obj.forEach(cb);
		}
		else if(typeof obj == "object")
		{
			for(let key in obj)
			{
				cb.call(obj, obj[key], key);
			}
		}
	}
}


export function intersect(arrA, arrB)
{
	return arrA.filter(x => arrB.includes(x));
}


export const mapToObject = (map) =>
{
	const obj = {};

	for (let [key, value] of map)
	{
		obj[key] = value;
	}

	return obj;
}
