import { ExchangeRatePoint } from '../../Models/exchangeRate';
import { IExchangeRateProvider } from '../../Application/interfaces/exchangeRateProvider';

interface HnbIndicadorItem {
  Fecha: string;
  Valor: number;
}

const LOOKBACK_DAYS = 5;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class HnbExchangeRateProvider implements IExchangeRateProvider {
  constructor(
    private readonly serviceUrl: string,
    private readonly apiToken: string
  ) {}

  async fetchExchangeRate(from: Date, to: Date): Promise<ExchangeRatePoint[]> {
    const fechaInicio = new Date(from);
    fechaInicio.setUTCDate(fechaInicio.getUTCDate() - LOOKBACK_DAYS);
    const fechaFinal = new Date(to);
    fechaFinal.setUTCDate(fechaFinal.getUTCDate() + LOOKBACK_DAYS);

    const requestUrl = new URL(this.serviceUrl);
    requestUrl.searchParams.set('formato', 'Json');
    requestUrl.searchParams.set('fechaInicio', formatDate(fechaInicio));
    requestUrl.searchParams.set('fechaFinal', formatDate(fechaFinal));

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'clave': this.apiToken
      }
    });

    if (!response.ok) {
      throw new Error(`HNB service returned ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as HnbIndicadorItem[];

    const points = payload
      .map((item) => {
        const rate = Number(item.Valor);
        if (!Number.isFinite(rate)) {
          throw new Error(`Invalid HNB exchange rate value for date ${item.Fecha}.`);
        }

        return {
          date: new Date(`${item.Fecha.slice(0, 10)}T00:00:00.000Z`),
          rate
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (points.length === 0) {
      return [];
    }

    const today = points.find((point) => formatDate(point.date) === formatDate(to));
    const selected = today ?? points[points.length - 1];
    const isStale = formatDate(selected.date) !== formatDate(to);

    return [{ ...selected, isStale }];
  }
}
