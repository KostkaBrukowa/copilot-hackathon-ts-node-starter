const request = require('supertest');
const { app } = require('./index.ts');

describe('tests', () => {
  it('should return empty currencies', async () => {
    const response = await request(app)
      .get('/currency')
      .set('content-type', 'application/json')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.currencies).toEqual([]);
  });

  it('should add currencies to database and return it', async () => {
    const response = await request(app)
      .post('/currency')
      .set('content-type', 'application/json')
      .send({
        currencies: [
          {
            currency: 'EUR',
            price_pln: '4.31',
            date: '2023-01-01',
          },
          {
            currency: 'USD',
            price_pln: '3.98',
            date: '2023-01-01',
          },
        ],
      });

    expect(response.status).toBe(201);

    const result = await request(app)
      .get('/currency')
      .set('content-type', 'application/json')
      .send();

    expect(result.status).toBe(200);
    expect(result.body.currencies).toMatchInlineSnapshot(`
[
  {
    "currency": "EUR",
    "date": "2023-01-01",
    "price_pln": "4.31",
  },
  {
    "currency": "USD",
    "date": "2023-01-01",
    "price_pln": "3.98",
  },
]
`);
  });

  describe('currency exchange', () => {
    beforeEach(async () => {
      await request(app)
        .post('/currency')
        .set('content-type', 'application/json')
        .send({
          currencies: [
            {
              currency: 'EUR',
              price_pln: '4.31',
              date: '2023-01-01',
            },
            {
              currency: 'USD',
              price_pln: '3.98',
              date: '2023-01-01',
            },
          ],
        });
    });

    it('should return correct exchange rates EUR -> PLN', async () => {
      const exchangeRate = await request(app)
        .post('/currencyExchange')
        .set('content-type', 'application/json')
        .send({
          from_currency: 'EUR',
          to_currency: 'PLN',
          amount: 123.33,
          date: '2023-01-01',
        });

      expect(exchangeRate.body).toEqual({
        currency: 'PLN',
        value: 531.5523,
        date: '2023-01-01',
      });
    });

    it('should return correct exchange rates PLN -> EUR', async () => {
      const exchangeRate = await request(app)
        .post('/currencyExchange')
        .set('content-type', 'application/json')
        .send({
          from_currency: 'PLN',
          to_currency: 'EUR',
          amount: 123.33,
          date: '2023-01-01',
        });

      expect(exchangeRate.body).toEqual({
        currency: 'EUR',
        value: 28.614849187935036,
        date: '2023-01-01',
      });
    });

    it('should return correct exchange rates USD -> EUR', async () => {
      const exchangeRate = await request(app)
        .post('/currencyExchange')
        .set('content-type', 'application/json')
        .send({
          from_currency: 'USD',
          to_currency: 'EUR',
          amount: 100,
          date: '2023-01-01',
        });

      expect(exchangeRate.body).toEqual({
        currency: 'EUR',
        value: 92.34338747099768,
        date: '2023-01-01',
      });
    });
  });
});
