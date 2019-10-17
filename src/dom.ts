
export const byTagName = ($node: Element, tagName: string): Element[] => {
  return Array.from($node.getElementsByTagName(tagName));
};

export const removeNode = ($node: Node): void => {
  if($node.parentNode) {
    $node.parentNode.removeChild($node);
  }
};

export const removeNodes = ($$nodes: Node[]): void => {
  for(const $node of $$nodes) {
    removeNode($node);
  }
};

export const insertNodeBefore = ($node: Node, $dest: Node): void => {
  if($dest.parentNode) {
    $dest.parentNode.insertBefore($node, $dest);
  }
};

export const insertNodesBefore = ($$nodes: Node[], $dest: Node): void => {
  for(const $node of $$nodes) {
    insertNodeBefore($node, $dest);
  }
};

export const replaceWithNode = ($dest: Node, $node: Node): void => {
  insertNodeBefore($node, $dest);
  removeNode($dest);
};

export const replaceWithNodes = ($dest: Node, $$nodes: Node[]): void => {
  insertNodesBefore($$nodes, $dest);
  removeNode($dest);
};

export const getAttributesMap = ($node: Element): Map<string, string> => {
  const attributes = new Map();

  for(let i = 0, len = $node.attributes.length; i < len; i++) {
    const { name, value } = $node.attributes.item(i);

    attributes.set(name, value);
  }

  return attributes;
};

export const getAttributesObject = ($node: Element): Record<string, string> => {
  const attributes: Record<string, string> = {};

  for(let i = 0, len = $node.attributes.length; i < len; i++) {
    const { name, value } = $node.attributes.item(i);

    attributes[name] = value;
  }

  return attributes;
};

export const getChildren = ($node: Element): Node[] => {
  return Array.from($node.childNodes);
};

