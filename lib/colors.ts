export const _cache: { [index: string]: number } = {};

export function match(red: string | number | number[], green?: number, blue?: number, colorList: number[][] = vcolors): number {
  if (typeof red === 'string') {
    if (red[0] !== '#') {
      return -1;
    }

    [red, green, blue] = hexToRGB(red);
  } else if (Array.isArray(red)) {
    [red, green, blue] = red;
  }
  const r: number = red as number;
  const g: number = green!;
  const b: number = blue!;
  const hash = (r << 16) | (g << 8) | b;

  if (_cache[hash]) {
    return _cache[hash];
  }

  let ldiff = Infinity;
  let li = -1;
  let i = 0;
  let r2;
  let g2;
  let b2;
  let diff;

  for(let index = 0; index < colorList.length; index++) {
    [r2, g2, b2] = colorList[index];

    diff = colorDistance(r, g, b, r2, g2, b2);
    if (diff === 0) {
      li = i;
      break;
    }

    if (diff < ldiff) {
      ldiff = diff;
      li = i;
    }
  }

  _cache[hash] = li;

  return li;
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

export function RGBToHex(r: number | number[], g?: number, b?: number) {
  if (Array.isArray(r)) {
    [r, g, b] = r;
  }

  return `#${hex(r)}${hex(g!)}${hex(b!)}`;
}

export function hexToRGB(hex: string) {
  if (hex.length === 4) {
    hex = hex[0] +
      hex[1] + hex[1] +
      hex[2] + hex[2] +
      hex[3] + hex[3];
  }

  const color = parseInt(hex.slice(1), 16);
  const r = (color >> 16) & 0xFF;
  const g = (color >> 8) & 0xFF;
  const b = color & 0xFF;

  return [r, g, b];
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.pow(30 * (r1 - r2), 2) +
    Math.pow(59 * (g1 - g2), 2) +
    Math.pow(11 * (b1 - b2), 2);
}

export function mixColors(index1: number, index2: number, alpha: number = 0.5) {
  if (index1 === 0x1FF) {
    index1 = 0;
  }

  if (index2 === 0x1FF) {
    index2 = 0;
  }

  const [r1, g1, b1] = vcolors[index1];
  const [r2, g2, b2] = vcolors[index2];

  return match(
    (r2 - r1) * alpha | 0,
    (g2 - g1) * alpha | 0,
    (b2 - b1) * alpha | 0
  );
}

function sumReducer(acc: number, c: number) { return acc + c; }
export const _blendCache: { [index: string]: number } = {};
export function blend(attr: number, attr2: number, alpha: number) {
  let bg = attr & 0x1FF;
  if (attr2 != null) {
    let bg2 = attr2 & 0x1FF;
    if (bg === 0x1FF) {
      bg = 0;
    }
    if (bg2 === 0x1FF) {
      bg2 = 0;
    }
    bg = mixColors(bg, bg2, alpha);
  } else {
    if (_blendCache[bg] != null) {
      bg = _blendCache[bg];
    } else if (bg >= 8 && bg <= 15) {
      bg -= 8;
    } else {
      let name = ncolors[bg];
      if (name) {
        for (let index = 0; index < ncolors.length; index++) {
          if (name === ncolors[index] && index !== bg) {
            if (vcolors[bg].reduce(sumReducer) < vcolors[index].reduce(sumReducer)) {
              _blendCache[bg] = index;
              bg = index;
              break;
            }
          }
        }
      }
    }
  }

  attr &= ~0x1FF;
  attr |= bg;

  let fg = (attr >> 9) & 0x1FF;
  if (attr2 != null) {
    let fg2 = (attr2 >> 9) & 0x1FF;
    if (fg === 0x1FF) {
      fg = 248;
    } else {
      if (fg === 0x1FF) {
        fg = 7;
      }
      if (fg2 === 0x1FF) {
        fg2 = 7;
      }
      fg = mixColors(fg, fg2, alpha);
    }
  } else {
    if (_blendCache[fg] != null) {
      fg = _blendCache[fg];
    } else if (fg >= 8 && fg <= 15) {
      fg -= 8;
    } else {
      let name = ncolors[fg];
      if (name) {
        for (let index = 0; index < ncolors.length; index++) {
          if (name === ncolors[index] && index !== fg) {
            if (vcolors[index].reduce(sumReducer) < vcolors[fg].reduce(sumReducer)) {
              _blendCache[fg] = index;
              fg = index;
              break;
            }
          }
        }
      }
    }
  }

  attr &= ~(0x1FF << 9);
  attr |= fg << 9;

  return attr;
}

export function reduce(color: number, total: number): number {
  if (color >= 16 && total <= 16) {
    color = ccolors[color];
  } else if (color >= 8 && total <= 8) {
    color -= 8;
  } else if (color >= 2 && total <= 2) {
    color %= 2;
  }
  return color;
}

export const xterm = [
  '#000000', // black
  '#CD0000', // red3
  '#00CD00', // green3
  '#CDCD00', // yellow3
  '#0000ee', // blue2
  '#CD00CD', // magenta3
  '#00CDCD', // cyan3
  '#E5E5E5', // gray90
  '#7F7F7F', // gray50
  '#FF0000', // red
  '#00FF00', // green
  '#FFFF00', // yellow
  '#5C5CFF', // rgb:5c/5c/FF
  '#FF00FF', // magenta
  '#00FFFF', // cyan
  '#FFFFFF'  // white
];

const colors: string[] = [];
const vcolors: number[][] = [];

function push(i: number, r: number, g: number, b: number) {
  colors[i] = `#${hex(r)}${hex(g)}${hex(b)}`;
  vcolors[i] = [r, g, b];
}

xterm.forEach((color, index) => {
  const c = hexToRGB(color);
  colors[index] = color;
  vcolors[index] = c;
});

for (let r = 0; r < 6; r++) {
  for (let g = 0; g < 6; g++) {
    for (let b = 0; b < 6; b++) {
      push(
        16 + (r * 36) + (g * 6) + b,
        r * 40 + 55,
        g * 40 + 55,
        b * 40 + 55
      );
    }
  }
}

for (let v = 0; v < 24; v++) {
  push(
    232 + v,
    (v * 10) + 8,
    (v * 10) + 8,
    (v * 10) + 8
  )
}

//const ccolors = colors.map(color => match(color, undefined, undefined, vcolors.slice(0, 8)));

const colorNames: {[index: string]: number} = {
  // special
  default: -1,
  normal: -1,
  bg: -1,
  fg: -1,
  // normal
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  // light
  lightblack: 8,
  lightred: 9,
  lightgreen: 10,
  lightyellow: 11,
  lightblue: 12,
  lightmagenta: 13,
  lightcyan: 14,
  lightwhite: 15,
  // bright
  brightblack: 8,
  brightred: 9,
  brightgreen: 10,
  brightyellow: 11,
  brightblue: 12,
  brightmagenta: 13,
  brightcyan: 14,
  brightwhite: 15,
  // alternate spellings
  grey: 8,
  gray: 8,
  lightgrey: 7,
  lightgray: 7,
  brightgrey: 7,
  brightgray: 7
};

export function convert(color: number | string): number {
  if (typeof color === 'string') {
    color = color.replace(/[\- ]/g, '');
    if (colorNames[color] != null) {
      color = colorNames[color];
    } else {
      color = match(color);
    }
  } else if (Array.isArray(color)) {
    color = match(color);
  } else {
    color = -1;
  }

  return color !== -1 ? color : 0x1FF;
}

const wtfcolors: {[index: string]: (number | number[])[]} = {
  blue: [
    4,
    12,
    [17, 21],
    [24, 27],
    [31, 33],
    [38, 39],
    45,
    [54, 57],
    [60, 63],
    [67, 69],
    [74, 75],
    81,
    [91, 93],
    [97, 99],
    [103, 105],
    [110, 111],
    117,
    [128, 129],
    [134, 135],
    [140, 141],
    [146, 147],
    153,
    165,
    171,
    177,
    183,
    189
  ],

  green: [
    2,
    10,
    22,
    [28, 29],
    [34, 36],
    [40, 43],
    [46, 50],
    [64, 65],
    [70, 72],
    [76, 79],
    [82, 86],
    [106, 108],
    [112, 115],
    [118, 122],
    [148, 151],
    [154, 158],
    [190, 194]
  ],

  cyan: [
    6,
    14,
    23,
    30,
    37,
    44,
    51,
    66,
    73,
    80,
    87,
    109,
    116,
    123,
    152,
    159,
    195
  ],

  red: [
    1,
    9,
    52,
    [88, 89],
    [94, 95],
    [124, 126],
    [130, 132],
    [136, 138],
    [160, 163],
    [166, 169],
    [172, 175],
    [178, 181],
    [196, 200],
    [202, 206],
    [208, 212],
    [214, 218],
    [220, 224]
  ],

  magenta: [
    5,
    13,
    53,
    90,
    96,
    127,
    133,
    139,
    164,
    170,
    176,
    182,
    201,
    207,
    213,
    219,
    225
  ],

  yellow: [
    3,
    11,
    58,
    [100, 101],
    [142, 144],
    [184, 187],
    [226, 230]
  ],

  black: [
    0,
    8,
    16,
    59,
    102,
    [232, 243]
  ],

  white: [
    7,
    15,
    145,
    188,
    231,
    [244, 255]
  ]
};

export const ccolors: number[] = [];
export const ncolors: string[] = [];
Object.keys(wtfcolors).forEach(name => {
  wtfcolors[name].forEach(offset => {
    if (typeof offset === 'number') {
      ncolors[offset] = name;
      ccolors[offset] = colorNames[name];
      return;
    }

    for (let index = offset[0], l = offset[1]; index <= l; index++) {
      ncolors[index] = name;
      ccolors[index] = colorNames[name];
    }
  })
})