import { ExchangeRatePoint } from '../../Models/exchangeRate';
import { IExchangeRateProvider } from '../../Application/interfaces/exchangeRateProvider';

interface MexDataItem {
  fecha: string;
  dato: string;
}

interface MexSeriesItem {
  datos?: MexDataItem[];
}

interface MexExchangeRateResponse {
  bmx?: {
    series?: MexSeriesItem[];
  };
}

function parseDate(value: string): Date {
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid MEX exchange rate date: ${value}.`);
  }

  return date;
}

export class MexExchangeRateProvider implements IExchangeRateProvider {
  constructor(
    private readonly serviceUrl: string,
    private readonly apiToken?: string
  ) {}

  async fetchExchangeRate(_from: Date, _to: Date): Promise<ExchangeRatePoint[]> {
    const requestUrl = new URL(this.serviceUrl);
    if (this.apiToken) {
      requestUrl.searchParams.set('token', this.apiToken);
    }

    const response = await fetch(requestUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`MEX service returned ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as MexExchangeRateResponse;
    return (payload.bmx?.series ?? []).flatMap((series) => series.datos ?? []).map((item) => {
      const rate = Number(item.dato);
      if (!Number.isFinite(rate)) {
        throw new Error(`Invalid MEX exchange rate value for date ${item.fecha}.`);
      }

      return { date: parseDate(item.fecha), rate };
    });
  }
}