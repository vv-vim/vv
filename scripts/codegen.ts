/* eslint-disable camelcase */

import { spawn } from 'child_process';
import { createDecodeStream, encode } from 'msgpack-lite';
import { writeFileSync } from 'fs';
import prettier from 'prettier';
import { camelCase } from 'lodash';

const TYPES_FILE_NAME = 'packages/nvim/src/__generated__/types.ts';
const CONST_FILE_NAME = 'packages/nvim/src/__generated__/constants.ts';

const nvimProcess = spawn('nvim', ['--embed', '-u', 'NONE']);

nvimProcess.stderr.pipe(process.stdout);

const decodeStream = createDecodeStream();
const msgpackIn = nvimProcess.stdout.pipe(decodeStream);

const replaceType = (originalType: string) => {
  const replacements = {
    Array: 'Array<any>',
    String: 'string',
    Integer: 'number',
    Boolean: 'boolean',
    Float: 'number',
    Dictionary: 'Record<string, any>',
    Object: 'any',
    Window: 'number',
    Buffer: 'number',
    Tabpage: 'number',
    LuaRef: 'any',
    'ArrayOf(String)': 'string[]',
    'ArrayOf(Integer)': 'number[]',
    'ArrayOf(Integer, 2)': '[number, number]',
    'ArrayOf(Dictionary)': 'Record<string, any>[]',
    'ArrayOf(Window)': 'number[]',
    'ArrayOf(Buffer)': 'number[]',
    'ArrayOf(Tabpage)': 'number[]',
  } as Record<string, string>;
  return replacements[originalType] || originalType;
};

const replaceName = (originalName: string) => {
  const replacements = {
    window: 'win',
  } as Record<string, string>;

  return replacements[originalName] || originalName;
};

msgpackIn.on('data', (data) => {
  const apiInfo = data[3][1];
  writeFileSync('tmp/apiInfo.json', JSON.stringify(apiInfo, null, 2), { encoding: 'utf8' });
  const { ui_events, functions } = apiInfo;

  let result: string[] = [];

  const version = [apiInfo.version.major, apiInfo.version.minor, apiInfo.version.patch].join('.');

  result.push('/* eslint-disable camelcase */');
  result.push('/**');
  result.push(' * Types generated by `yarn generate-types`. Do not edit manually.');
  result.push(' * ');
  result.push(` * Version: ${version}`);
  result.push(` * Api Level: ${apiInfo.version.api_level}`);
  result.push(` * Api Compatible: ${apiInfo.version.api_compatible}`);
  result.push(` * Api Prerelease: ${apiInfo.version.api_prerelease}`);
  result.push(' */');
  result.push('');

  result.push('/**');
  result.push(' * UI events types emitted by `redraw` event. Do not edit manually.');
  result.push(' * More info: https://neovim.io/doc/user/ui.html');
  result.push(' */');

  result.push('export type UiEvents = {');
  ui_events.forEach(({ name, parameters }: { name: string; parameters: string[][] }) => {
    const parametersType = parameters.map(([type, typeName]) => {
      return `${typeName}: ${replaceType(type)}`;
    });
    result.push(`  ${name}: [${parametersType.join(', ')}];\n`);
  });
  result.push('}\n');

  result.push('/**');
  result.push(' * Nvim commands.');
  result.push(' * More info: https://neovim.io/doc/user/api.html');
  result.push(' */');

  result.push('export type NvimCommands = {');
  functions
    .filter((f) => !f.deprecated_since)
    .forEach(
      ({
        name,
        parameters,
        return_type,
      }: {
        name: string;
        parameters: string[][];
        return_type: string;
      }) => {
        const parametersType = parameters.map(([type, typeName]) => {
          return `${replaceName(typeName)}: ${replaceType(type)}`;
        });
        result.push(`  ${name}: (${parametersType.join(', ')}) => ${replaceType(return_type)};\n`);
      },
    );
  result.push('}\n');

  const prettifiedTypes = prettier.format(result.join('\n'), { parser: 'typescript' });

  writeFileSync(TYPES_FILE_NAME, prettifiedTypes, {
    encoding: 'utf8',
  });

  result = [];
  result.push('/* eslint-disable camelcase */');
  result.push('/**');
  result.push(' * Constants generated by `yarn generate-types`. Do not edit manually.');
  result.push(' * ');
  result.push(` * Version: ${version}`);
  result.push(` * Api Level: ${apiInfo.version.api_level}`);
  result.push(` * Api Compatible: ${apiInfo.version.api_compatible}`);
  result.push(` * Api Prerelease: ${apiInfo.version.api_prerelease}`);
  result.push(' */');
  result.push('');

  result.push('export const nvimCommandNames = {');
  functions
    .filter((f) => !f.deprecated_since)
    .forEach(({ name }: { name: string }) => {
      result.push(`  ${camelCase(name.replace('nvim_', ''))}: '${name}',`);
    });
  result.push('} as const;\n');

  const prettifiedConst = prettier.format(result.join('\n'), { parser: 'typescript' });

  writeFileSync(CONST_FILE_NAME, prettifiedConst, {
    encoding: 'utf8',
  });
});

nvimProcess.stdin.write(encode([0, 1, 'nvim_get_api_info', []]));

setTimeout(() => {
  nvimProcess.stdin.write(encode([0, 1, 'nvim_command', ['q']]));
}, 100);
