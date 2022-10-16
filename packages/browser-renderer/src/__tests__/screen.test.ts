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

  test('overlap chars', async () => {
    await page.keyboard.type(':VVset letterspacing=-8');
    await page.keyboard.press('Enter');
    await page.keyboard.type(
      'i\n\n\nO   O  O O O O O O O O O OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    );
    await page.keyboard.press('Escape');

    await page.keyboard.type('hhhi ');
    await page.keyboard.press('Escape');
    await page.keyboard.type('hhh');
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();

    await page.keyboard.type(':vs');
    await page.keyboard.press('Enter');
    await page.keyboard.type(':vs');
    await page.keyboard.press('Enter');
    await page.keyboard.type('i');
    await page.keyboard.press('Escape');

    await page.mouse.move(150, 100);
    await page.mouse.wheel({ deltaY: 100 });

    const image1 = await page.screenshot();
    expect(image1).toMatchImageSnapshot();
  });
});
