// Generate fileAssociations for electron-builder.
// File types are generated from [Github Linguist](https://github.com/github/linguist)
// languates list.

const fetch = require('node-fetch');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const SOURCE_YAML =
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';

const SAVE_TO = path.join(__dirname, '../config/electron-builder/fileAssociations.json');

const filetypes = async () => {
  const yamlDoc = await fetch(SOURCE_YAML).then(res => res.text());

  const parsed = yaml.safeLoad(yamlDoc);

  const fileAssociations = Object.keys(parsed)
    .filter(key => parsed[key].extensions)
    .map(key => ({
      name: key,
      role: 'Editor',
      icon: 'generic.icns',
      ext: parsed[key].extensions.map(e => e.replace('.', '')),
    }));

  fs.writeFileSync(SAVE_TO, JSON.stringify(fileAssociations, null, 2), { encoding: 'utf-8' });
};

filetypes();
