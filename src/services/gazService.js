import puppeteer from 'puppeteer';
import ParserModel from '../models/GazModel.js';
import { GAZ_CHARGES_PATH, GAZ_URL, HEADLESS_MODE } from '../config/constants.js';
import GazRefDTO from '../dtos/gaz-dto.js';

export const gazService = async () => {
  const { GAZ_LOGIN, GAZ_PASSWORD } = process.env;

  if (!GAZ_URL || !GAZ_LOGIN || !GAZ_PASSWORD) {
    throw new Error('GAZ_URL, GAZ_LOGIN, and GAZ_PASSWORD must be set in .env file');
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE === 'false' ? false : 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: {
        width: 1280,
        height: 1024
      }
    });

    const page = await browser.newPage();

    await page.goto(GAZ_URL, { waitUntil: 'networkidle2' });

    const loginSelector = 'input[placeholder="E-mail или телефон"]';
    const passwordSelector = 'input[type="password"]';
    const submitButtonSelector = 'button[type="submit"]';

    await page.waitForSelector(loginSelector, { visible: true });
    await page.waitForSelector(passwordSelector, { visible: true });
    await page.waitForSelector(submitButtonSelector, { visible: true });

    const typeInReactInput = async (selector, text) => {
      await page.evaluate(
        (sel, val) => {
          const element = document.querySelector(sel);
          const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

          if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, val);
          } else {
            valueSetter.call(element, val);
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        },
        selector,
        text
      );
    };

    await typeInReactInput(loginSelector, GAZ_LOGIN);
    await typeInReactInput(passwordSelector, GAZ_PASSWORD);

    await page.evaluate(selector => {
      const button = document.querySelector(selector);
      if (!button) {
        throw new Error(`Button with selector "${selector}" not found for clicking.`);
      }
      button.click();
    }, submitButtonSelector);

    const successSelector = 'div > button > span';
    const errorSelector = 'section[role="alertdialog"]';

    await page.waitForSelector(`${successSelector}, ${errorSelector}`);

    const errorMessage = await page.$(errorSelector);
    if (errorMessage) {
      const errorText = await page.evaluate(el => el.innerText, errorMessage);
      throw new Error(`Login failed. Page says: ${errorText.trim()}`);
    }

    const amountSelector = 'table.w-full tbody tr:first-child td:first-child strong.text-xl';
    const dateSelector = 'table.w-full tbody tr:first-child td:first-child time';

    try {
      await page.waitForSelector(amountSelector, { visible: true, timeout: 20000 });
      await page.waitForSelector(dateSelector, { visible: true, timeout: 20000 });

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      throw new Error(
        'Не удалось найти данные о последнем платеже на главной странице в течение 20 секунд.'
      );
    }

    const lastPaymentData = await page.evaluate(() => {
      const parseNumber = text => {
        if (!text) return null;
        const cleanedText = text
          .replace(/\s/g, '')
          .replace(/,/g, '.')
          .replace(/[^\d.-]/g, '');
        const number = parseFloat(cleanedText);
        return isNaN(number) ? null : number;
      };

      const amountElement = document.querySelector(
        'table.w-full tbody tr:first-child td:first-child strong.text-xl'
      );
      const dateElement = document.querySelector(
        'table.w-full tbody tr:first-child td:first-child time'
      );

      const amountText = amountElement ? amountElement.innerText : null;
      const dateText = dateElement ? dateElement.innerText : null;

      return {
        ОплатаПоступившая: parseNumber(amountText),
        ДатаПлатежа: dateText
      };
    });

    if (lastPaymentData.ОплатаПоступившая === null || !lastPaymentData.ДатаПлатежа) {
      throw new Error(
        'Не удалось спарсить сумму или дату последнего платежа, хотя элементы были найдены на странице.'
      );
    }

    await page.goto(GAZ_CHARGES_PATH, { waitUntil: 'networkidle2' });

    const chargesHeaderSelector = 'h1.text-2xl.font-semibold';
    await page.waitForSelector(chargesHeaderSelector, { visible: true });

    const chargesData = await page.evaluate(() => {
      const parseNumber = text => {
        if (!text) return null;
        const cleanedText = text
          .replace(/\s/g, '')
          .replace(/,/g, '.')
          .replace(/[^\d.-]/g, '');
        const number = parseFloat(cleanedText);
        return isNaN(number) ? null : number;
      };

      const getValueByLabel = (context, label) => {
        const allDt = Array.from(context.querySelectorAll('dt'));
        const targetDt = allDt.find(dt => dt.innerText.trim() === label);
        return targetDt ? targetDt.nextElementSibling?.innerText.trim() : null;
      };

      const monthHeaders = document.querySelectorAll('h1.text-2xl.font-semibold');
      if (monthHeaders.length < 2) return null;

      const previousMonthHeader = monthHeaders[1];
      const monthName = previousMonthHeader.innerText.trim();
      const monthBlock = previousMonthHeader.nextElementSibling;
      if (!monthBlock) return null;

      const yearDropdown = document.querySelectorAll('div[data-select]')[1];
      const year = yearDropdown
        ? yearDropdown.querySelector('button > span').innerText.trim()
        : new Date().getFullYear().toString();

      const monthMap = {
        январь: '01',
        февраль: '02',
        март: '03',
        апрель: '04',
        май: '05',
        июнь: '06',
        июль: '07',
        август: '08',
        сентябрь: '09',
        октябрь: '10',
        ноябрь: '11',
        декабрь: '12'
      };
      const monthNumber = monthMap[monthName.toLowerCase()];
      const shortYear = year.slice(-2);
      const period = monthNumber ? `${monthNumber}.${shortYear}` : `${monthName} ${year}`;

      return {
        Период: period,
        начислено: parseNumber(getValueByLabel(monthBlock, 'Сумма начисления')),
        Объем: parseNumber(getValueByLabel(monthBlock, 'Объем'))
      };
    });

    if (!chargesData) return null;

    const finalData = { ...lastPaymentData, ...chargesData };

    const savedResult = await ParserModel.findOneAndUpdate(
      { Период: finalData.Период },
      { $set: finalData },
      { new: true, upsert: true, runValidators: true }
    );

    const GazDTO = new GazRefDTO(savedResult);
    return GazDTO;
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export const getAvailableGazPeriods = async () => {
  const periods = await ParserModel.find().distinct('Период');
  return periods
    .sort((a, b) => {
      const [monthA, yearA] = a.split('.').map(Number);
      const [monthB, yearB] = b.split('.').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    })
    .slice(0, 10);
};

export const getGazDataByPeriod = async period => {
  return ParserModel.findOne({ Период: period }).lean();
};
