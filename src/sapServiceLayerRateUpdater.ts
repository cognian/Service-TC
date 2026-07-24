import { IExchangeRateUpdater } from './exchangeRateUpdater';

export interface SapServiceLayerConfig {
  signInUrl: string;
  companyDB: string;
  username: string;
  password: string;
  updateUrl: string;
}

function formatRateDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export class SapServiceLayerRateUpdater implements IExchangeRateUpdater {
  constructor(private readonly config: SapServiceLayerConfig) {}

  async updateRate(date: Date, rate: number, currency: string = 'USD'): Promise<void> {
    const signInResponse = await fetch(this.config.signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: this.config.companyDB,
        UserName: this.config.username,
        Password: this.config.password
      })
    });

    if (!signInResponse.ok) {
      throw new Error(
        `SAP sign-in failed: ${signInResponse.status} ${signInResponse.statusText}`
      );
    }

    const setCookieHeaders = signInResponse.headers.getSetCookie();
    if (setCookieHeaders.length === 0) {
      throw new Error('SAP sign-in did not return any cookies.');
    }

    const cookieHeader = setCookieHeaders
      .map((c) => c.split(';')[0])
      .join('; ');

    const updateResponse = await fetch(this.config.updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        Currency: currency,
        Rate: rate.toFixed(8),
        RateDate: formatRateDate(date)
      })
    });

    if (!updateResponse.ok) {
      throw new Error(
        `SAP rate update failed: ${updateResponse.status} ${updateResponse.statusText}`
      );
    }
  }
}
