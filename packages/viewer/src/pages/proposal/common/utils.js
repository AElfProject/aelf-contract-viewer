/**
 * @file utils
 * @author atom-yang
 */

export const arrayToMap = arr => arr.reduce((acc, v) => ({
  ...acc,
  [v]: v
}), {});
