import puppeteer, { Browser, Page } from 'puppeteer';
import { PORT } from 'config/jest/testServer';

describe('Screen', () => {
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
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();

    await page.setViewport({
      width: 300,
      height: 200,
      deviceScaleFactor: 2,
    });

    await page.goto(`http://localhost:${PORT}`);
    await page.waitForSelector('input');
  });

  afterEach(async () => {
    await page.close();
  });

  it('match snapshot', async () => {
    await page.keyboard.type('iHello');
    await page.keyboard.press('Escape');

    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  it('redraw screen on default_colors_set', async () => {
    await page.keyboard.type(':colorscheme desert');
    await page.keyboard.press('Enter');

    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  describe('undercurl', () => {
    test('show undercurl behind the text', async () => {
      await page.keyboard.type(':set filetype=javascript');
      await page.keyboard.press('Enter');
      await page.keyboard.type(':VVset lineheight=1');
      await page.keyboard.press('Enter');
      await page.keyboard.type(':syntax on');
      await page.keyboard.press('Enter');
      await page.keyboard.type(':hi Comment gui=undercurl guifg=white guisp=red');
      await page.keyboard.press('Enter');
      await page.keyboard.type('i// Hey!');

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });
  });
});
