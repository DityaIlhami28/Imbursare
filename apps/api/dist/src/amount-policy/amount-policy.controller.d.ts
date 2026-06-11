import { AmountPolicyService } from './amount-policy.service';
export declare class AmountPolicyController {
    private readonly amountPolicyService;
    constructor(amountPolicyService: AmountPolicyService);
    getAmountPolicies(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        level: number;
        maxAmount: number;
        totalTransactions: number;
    }[]>;
    addAmountPolicy(req: any, amountPolicyData: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        level: number;
        maxAmount: number;
        totalTransactions: number;
    }>;
}
