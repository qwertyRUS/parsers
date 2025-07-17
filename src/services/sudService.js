import puppeteer from 'puppeteer';
import dayjs from 'dayjs';
import { createTask, getResult, deleteCaptchaFile } from './captchaSolverService.js';
import { logger } from '../../logger.js';
import ParserModel from '../models/SudModel.js';
import { HEADLESS_MODE, SUD_URL } from '../config/constants.js';

const checkFor503AndReload = async (page, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const state503Selector = 'div.state h2';
    const element = await page.$(state503Selector);
    if (element) {
      const text = await page.evaluate(el => el.textContent, element);
      if (text && text.trim() === '503') {
        await page.reload({ waitUntil: 'networkidle2', timeout: 50000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
    return;
  }
  throw new Error(`Не удалось обойти страницу 503 после ${maxRetries} попыток.`);
};

export const sudService = async () => {
  const { SEARCH_NAME } = process.env;
  const yesterday = dayjs().subtract(1, 'day').format('DD.MM.YYYY');
  const sixMonthsAgo = dayjs().subtract(6, 'months').format('DD.MM.YYYY');
  const encodedSearchName = encodeURIComponent(SEARCH_NAME);
  const sud_address = `https://nchr7.ros.msudrf.ru/modules.php?name=sud_delo&g1_case__RESULT_DATE1D=${sixMonthsAgo}&g1_case__RESULT_DATE2D=${yesterday}&G1_PARTS__NAMESS=${encodedSearchName}&delo_id=1540005&op=sf`;

  if (!SUD_URL) throw new Error('Переменная SUD_URL должна быть указана в .env файле');
  if (!SEARCH_NAME) throw new Error('Переменная SEARCH_NAME должна быть указана в .env файле');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE === 'false' ? false : 'new',
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-web-security'
      ],
      defaultViewport: {
        width: 1280,
        height: 1024
      }
    });

    const page = await browser.newPage();

    await page.goto(sud_address, { waitUntil: 'networkidle2', timeout: 40000 });
    const captchaImageSelector = 'img[src="/captcha.php"]';
    await page.waitForSelector(captchaImageSelector, { visible: true });
    const captchaElement = await page.$(captchaImageSelector);

    // Получаем изображение капчи в формате base64
    const captchaImageBase64 = await captchaElement.screenshot({ encoding: 'base64' });

    // Отправляем на распознавание
    const { taskId, filePath } = await createTask(captchaImageBase64);
    const captchaText = await getResult(taskId);
    // Вводим распознанный текст в поле
    const captchaInputSelector = 'input[name="captcha-response"]';
    await page.type(captchaInputSelector, captchaText, { delay: 200 });

    // Нажимаем кнопку "Продолжить"
    const submitButtonSelector = 'form#kcaptchaForm button[type="submit"]';
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }),
      page.click(submitButtonSelector)
    ]);

    // Проверяем, не остались ли мы на странице с капчей (признак ошибки)
    const captchaElementAfterSubmit = await page.$(captchaImageSelector);
    if (captchaElementAfterSubmit)
      throw new Error(
        'Не удалось пройти CAPTCHA. Либо код распознан неверно, либо сайт выдал ошибку'
      );

    await deleteCaptchaFile(filePath);
    await checkFor503AndReload(page);

    await page.waitForSelector('table#tablcont', { visible: true, timeout: 40000 });

    // --- Этап 6: Парсинг и сохранение результатов ---
    logger.info('Начинаю этап 6: Парсинг и сохранение результатов...');
    const scrapingResult = await page.evaluate(() => {
      const noResultsElement = document.querySelector('#search_results > p');
      if (
        noResultsElement &&
        noResultsElement.innerText.includes('По вашему запросу ничего не найдено')
      ) {
        return { data: [] };
      }

      const table = document.querySelector('table#tablcont');
      if (!table) {
        return { data: null };
      }

      const rows = Array.from(table.querySelectorAll('tbody > tr'));

      const data = rows.map(row => {
        const getCellText = index => {
          const cell = row.querySelector(`td:nth-child(${index})`);
          return cell ? cell.innerText.trim() : '';
        };

        return {
          НомерДела: (row.querySelector('td:nth-child(1) a') || {}).innerText?.trim() || '',
          ДатаПоступления: getCellText(2),
          ИнформацияПоДелу: getCellText(3),
          Судья: getCellText(4),
          ДатаРешения: getCellText(5),
          Решение: getCellText(6)
        };
      });
      return { data };
    });

    const { data: scrapedData } = scrapingResult;

    logger.info('Проверяю результаты парсинга...');
    if (scrapedData === null) {
      throw new Error('Таблица с результатами поиска не найдена на странице.');
    }

    if (scrapedData.length === 0) {
      logger.info('ℹ️ По вашему запросу ничего не найдено.');
      return { status: 'success', message: 'Поиск выполнен, но дел не найдено.' };
    }

    logger.info(`Найдено ${scrapedData.length} дел. Сохранение в БД...`);

    const bulkOps = scrapedData.map(item => ({
      updateOne: {
        filter: { НомерДела: item.НомерДела },
        update: { $set: item },
        upsert: true
      }
    }));

    const result = await ParserModel.bulkWrite(bulkOps);
    logger.info(
      `💾 Результаты сохранены: ${result.upsertedCount} новых, ${result.modifiedCount} обновленных.`
    );

    return {
      status: 'success',
      message: `Поиск выполнен. Найдено и сохранено ${scrapedData.length} дел.`
    };
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Браузер закрыт.');
    }
  }
};
