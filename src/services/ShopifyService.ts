import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

class ShopifyService {
  private app: any;

  public initialize(apiKey: string, host: string) {
    console.log('apiKey', apiKey)
    console.log('host', host)
    if (!this.app) {
      this.app = createApp({
        apiKey,
        host,
      });
      console.log('this.app', this.app)
    }
  }

  public getApp() {
    return this.app;
  }

  public redirect(url: string) {
    if (this.app) {
      Redirect.create(this.app).dispatch(Redirect.Action.REMOTE, url);
    }
  }
}

export default new ShopifyService();
