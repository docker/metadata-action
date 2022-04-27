import {parse} from 'csv-parse/sync';

export interface Image {
  name: string;
  enable: boolean;
}

export function Transform(inputs: string[]): Image[] {
  const images: Image[] = [];
  for (const input of inputs) {
    const image: Image = {name: '', enable: true};
    const fields = parse(input, {
      relaxColumnCount: true,
      skipEmptyLines: true
    })[0];
    for (const field of fields) {
      const parts = field
        .toString()
        .split('=')
        .map(item => item.trim());
      if (parts.length == 1) {
        image.name = parts[0].toLowerCase();
      } else {
        const key = parts[0].toLowerCase();
        const value = parts[1];
        switch (key) {
          case 'name': {
            image.name = value.toLowerCase();
            break;
          }
          case 'enable': {
            if (!['true', 'false'].includes(value)) {
              throw new Error(`Invalid enable attribute value: ${input}`);
            }
            image.enable = /true/i.test(value);
            break;
          }
          default: {
            throw new Error(`Unknown image attribute: ${input}`);
          }
        }
      }
    }
    if (image.name.length == 0) {
      throw new Error(`Image name attribute empty: ${input}`);
    }
    images.push(image);
  }
  return images;
}
