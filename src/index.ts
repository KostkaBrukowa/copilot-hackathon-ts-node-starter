// src/index.ts
import express, { Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { AnyZodObject, z } from 'zod';
import bodyParser from 'body-parser';

// UTILS
const validate =
  (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
      });
      return next();
    } catch (error) {
      return res.status(400).json(error);
    }
  };
///

const currencySchema = z.object({
  currency: z.string(),
  price_pln: z.string(),
  date: z.string(),
});

type Currency = z.infer<typeof currencySchema>;

const currencyDatabase: { currencies: Currency[] } = {
  currencies: [],
};

dotenv.config();
const app: Express = express();

app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.get('/health-check', (req: Request, res: Response) => {
  res.send('health check OK');
});

const postCurrencySchema = z.object({
  body: z.object({
    currencies: z.array(currencySchema),
  }),
});

type PostCurrencyBody = z.infer<typeof postCurrencySchema>['body'];

function addCurrencyToDatabase(currency: Currency) {
  const currencyInDatabaseIndex = currencyDatabase.currencies.findIndex(
    (currencyInDatabase) =>
      currencyInDatabase.currency === currency.currency &&
      currencyInDatabase.date === currency.date,
  );

  if (currencyInDatabaseIndex < 0) {
    currencyDatabase.currencies.push(currency);

    return;
  }

  currencyDatabase.currencies[currencyInDatabaseIndex] = currency;
}

// POST /currency
app.post(
  '/currency',
  validate(postCurrencySchema),
  (req: Request<{}, any, PostCurrencyBody>, res: Response) => {
    const currencies = req.body.currencies;

    currencies.forEach(addCurrencyToDatabase);

    res.status(201).json(currencyDatabase);
  },
);

// GET /currency
app.get('/currency', (req: Request, res: Response) => {
  res.json(currencyDatabase);
});

const postCurrencyExchangeSchema = z.object({
  body: z.object({
    from_currency: z.string(),
    to_currency: z.string(),
    amount: z.number(),
    date: z.string(),
  }),
});

type PostCurrencyExchangeBody = z.infer<typeof postCurrencyExchangeSchema>['body'];

function convertOtherCurrencyToPLN(otherCurrency: string, amount: number, date: string) {
  const otherCurrencyInDatabase = currencyDatabase.currencies.find(
    (databaseCurrency) =>
      databaseCurrency.currency === otherCurrency && databaseCurrency.date === date,
  );

  if (!otherCurrencyInDatabase) {
    throw new Error(`No data for to_currency ${otherCurrency} in database for given date: ${date}`);
  }

  return Number(otherCurrencyInDatabase.price_pln) * amount;
}

function convertPLNToOtherCurrency(otherCurrency: string, amount: number, date: string) {
  const otherCurrencyInDatabase = currencyDatabase.currencies.find(
    (databaseCurrency) =>
      databaseCurrency.currency === otherCurrency && databaseCurrency.date === date,
  );

  if (!otherCurrencyInDatabase) {
    throw new Error(`No data for to_currency ${otherCurrency} in database for given date: ${date}`);
  }

  return amount / Number(otherCurrencyInDatabase.price_pln);
}

function convertTwoDifferentCurrencies(
  currencyFrom: string,
  currencyTo: string,
  amount: number,
  date: string,
) {
  const currencyFromInPLN = convertOtherCurrencyToPLN(currencyFrom, amount, date);

  return convertPLNToOtherCurrency(currencyTo, currencyFromInPLN, date);
}

// POST /currencyExchange
app.post(
  '/currencyExchange',
  validate(postCurrencyExchangeSchema),
  (
    req: Request<
      {},
      {
        currency: string;
        value: number;
        date: string;
      },
      PostCurrencyExchangeBody
    >,
    res: Response,
  ) => {
    const { amount, date, from_currency, to_currency } = req.body;
    let result = null;
    if (from_currency === 'PLN' && to_currency !== 'PLN') {
      result = convertPLNToOtherCurrency(to_currency, amount, date);
    } else if (from_currency !== 'PLN' && to_currency === 'PLN') {
      result = convertOtherCurrencyToPLN(from_currency, amount, date);
    } else if (from_currency !== 'PLN' && to_currency !== 'PLN') {
      result = convertTwoDifferentCurrencies(from_currency, to_currency, amount, date);
    } else {
      result = amount;
    }

    res.status(200).json({
      currency: to_currency,
      value: result,
      date: date,
    });
  },
);

// todo add return types

/* Start the Express app and listen
 for incoming requests on the specified port */
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export { app };
