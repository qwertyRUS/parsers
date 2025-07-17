import puppeteer from 'puppeteer';
import { logger } from '../../logger.js';
import { createTask, getResult, deleteCaptchaFile } from './captchaSolverService.js';
import FsspModel from '../models/fsspModel.js';
import { FSSP_URL, HEADLESS_MODE } from '../config/constants.js';

export const fsspService = async () => {
  const { SEARCH_NAME, BIRTHDAY } = process.env;
  const region = ' Ростовская область';
  if (!FSSP_URL || !SEARCH_NAME || !BIRTHDAY)
    throw new Error('FSSP_URL, SEARCH_NAME, and BIRTHDAY must be set in .env file');

  const search_name = SEARCH_NAME.split(' ');
  if (search_name.length < 2)
    throw new Error('SEARCH_NAME должен содержать как минимум фамилию и имя.');

  logger.info('Запуск парсера ФССП...');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE === 'false' ? false : 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 1024 }
    });

    const page = await browser.newPage();
    logger.info(`Переход на ${FSSP_URL}`);
    await page.goto(FSSP_URL, { waitUntil: 'networkidle2' });

    const individualRadioSelector = 'div.b-form__cell label.b-form__radio';
    logger.info('Ожидание и клик по label "Поиск по физическим лицам"');
    await page.waitForSelector(individualRadioSelector, { visible: true });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.click(individualRadioSelector);

    const lastNameInputSelector = 'input[name="is[last_name]"]';
    const firstNameInputSelector = 'input[name="is[first_name]"]';
    const patronymicInputSelector = 'input[name="is[patronymic]"]';
    const dobInputSelector = 'input[name="is[date]"]';

    await page.waitForSelector(lastNameInputSelector, { visible: true });

    logger.info(`Ввод фамилии: ${search_name[0]}`);
    await page.type(lastNameInputSelector, search_name[0]);

    logger.info(`Ввод имени: ${search_name[1]}`);
    await page.type(firstNameInputSelector, search_name[1]);

    if (search_name.length > 2) {
      logger.info(`Ввод отчества: ${search_name[2]}`);
      await page.type(patronymicInputSelector, search_name[2]);
    }

    logger.info(`Ввод даты рождения: ${BIRTHDAY}`);
    await page.type(dobInputSelector, BIRTHDAY);

    const regionDropdownTriggerSelector = '#region_id_chosen';
    logger.info('Открытие выпадающего списка регионов');
    await page.click(regionDropdownTriggerSelector);
    const regionInputSelector = '#region_id_chosen .chosen-search-input';
    logger.info(`Ввод региона: "${region.trim()}"`);
    await page.type(regionInputSelector, region.trim(), { delay: 150 });
    const regionResultSelector = '#region_id_chosen li.active-result.highlighted';
    logger.info('Ожидание и клик по отфильтрованному региону');
    await page.waitForSelector(regionResultSelector, { visible: true });
    await page.click(regionResultSelector);

    const searchButtonSelector = '#btn-sbm';
    logger.info('Нажимаю кнопку "Найти"');
    await page.waitForSelector(searchButtonSelector, { visible: true });
    await page.click(searchButtonSelector);

    const captchaMaxRetries = 3;
    for (let i = 0; i < captchaMaxRetries; i++) {
      const captchaImageSelector = 'img#capchaVisualImage';
      try {
        logger.info(`Попытка ${i + 1}/${captchaMaxRetries}: Ожидание появления капчи...`);
        await page.waitForSelector(captchaImageSelector, { visible: true, timeout: 15000 });
      } catch (e) {
        logger.info('Капча не появилась. Предполагаем, что результатов нет или они уже загружены.');
        break;
      }

      const captchaImageSrc = await page.$eval(captchaImageSelector, img => img.src);
      const base64Data = captchaImageSrc.replace(/^data:image\/png;base64,/, '');

      const { taskId, filePath } = await createTask(base64Data);
      const captchaText = await getResult(taskId);
      logger.info(`Капча решена: ${captchaText}`);

      const captchaInputSelector = 'input#captcha-popup-code';
      await page.type(captchaInputSelector, captchaText, { delay: 100 });

      const captchaSubmitButtonSelector = 'input#ncapcha-submit';
      await page.click(captchaSubmitButtonSelector);

      await new Promise(resolve => setTimeout(resolve, 4000));

      const isCaptchaStillVisible = await page.$(captchaImageSelector);

      if (!isCaptchaStillVisible) {
        logger.info('✅ Капча пройдена успешно.');
        await deleteCaptchaFile(filePath);
        break;
      }

      if (i === captchaMaxRetries - 1) {
        throw new Error(`Не удалось решить капчу после ${captchaMaxRetries} попыток.`);
      }
      logger.warn('Неверный код капчи, пробую снова...');
      await page.evaluate(
        selector => (document.querySelector(selector).value = ''),
        captchaInputSelector
      );
    }
    logger.info('Начинаю парсинг результатов...');
    const noResultsSelector = '.results-frame .empty';
    const noResultsElement = await page.$(noResultsSelector);
    if (noResultsElement) {
      const noResultsText = await page.evaluate(el => el.innerText, noResultsElement);
      if (noResultsText.includes('По вашему запросу ничего не найдено')) {
        logger.info('ℹ️ По вашему запросу ничего не найдено.');
        return { status: 'success', message: 'Поиск выполнен, но дел не найдено.' };
      }
    }

    const resultsTableSelector = 'table.list';
    await page.waitForSelector(resultsTableSelector, { visible: true, timeout: 10000 });

    const scrapedData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.list tbody tr'));
      return rows.map(row => {
        const getCellText = index => {
          const cell = row.querySelector(`td:nth-child(${index})`);
          return cell ? cell.innerText.replace(/\s\s+/g, ' ').trim() : '';
        };
        return {
          Должник: getCellText(1),
          ПроизводствоНомер: getCellText(2),
          РеквизитыИспДокумента: getCellText(3),
          ДатаПричинаОкИП: getCellText(4),
          СуммаДолга: getCellText(6),
          ОтделСудПрист: getCellText(7),
          Пристав: getCellText(8)
        };
      });
    });

    if (scrapedData.length === 0) {
      logger.info('ℹ️ Таблица найдена, но дел в ней нет.');
      return { status: 'success', message: 'Поиск выполнен, но дел не найдено.' };
    }

    logger.info(`Найдено ${scrapedData.length} исполнительных производств. Сохранение в БД...`);
    const bulkOps = scrapedData.map(item => ({
      updateOne: {
        filter: { ПроизводствоНомер: item.ПроизводствоНомер },
        update: { $set: item },
        upsert: true
      }
    }));
    const result = await FsspModel.bulkWrite(bulkOps);
    logger.info(
      `💾 Результаты сохранены: ${result.upsertedCount} новых, ${result.modifiedCount} обновленных.`
    );

    return {
      status: 'success',
      message: `Поиск выполнен. Найдено и сохранено ${scrapedData.length} дел.`
    };
  } catch (error) {
    logger.error(`Ошибка в fsspService: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Браузер (ФССП) закрыт.');
    }
  }
};
