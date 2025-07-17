import puppeteer from 'puppeteer';
import ElektroModel from '../models/ElektroModel.js';

export const elektroService = async () => {
  const { ELEKTRO, ELEKTROlogin, ELEKTROPWD, HEADLESS_MODE } = process.env;

  if (!ELEKTRO || !ELEKTROlogin || !ELEKTROPWD)
    throw new Error('ELEKTRO, ELEKTROlogin, and ELEKTROPWD must be set in .env file');

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE === 'false' ? false : 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 1024 }
    });

    const page = await browser.newPage();
    await page.goto(ELEKTRO, { waitUntil: 'networkidle2' });

    const accountNumberSelector = '#user_name_id';
    const continueButtonSelector = 'input[type="submit"]';

    await page.waitForSelector(accountNumberSelector, { visible: true });
    await page.type(accountNumberSelector, ELEKTROlogin);
    await page.click(continueButtonSelector);

    const addressConfirmSelector = '.address-ok';
    await page.waitForSelector(addressConfirmSelector, { visible: true });
    await page.click(addressConfirmSelector);

    const passwordSelector = 'input[type="password"]';
    const loginButtonSelector = 'input[type="submit"]';

    await page.waitForSelector(passwordSelector, { visible: true, timeout: 60000 });
    await page.type(passwordSelector, ELEKTROPWD);
    await page.click(loginButtonSelector);

    const successSelector = 'xpath///h4[normalize-space() = "Ваш баланс"]';

    await page.waitForSelector(successSelector, { timeout: 60000 });

    const accrualsLinkSelector = 'a[href*="period-pay"]';

    await page.waitForSelector(accrualsLinkSelector, { visible: true });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click(accrualsLinkSelector)
    ]);

    if (!page.url().includes('period-pay')) {
      throw new Error(
        `Failed to navigate to accruals page by clicking a link. Current URL: ${page.url()}`
      );
    }

    const tableSelector = '.period_pay_table';
    await page.waitForSelector(tableSelector, { visible: true });

    const accrualsData = await page.evaluate(() => {
      const parseNumber = text => {
        if (!text || text.trim() === '—') {
          return null;
        }
        const cleanedText = text.replace(/,/g, '.').replace(/[^\d.-]/g, '');
        const number = parseFloat(cleanedText);
        return isNaN(number) ? null : number;
      };

      const getCleanText = element => {
        if (!element) return null;
        const text = element.innerText.trim();
        if (text === '—' || text === '') return null;
        return text.split('\n')[0].trim();
      };
      const table = document.querySelector('.period_pay_table');
      if (!table) return null;

      const allDataRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => {
        const firstCell = row.querySelector('td');
        return firstCell && firstCell.innerText.trim() !== 'Итого';
      });

      if (allDataRows.length < 2) {
        return null;
      }
      const previousMonthRow = allDataRows[allDataRows.length - 2];

      if (!previousMonthRow) return null;

      return {
        Период: getCleanText(previousMonthRow.querySelector('td:nth-child(1)')),
        начислено: parseNumber(getCleanText(previousMonthRow.querySelector('.accruals-col'))),
        СуммаПлатежа: getCleanText(previousMonthRow.querySelector('.payments-col')),
        ДатаПлатежа: getCleanText(previousMonthRow.querySelector('.payments-date-col')),
        Долг: parseNumber(getCleanText(previousMonthRow.querySelector('.outgoing-balance-col')))
      };
    });
    if (!accrualsData || accrualsData.начислено === null) {
      return null;
    }

    const historyLinkSelector = 'a[href="/history-counter/"]';
    await page.waitForSelector(historyLinkSelector, { visible: true });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click(historyLinkSelector)
    ]);
    const historyTableSelector = '.sch_table.tns_table_light';
    await page.waitForSelector(historyTableSelector, { visible: true, timeout: 30000 });

    const readingsData = await page.evaluate(targetPeriod => {
      const historyTable = document.querySelector('.sch_table.tns_table_light');
      if (!historyTable) {
        return { Показание: 'Таблица истории показаний не найдена' };
      }

      const rows = Array.from(historyTable.querySelectorAll('tbody tr'));

      for (const row of rows) {
        const dateCell = row.querySelector('td:nth-child(4)');
        const readingCell = row.querySelector('td:nth-child(2)');

        if (dateCell && readingCell) {
          const dateText = dateCell.innerText.trim();
          const dateParts = dateText.split('.');

          if (dateParts.length === 3) {
            const month = dateParts[1];
            const year = `20${dateParts[2]}`;
            const rowPeriod = `${month}.${year}`;

            if (rowPeriod === targetPeriod) {
              return { Показание: readingCell.innerText.trim() };
            }
          }
        }
      }

      return { Показание: null };
    }, accrualsData.Период);
    const scrapedData = { ...accrualsData, ...readingsData };

    const savedResult = await ElektroModel.findOneAndUpdate(
      { Период: scrapedData.Период },
      { $set: scrapedData },
      { new: true, upsert: true, runValidators: true }
    );
    return savedResult;
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export const getAvailableElektroPeriods = async () => {
  const periods = await ElektroModel.find().distinct('Период');
  return periods
    .sort((a, b) => {
      const [monthA, yearA] = a.split('.').map(Number);
      const [monthB, yearB] = b.split('.').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    })
    .slice(0, 10);
};

export const getElektroDataByPeriod = async period => {
  return ElektroModel.findOne({ Период: period }).lean();
};
