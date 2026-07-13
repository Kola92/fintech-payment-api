import type { Webhook, WebhookDelivery, WebhookEvent } from '../types/index';
export interface RegisterWebhookInput {
    url: string;
    events: WebhookEvent[];
}
export declare function registerWebhook(input: RegisterWebhookInput): Promise<Webhook>;
export declare function listWebhooks(): Promise<Webhook[]>;
export declare function getWebhookById(id: string): Promise<Webhook | null>;
export declare function deleteWebhook(id: string): Promise<boolean>;
export declare function getDeliveriesForPayment(paymentId: string): Promise<WebhookDelivery[]>;
export declare function getDeliveryById(id: string): Promise<WebhookDelivery | null>;
//# sourceMappingURL=webhook.service.d.ts.map