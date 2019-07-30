import { readdirSync, lstatSync, Stats } from 'fs';

// This shouldn't be necessary
export function merge(a: any, b: any) {
  return { ...a, ...b };
}

export function asort(obj: any[]) {
  return obj.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    let index = 0;

    if (aName[0] === '.' && bName[0] === '.') {
      index++;
    }

    if (aName[index] > bName[index]) {
      return 1;
    } else if (aName[index] < bName[index]) {
      return -1;
    } else {
      return 0;
    }
  })
}

export function hsort(obj: any[]) {
  return obj.sort((a, b) => {
    return b.index - a.index;
  })
}

export function findFile(start: string, target: string) {
  return (function read(dir) {
    if ([
      '/dev',
      '/sys',
      '/proc',
      '/net'
    ].indexOf(dir) !== -1) {
      return null;
    }

    let files;
    try {
      files = readdirSync(dir);
    } catch (error) {
      files = [] as string[];
    }

    files.forEach(file => {
      if (file === target) {
        return (dir === '/' ? '' : dir) + '/' + file;
      }

      let stat: Stats | undefined;
      try {
        stat = lstatSync((dir === '/' ? '' : dir) + '/' + file);
      } catch (error) { }

      if (stat && stat.isDirectory() && !stat.isSymbolicLink()) {
        const out = read((dir === '/' ? '' : dir) + '/' + file);
        if (out) {
          return out;
        }
      }
    });

    return null;

  })(start);
}

export function escape(text: string) {
  return text.replace(/[{}]/g, char => char === '{' ? '{open}': '{close}');
}

export function parseTags(text: string, screen: Screen) {
  // return helpers.Element.prototype._parseTags.call(
  //   { parseTags: true, screen: screen || helpers.Screen.global }, text);
  ??
}

export function generateTags(style: )