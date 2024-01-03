import { QuotesProvider } from './quotes-provider';
import { Requester } from './requester';
import { UDFCompatibleDatafeedBase } from './udf-compatible-datafeed-base';
export class UDFCompatibleDatafeed extends UDFCompatibleDatafeedBase {
  constructor(datafeedURL, updateFrequency = 10 * 1000, limitedServerResponse) {
    const requester = new Requester();
    const quotesProvider = new QuotesProvider(datafeedURL, requester);
    super(datafeedURL, quotesProvider, requester, updateFrequency, limitedServerResponse);
  }
}
