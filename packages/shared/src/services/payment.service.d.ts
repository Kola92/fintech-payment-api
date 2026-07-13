import type { Payment } from '../types/index';
export interface CreatePaymentInput {
    idempotency_key: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, unknown>;
}
export declare function createPayment(input: CreatePaymentInput): Promise<Payment>;
export declare function getPaymentById(id: string): Promise<Payment | null>;
export declare function listPayments(options: {
    limit?: number;
    offset?: number;
    status?: string;
}): Promise<{
    payments: Payment[];
    total: number;
}>;
//# sourceMappingURL=payment.service.d.ts.map