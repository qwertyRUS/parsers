import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { logger } from '../../logger.js';
import MaintanenceModel from '../models/MaintanenceModel.js';

const getProxyAgent = () => {
  const { PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_PASS } = process.env;
  if (PROXY_HOST && PROXY_PORT && PROXY_USER && PROXY_PASS) {
    const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
    logger.info('🔄 Using proxy for 2captcha requests.');
    return new HttpsProxyAgent(proxyUrl);
  }
  logger.info('ℹ️ No proxy configured for 2captcha requests.');
  return undefined;
};

const reportIncorrectSolution = async taskId => {
  const { API_KEY } = process.env;
  if (!API_KEY) throw new Error('API_KEY отсутствует в .env');
  try {
    logger.warn(`🚩 Сообщение о неверном решении для задачи: ${taskId}`);
    await axios.post(
      'https://api.2captcha.com/reportBad',
      {
        clientKey: API_KEY,
        taskId
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
        httpsAgent: getProxyAgent()
      }
    );
    await MaintanenceModel.findOneAndUpdate(
      { taskID: taskId },
      {
        status: 'reported_bad',
        note: 'Решение не подошло, отправлен репорт.'
      }
    );
  } catch (error) {
    logger.error(
      `⛔ Ошибка при отправке репорта о неверном решении для ${taskId}: ${error.message}`
    );
  }
};
const getResult = async taskId => {
  const { API_KEY } = process.env;
  if (!API_KEY) throw new Error('API_KEY отсутствует в .env');
  while (true) {
    try {
      const response = await axios.post(
        'https://api.2captcha.com/getTaskResult',
        {
          clientKey: API_KEY,
          taskId
        },
        {
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' },
          httpsAgent: getProxyAgent()
        }
      );
      const data = response.data;

      if (data.errorId !== 0) {
        const errorMessage = `2captcha.getTaskResult error: ${data.errorDescription}`;
        await MaintanenceModel.findOneAndUpdate(
          { taskID: taskId },
          {
            status: 'error',
            note: errorMessage
          }
        );
        throw new Error(errorMessage);
      }

      if (data.status === 'ready') {
        logger.info(`🤩Solved captcha: ${data.solution.text}`);
        await MaintanenceModel.findOneAndUpdate(
          { taskID: taskId },
          {
            status: data.status,
            solution: data.solution.text,
            cost: data.cost,
            solveCount: data.solveCount
          }
        );
        return data.solution.text;
      }
    } catch (error) {
      if (!error.message.startsWith('2captcha.getTaskResult error:')) {
        await MaintanenceModel.findOneAndUpdate(
          { taskID: taskId },
          {
            status: 'error',
            note: `Error polling result: ${error.message}`
          }
        ).catch(dbError =>
          logger.error(`Failed to update maintenance log on polling error: ${dbError.message}`)
        );
      }
      logger.error(`Error in getResult for taskId ${taskId}: ${error.message}`);
      throw error; 
    }
    await new Promise(r => setTimeout(r, 5000));
  }
};

const createTask = async base64Image => {
  const { API_KEY } = process.env;
  if (!API_KEY) throw new Error('API_KEY отсутствует в .env');
  const now = dayjs().format('DD-MM-YY_HH-mm');
  const outputDir = 'failed_captchas';
  const fileName = `captcha-${now}.txt`;
  const filePath = path.join(outputDir, fileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(filePath, base64Image);
  logger.info(`📄 base64 сохранено в: ${filePath} (${base64Image.length} bytes)`);

  const payload = {
    clientKey: API_KEY,
    task: {
      type: 'ImageToTextTask',
      body: base64Image,
      numeric: 2
    },
    languagePool: 'rn'
  };

  try {
    logger.info('Отправка запроса на 2captcha...');
    const response = await axios.post('https://api.2captcha.com/createTask', payload, {
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
      httpsAgent: getProxyAgent()
    });

    const data = response.data;

    if (data.errorId !== 0) {
      const errorMessage = `❌ Ошибка 2captcha: ${data.errorDescription}`;
      await MaintanenceModel.create({
        fileName,
        status: 'error',
        note: errorMessage
      });
      throw new Error(errorMessage);
    }

    logger.info(`✅ Задача создана, ID: ${data.taskId}`);
    await MaintanenceModel.create({
      taskID: data.taskId,
      fileName,
      status: 'processing'
    });
    return { taskId: data.taskId, filePath };
  } catch (error) {
    const errData = error.response?.data || error.message;
    logger.error(`⛔ Ошибка при обращении к 2captcha: ${JSON.stringify(errData)}`);

    if (!error.message.startsWith('❌ Ошибка 2captcha:')) {
      await MaintanenceModel.create({
        fileName,
        status: 'error',
        note: `Error creating task: ${JSON.stringify(errData)}`
      }).catch(dbError =>
        logger.error(`Failed to create maintenance log on creation error: ${dbError.message}`)
      );
    }

    throw new Error('Не удалось создать задачу в 2captcha');
  }
};

const deleteCaptchaFile = async filePath => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑️  Файл капчи удален: ${filePath}`);
    }
  } catch (error) {
    logger.error(`⛔ Не удалось удалить файл капчи ${filePath}: ${error.message}`);
  }
};

export { createTask, getResult, deleteCaptchaFile, reportIncorrectSolution };
