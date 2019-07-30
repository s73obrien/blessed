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
  // ??
}

export function generateTags(style: any): {open: string, close: string};
export function generateTags(style: any, text: string): string;
export function generateTags(style: any, text?: string): {open: string, close: string} | string {
  let open = '';
  let close = '';

  Object.keys(style || {}).forEach(key => {
    let value = style[key];
    if (typeof value === 'string') {
      value = value.replace(/^light(?!-)/, 'light-');
      value = value.replace(/^bright(?!-)/, 'bright-');
      open = `{${value}-${key}}${open}`;
      close = `${close}{/${value}-${key}}`;
    } else {
      if (value === true) {
        open = `{${key}}${open}`;
        close = `${close}{/${key}}`;
      }
    }
  });

  if (text) {
    return open + text + close;
  }

  return {
    open,
    close
  };
}

export function attrToBinary(style: any, element: any) {
  // return helpers.Element.prototype.sattr.call(element || {}, style);
}

export function stripTags(text: string): string {
  if (text) {
    return text.replace(/{(\/?)([\w\-,;!#]*)}/g, '')
    .replace(/\x1b\[[\d;]*m/g, '');
  } else {
    return '';
  }
}

export function cleanTags(text: string): string {
  return stripTags(text).trim();
}

export function dropUnicode(text: string): string {
  if (text) {
    return text
    // .replace(unicode.chars.all, '??')
    // .replace(unicode.chars.combining, '')
    // .replace(unicode.chars.surrogate, '?');
  } else {
    return '';
  }
}

