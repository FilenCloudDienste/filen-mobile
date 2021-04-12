export const matchesRedirect = (input, route) => {
  const { from, to } = route;
  if (to === undefined) {
    return false;
  }
  if (from.length > input.length) {
    return false;
  }
  for (let i = 0; i < from.length; i++) {
    const expected = from[i];
    if (expected === '*') {
      return true;
    }
    if (expected !== input[i]) {
      return false;
    }
  }
  return from.length === input.length;
};
export const routeRedirect = (path, routes) => {
  return routes.find(route => matchesRedirect(path, route));
};
export const matchesIDs = (ids, chain) => {
  const len = Math.min(ids.length, chain.length);
  let i = 0;
  for (; i < len; i++) {
    if (ids[i].toLowerCase() !== chain[i].id) {
      break;
    }
  }
  return i;
};
export const matchesPath = (inputPath, chain) => {
  const segments = new RouterSegments(inputPath);
  let matchesDefault = false;
  let allparams;
  for (let i = 0; i < chain.length; i++) {
    const path = chain[i].path;
    if (path[0] === '') {
      matchesDefault = true;
    }
    else {
      for (const segment of path) {
        const data = segments.next();
        // data param
        if (segment[0] === ':') {
          if (data === '') {
            return null;
          }
          allparams = allparams || [];
          const params = allparams[i] || (allparams[i] = {});
          params[segment.slice(1)] = data;
        }
        else if (data !== segment) {
          return null;
        }
      }
      matchesDefault = false;
    }
  }
  const matches = (matchesDefault)
    ? matchesDefault === (segments.next() === '')
    : true;
  if (!matches) {
    return null;
  }
  if (allparams) {
    return chain.map((route, i) => ({
      id: route.id,
      path: route.path,
      params: mergeParams(route.params, allparams[i]),
      beforeEnter: route.beforeEnter,
      beforeLeave: route.beforeLeave
    }));
  }
  return chain;
};
export const mergeParams = (a, b) => {
  if (!a && b) {
    return b;
  }
  else if (a && !b) {
    return a;
  }
  else if (a && b) {
    return Object.assign(Object.assign({}, a), b);
  }
  return undefined;
};
export const routerIDsToChain = (ids, chains) => {
  let match = null;
  let maxMatches = 0;
  const plainIDs = ids.map(i => i.id);
  for (const chain of chains) {
    const score = matchesIDs(plainIDs, chain);
    if (score > maxMatches) {
      match = chain;
      maxMatches = score;
    }
  }
  if (match) {
    return match.map((route, i) => ({
      id: route.id,
      path: route.path,
      params: mergeParams(route.params, ids[i] && ids[i].params)
    }));
  }
  return null;
};
export const routerPathToChain = (path, chains) => {
  let match = null;
  let matches = 0;
  for (const chain of chains) {
    const matchedChain = matchesPath(path, chain);
    if (matchedChain !== null) {
      const score = computePriority(matchedChain);
      if (score > matches) {
        matches = score;
        match = matchedChain;
      }
    }
  }
  return match;
};
export const computePriority = (chain) => {
  let score = 1;
  let level = 1;
  for (const route of chain) {
    for (const path of route.path) {
      if (path[0] === ':') {
        score += Math.pow(1, level);
      }
      else if (path !== '') {
        score += Math.pow(2, level);
      }
      level++;
    }
  }
  return score;
};
export class RouterSegments {
  constructor(path) {
    this.path = path.slice();
  }
  next() {
    if (this.path.length > 0) {
      return this.path.shift();
    }
    return '';
  }
}
