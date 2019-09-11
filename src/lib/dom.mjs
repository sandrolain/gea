
export const byTagName = ($node, tagName) =>
{
	return Array.from($node.getElementsByTagName(tagName));
}

export const removeNode = ($node) =>
{
	if($node.parentNode)
	{
		$node.parentNode.removeChild($node);
	}
};

export const insertNodeBefore = ($node, $dest) =>
{
	if($dest.parentNode)
	{
		$dest.parentNode.insertBefore($node, $dest);
	}
}

export const replaceWithNode = ($dest, $node) =>
{
	insertNodeBefore($node, $dest);

	removeNode($dest);
};

export const getAttributesMap = ($node) =>
{
	const attributes = new Map();

	for(let {name, value} of $node.attributes)
	{
		attributes.set(name, value);
	}

	return attributes;
};

export const getAttributesObject = ($node) =>
{
	const attributes = {};

	for(let {name, value} of $node.attributes)
	{
		attributes[name] = value;
	}

	return attributes;
};

export const getChildren = ($node) =>
{
	return Array.from($node.childNodes);
};

export const insertNodesBefore = ($$nodes, $dest) =>
{
	for(let $node of $$nodes)
	{
		insertNodeBefore($node, $dest);
	}
}

export const replaceWithNodes = ($dest, $$nodes) =>
{
	insertNodesBefore($$nodes, $dest);

	removeNode($dest);
};

