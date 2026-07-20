/** @jest-environment node */

import puppeteer from 'puppeteer';
import { PORT } from 'config/jest/testServer';

import type { Browser, Page } from 'puppeteer';

const setup = async (browser: Browser): Promise<Page> => {
  const page = await browser.newPage();
  await page.setViewport({ width: 300, height: 200, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}`);
  await page.waitForSelector('input');
  return page;
};

const run = async (page: Page, cmd: string) => {
  await page.keyboard.type(`:${cmd}`);
  await page.keyboard.press('Enter');
};

describe('Font sync between VVset fontfamily and &guifont', () => {
  jest.setTimeout(30000);

  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      slowMo: 10,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    // await browser.close();
  });

  beforeEach(async () => {
    page = await setup(browser);
  });

  afterEach(async () => {
    await page.close();
  });

  test('VVset fontfamily renders with the requested font', async () => {
    await run(page, 'VVset fontfamily=Monaco');
    await run(page, 'VVset fontsize=14');
    await page.keyboard.type('iHello Monaco');
    await page.keyboard.press('Escape');
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  test('set guifont=<family> syncs to VV fontfamily', async () => {
    await run(page, 'set guifont=Menlo');
    await run(page, 'VVset fontsize=14');
    await page.keyboard.type('iguifont Menlo');
    await page.keyboard.press('Escape');
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  test('set guifont=<family>:h<size> syncs both family and size', async () => {
    await run(page, 'set guifont=Courier\\ New:h16');
    await page.keyboard.type('iCourier h16');
    await page.keyboard.press('Escape');
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  test('VVset fontfamily updates &guifont (reverse sync)', async () => {
    await run(page, 'VVset fontfamily=Monaco');
    await run(page, 'VVset fontsize=15');
    // `:set guifont?` echoes the value to the command line, which the
    // screenshot captures.
    await run(page, 'set guifont?');
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });
});
